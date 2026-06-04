# Verdikt — Trustless AI Verdicts on Somnia

> Escrow any deal. If it's disputed, **Somnia's consensus-validated on-chain AI** rules the
> outcome and settles funds automatically — with a **real, auditable execution receipt**.
> No admin, no jurors, no trusted escrow agent.

Built for the **Somnia Agentathon** (Encode Club).

---

## Why it can only exist on Somnia

Most "AI + crypto" apps run the AI **off-chain** and ask you to trust the result. Verdikt puts the
*judgment itself* on-chain: Somnia Agents run a **deterministic LLM** across a validator
subcommittee that reaches **consensus** on the verdict. The decision is trustless and every
ruling links to a genuine Somnia audit receipt.

**Pattern: "Nous proposes, Somnia disposes."**
- **Nous Hermes (off-chain):** drafts a rich, human-readable case brief — *advisory only*.
- **Somnia on-chain AI (consensus):** issues the **binding** verdict and settles escrow.

## Verdict Types

Each type is its **own deployable contract**, all sharing the `AgentArbitrated` base (the Somnia
AI dispute + settlement plumbing). They differ in how funds enter and how the happy path settles:

| Type | Contract | Distinct mechanic |
|---|---|---|
| 🔒 **Escrow** | `VerdictCourt` | Client escrows up front; client confirms delivery to release. |
| 🧾 **Invoice** | `InvoiceVerdict` | **Payee-initiated**: payee issues an invoice, payer funds it later, payer accepts to release. |
| 🎁 **Gift** | `GiftVerdict` | Sender funds a gift; **recipient pull-claims** it. |
| ✉️ **Envelope** | `EnvelopeVerdict` | **Hashlocked**: funds locked by `keccak256(passcode)`; recipient reveals the passcode to open. |

Any party can dispute any type; Somnia's validator subcommittee then rules **RELEASE / REFUND / SPLIT**
by consensus and the contract settles automatically. Each is covered by mock tests
(`npx hardhat test` → 21 passing).

## How it works

```
Client escrows funds ──> Deal (Open)
        │
        ├─ confirmDelivery()  ──────────────> pays provider (happy path)
        │
        └─ dispute() {value: deposit}
                 │  builds inferString(prompt, system, allowedValues=[RELEASE,REFUND,SPLIT])
                 ▼
        Somnia AgentRequester.createRequest()  ──> validator subcommittee (LLM Inference)
                 │  consensus on verdict string
                 ▼
        handleResponse() callback ──> settle escrow + bump reputation + store requestId
                 │
                 ▼
        UI fetches the real receipt at receipts.testnet.agents.somnia.host?requestId=…
```

## Monorepo

| Package | Stack | Purpose |
|---|---|---|
| `contracts/` | Hardhat + Solidity 0.8.24 | `VerdictCourt` escrow + Somnia Agents integration |
| `worker/` | Node + viem + tsx | Nous "Advocate" brief + receipt fetcher (event-driven) |
| `web/` | Next.js 14 + wagmi + Tailwind | Wallet, case flow, real on-chain receipt viewer |

## Somnia integration details (from the docs)

- **Network:** Somnia Testnet — chainId `50312`, RPC `https://api.infra.testnet.somnia.network`, explorer `https://shannon-explorer.somnia.network`, currency **STT**.
- **AgentRequester (platform):** `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776`.
- **Agent:** LLM Inference, invoked via `inferString` with `allowedValues` so the verdict is a fixed enum (robust consensus, trivial on-chain decoding). Default **Majority** consensus.
- **Deposit sizing:** `getRequestDeposit()` (operations reserve floor) `+ 0.07 STT × 3` (LLM Inference per-agent price × default subcommittee size). Surplus is rebated to the contract via `receive()`.
- **Receipts:** fetched per-request from `https://receipts.testnet.agents.somnia.host/agent-receipts?requestId=<id>&contractAddress=<AgentRequester>&type=minimal` — note receipts are indexed under the **AgentRequester** platform address (not the dApp), with steps at `receipts[0].agentReceipt.steps`.

## Run locally

```bash
# Contracts
cd contracts && npm install
cp .env.example .env            # add PRIVATE_KEY + LLM_AGENT_ID
npx hardhat test                # 12 passing

# Worker (after deploy)
cd ../worker && npm install
cp .env.example .env            # add COURT_ADDRESS + NOUS_API_KEY
npm start

# Frontend (after deploy)
cd ../web && npm install
cp .env.local.example .env.local   # add NEXT_PUBLIC_COURT_ADDRESS
npm run dev
```

## Deploy to Somnia testnet (Phase 3)

1. Get an **LLM Inference agent ID** from https://agents.testnet.somnia.network.
2. Fund a deployer wallet with **STT** (https://testnet.somnia.network).
3. Fill `contracts/.env` (`PRIVATE_KEY`, `LLM_AGENT_ID`), then:
   ```bash
   cd contracts
   npm run deploy:somnia
   npx hardhat verify --network somniaTestnet <ADDRESS> <AGENT_REQUESTER> <LLM_AGENT_ID>
   ```
4. Deploy the feature contracts (Invoice / Gift / Envelope):
   ```bash
   npm run deploy:features   # prints an address for each
   ```
5. Put the deployed addresses in `web/.env.local` and `worker/.env`.

## Deployed addresses

| Contract | Network | Address |
|---|---|---|
| VerdictCourt | Somnia Testnet | [`0x67288D6249eA68C05e46B484057Ca705F0f28cc4`](https://shannon-explorer.somnia.network/address/0x67288D6249eA68C05e46B484057Ca705F0f28cc4) |
| InvoiceVerdict | Somnia Testnet | [`0x14000BeeDc9A27653F7B6AEeC1D7EdE2e4F7f1ff`](https://shannon-explorer.somnia.network/address/0x14000BeeDc9A27653F7B6AEeC1D7EdE2e4F7f1ff) |
| GiftVerdict | Somnia Testnet | [`0xcB7fC654E3bCDA90d63409A7ffb5caa1e8f8536c`](https://shannon-explorer.somnia.network/address/0xcB7fC654E3bCDA90d63409A7ffb5caa1e8f8536c) |
| EnvelopeVerdict | Somnia Testnet | [`0xc35542246F3703876Bb9c000e1211C4641E67436`](https://shannon-explorer.somnia.network/address/0xc35542246F3703876Bb9c000e1211C4641E67436) |

### Live end-to-end proof

A real dispute resolved by Somnia's on-chain AI consensus:

- Dispute tx: `0x8f71e699d15d24e43e7c4029cf44e9d9f96eca15c4e52e1bfefa3666457ff89e`
- Somnia agent request: `3481409`
- **Verdict: `Refund`** — the deterministic LLM committee sided with the client (no delivery evidence), and the contract auto-settled the refund.
- Receipt: https://agents.testnet.somnia.network/receipts/3481409

## Demo script (≈3 min)

1. **Hook (20s):** "On other chains the AI runs off-chain and you trust the result. Verdikt puts the *verdict itself* on-chain — decided by Somnia's validator consensus, with a real audit receipt."
2. **Create escrow (30s):** Connect wallet → create a deal with a provider + terms + STT. Funds are now escrowed on-chain.
3. **Happy path (20s):** Show `Confirm Delivery` releasing funds to the provider (no AI needed).
4. **Dispute (60s):** On a second deal, both parties submit evidence → click **Resolve with AI**. The deal enters `Judging` while Somnia's subcommittee runs the deterministic LLM and reaches consensus.
5. **Verdict + receipt (40s):** The callback settles funds automatically; the card shows the verdict and **View on-chain receipt** renders the genuine Somnia execution steps (`llm_request → reasoning → llm_response`).
6. **Close (10s):** "No admin, no jurors — trustless AI arbitration, only possible on Somnia."

## Agentathon compliance checklist

> Confirm against the official rules before submitting.

- [x] Deployed on **Somnia**
- [x] Uses **Somnia Agents** (on-chain LLM Inference + consensus + receipts)
- [x] Public, open-source repo
- [ ] Live demo URL (after deploy)
- [ ] 2–3 min demo video
- [ ] Written submission per the official template

## Security notes

- Deployer/Nous keys live only in `.env*` (gitignored) — never in the client bundle.
- Callback verifies `msg.sender == AgentRequester` and tracks pending requests.
- All agent statuses handled: `Failed`/`TimedOut` refund the client.
- **Escape hatch**: If the platform never delivers `handleResponse` (outage/timeout edge), either party can call `forceSettle(id)` after 24 hours to force a Refund. Cleans up pending request mappings. Both VerdictCourt and the feature contracts expose `JUDGMENT_TIMEOUT`, `judgedAt(id)`, and `forceSettle`.
