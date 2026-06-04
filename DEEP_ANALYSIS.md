# Verdikt Deep Analysis

**Path analyzed:** `C:\Users\msi\Desktop\Verdict` (the "Verdict analyse in deep" target)

**Date of analysis:** Performed via full filesystem exploration, file reads, code searches, test execution, and external receipt verification.

**Project:** Verdikt — Trustless AI Verdicts on Somnia (Somnia Agentathon / Encode Club entry)

---

## 1. Project Structure Overview

Monorepo with three packages (README claims `worker/`, confirmed present):

- `contracts/` — Hardhat + Solidity 0.8.24 (core logic + Somnia Agents integration)
  - `contracts/AgentArbitrated.sol` (abstract base for AI plumbing)
  - `contracts/VerdictCourt.sol` (primary "Escrow" type — **does NOT inherit base**)
  - `contracts/{Invoice,Gift,Envelope}Verdict.sol` (inherit base)
  - `contracts/ISomniaAgents.sol` (platform interfaces)
  - `contracts/mocks/MockAgentRequester.sol` (test double)
  - `scripts/{deploy,deploy-features,check,inspect,live-dispute,genwallet}.ts`
  - `test/{VerdictCourt,Features}.test.ts` (21 tests, all passing)
  - `hardhat.config.ts`, `VerdictCourt.flat.sol`, package.json etc.
  - Build artifacts present (artifacts/, cache/, typechain-types/)

- `web/` — Next.js 14 + wagmi v2 + viem + React Query + Tailwind
  - `app/{layout, page, providers, globals.css}`
  - `components/{Connect, DealCard, FeatureCard, Receipt}.tsx`
  - `lib/{chain, contract, features, templates}.ts`
  - Pre-built `.next/`
  - Configured **exclusively** for OKX Wallet injected provider on Somnia Testnet (50312)
  - Uses deployed addresses from `.env.local`

- `worker/` — Lightweight Node + viem + tsx event watcher (advisory + proof)
  - `src/{index, abi, nous, receipts}.ts`
  - Listens **only to VerdictCourt** for `Disputed` (triggers Nous Hermes brief) + `Resolved` (fetches real receipt steps)
  - Uses OpenAI-compatible Nous Research API (Hermes-4-405B) for off-chain "Advocate" summaries (explicitly **advisory only**)
  - Fetches from `receipts.testnet.agents.somnia.host`

- Root: README.md, .gitignore (standard for builds + .env)

**No root package.json or shared tooling.** Each package manages its own deps (large node_modules in all three).

**Deployed addresses** (Somnia Testnet, from README + .env.local):
- VerdictCourt: `0x67288D6249eA68C05e46B484057Ca705F0f28cc4`
- InvoiceVerdict: `0x14000BeeDc9A27653F7B6AEeC1D7EdE2e4F7f1ff`
- GiftVerdict: `0xcB7fC654E3bCDA90d63409A7ffb5caa1e8f8536c`
- EnvelopeVerdict: `0xc35542246F3703876Bb9c000e1211C4641E67436`
- AgentRequester (platform): `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776` (fixed)
- LLM agent ID: user-supplied (from agents.testnet.somnia.network)

**Live proof in README:** Dispute tx `0x8f71e699d15d24e43e7c4029cf44e9d9f96eca15c4e52e1bfefa3666457ff89e` → agent request 3481409 → **Refund** verdict (verified via receipts).

---

## 2. Core Architecture & Data Flow

### The "Nous proposes, Somnia disposes" pattern
- **Off-chain (advisory):** Worker + Nous Hermes drafts neutral human brief on `Disputed` event.
- **On-chain (binding):** Somnia validator subcommittee runs deterministic LLM via `inferString` with `allowedValues` + `chainOfThought`. Consensus (default Majority, threshold 2/3) produces verdict string. Callback to `handleResponse` settles escrow atomically + emits `Resolved` with `requestId`.

### Verdict Types (4 independent contracts, 3 share base)
| Type     | Contract          | Funding / Happy Path                  | Dispute note                  | Base? |
|----------|-------------------|---------------------------------------|-------------------------------|-------|
| Escrow   | VerdictCourt      | Client escrows; client `confirmDelivery` | Both submit free-text evidence | No (dupe) |
| Invoice  | InvoiceVerdict    | Payee creates; payer `payInvoice` then `accept` | Single `note` on dispute     | Yes  |
| Gift     | GiftVerdict       | Sender `sendGift`; recipient `claim` | Single `note`                  | Yes  |
| Envelope | EnvelopeVerdict   | Sender `seal` (keccak256 passcode); recipient `open(passcode)` | `note` (overwrites initial)   | Yes  |

All support:
- `dispute(id, [note]) payable` (pays `disputeDeposit()` ≈ platform floor + 0.21 STT for 3×0.07 LLM)
- AI can rule RELEASE (pay payee/recipient), REFUND (payer/sender), SPLIT (50/50)
- Reputation counter bumped for "winner" (provider/payee or client/sender)
- `receive()` for platform rebates (over-deposit / gas surplus)

### Shared AI plumbing (AgentArbitrated)
- Immutable `agentRequester`, `llmAgentId`
- `disputeDeposit()` = `getRequestDeposit() + 0.07 ether * 3`
- `_startDispute(id)`: builds `allowedValues`, encodes `ILLMAgent.inferString(payload)`, calls `createRequest{value: deposit}`, links `requestToCase`, calls hook `_onJudging`
- `handleResponse(requestId, responses, status, details)`: **only callable by agentRequester**. Decodes `responses[0].result` (string) via keccak match. Default `Refund` on !Success or empty. Calls `_settle`
- `_settle`: calls `_onResolved`, gets `_parties`, pays per verdict, bumps rep, emits `Resolved`
- Abstract hooks: `_parties`, `_prompt`, `_onJudging`, `_onResolved`
- `requestToCase` mapping (cleaned on callback)
- Enums: State {None,Open,Judging,Resolved}, Verdict {None,Release,Refund,Split}

**VerdictCourt is legacy/standalone:** Full duplicate of ~80% of the logic (own storage, own `dispute`/`handleResponse`/`_buildPrompt`/`_resolve`/`requestToDeal`, own events for DealCreated/Evidence etc.). Does **not** inherit or share code with base. This is the primary contract used in demos, worker, and live proof.

### Somnia Integration Details (verified)
- Chain: 50312, RPC `https://api.infra.testnet.somnia.network`
- `createRequest(agentId, callbackAddr, selector, payload)` payable
- Payload: abi-encoded call to `inferString(prompt, system, true, ["RELEASE","REFUND","SPLIT"])`
- Prompt built from deal terms + evidence/note (see VerdictCourt._buildPrompt and feature _prompt)
- Callback selector: `handleResponse(uint256,Response[],ResponseStatus,Request)`
- Receipts: always fetched under the **AgentRequester** addr (not dApp contract), via `/agent-receipts?requestId=...&contractAddress=0x037B...&type=minimal`
- Full steps visible in receipts (request_received → decoded → handler_started → reasoning (CoT) → llm_response → completed → encoded)
- Verified with live request 3481409: 3 parallel validator runs, all returned "REFUND" after identical reasoning on "no provider evidence + client empty inbox" → contract auto-refunded.

### Worker (event-driven, advisory layer)
- Watches only `COURT_ADDRESS` (VerdictCourt ABI + `getDeal`)
- `Disputed`: fetch deal via getDeal, call Nous `/chat/completions` with system "neutral case analyst... strongest good-faith argument for each side... Do NOT declare a winner", log brief
- `Resolved`: log verdict label, fetch receipt steps, print names (e.g. llm_request -> reasoning -> llm_response)
- Requires NOUS_API_KEY (empty in current .env)
- Not generalized to features (different events/getters/prompt shapes)

### Frontend Flows
- Type switcher (Escrow/Invoice/Gift/Envelope) drives create form + case list (count read + reverse id list)
- Create: for features uses `buildCreate` (handles seal with keccak(passcode)); for court plain `createDeal`
- Cards (DealCard for court, FeatureCard for others):
  - Parse/normalize (court uses `parseTerms` which looks for `[escrow|...]` prefix — court creates do not add it)
  - Show parties (a/b normalized), amount, state, verdict+Receipt on resolved
  - Actions: submitEvidence / happy (confirm/accept/claim/open with passcode for env) / dispute (pays deposit, optional note)
- Receipt: link to `agents.testnet.somnia.network/receipts/{id}` + "Load inline" fetches minimal steps and renders numbered list
- Wallet: **OKX-only** via wagmi injected target + global `window.okxwallet`. Falls back to opening OKX web3 download. Auto-switch prompt for chain.
- No multi-wallet, no WC, SSR wagmi config.

### Tests & Scripts
- 21 passing (mock fulfills with "RELEASE"/"REFUND"/"SPLIT" or Failed status; checks balances, state, auth, overpay rebate, defaults)
- `live-dispute.ts`: end-to-end on live deployed court (create + evidence + dispute)
- `check.ts` / `inspect.ts`: status + platform request details + receipt fetch
- Deploy scripts separate for court vs features (both need PRIVATE_KEY + LLM_AGENT_ID)

---

## 3. Strengths

- **Novel primitive:** First (or among first) to put the *verdict itself* on-chain via consensus LLM with auditable receipt. "The judgment is the transaction."
- Clean separation of happy-path (0 AI cost/gas) vs dispute (disputer pays inference).
- Multiple real-world patterns (escrow, invoice, gift, hashlock) in dedicated contracts.
- Strong use of platform primitives: `allowedValues` for robust enum consensus, CoT for visible reasoning, rebates via `receive()`.
- Excellent proof: live dispute + full reasoning trace fetched and matches on-chain prompt exactly.
- Minimal attack surface: no owner, no upgrade, immutable config, callback auth strict.
- Good docs in README (demo script, compliance checklist, security notes).
- Tests cover failure modes (agent fail → refund client), overpayment, auth, state machine.
- UI is polished for a hackathon entry (dark pixel bg, gold accents, inline receipt viewer).
- Worker demonstrates the "advisory + proof" pattern cleanly.

---

## 4. Issues, Risks, Bugs, and Improvement Opportunities

### Critical / High
1. **VerdictCourt duplication (major maintainability + inconsistency risk)**
   - ~Duplicate of AgentArbitrated logic + court-specific Deal struct/events.
   - Different storage keys, different function names (getDeal vs getInvoice), different prompt builders.
   - Worker + parts of web are court-only or have special-casing.
   - Bug fixed in base/features won't apply to live court (the one with real proof).
   - Recommendation: Refactor VerdictCourt to inherit AgentArbitrated (or extract a common internal lib). For already-deployed, document as "v1 legacy" and encourage features. Or deploy a new unified court.

2. **Push-payment + no recovery path can permanently lock funds**
   - `_pay` (low-level call) in happy paths and (especially) `_settle` (from platform callback).
   - If recipient reverts on receive (contract without payable fallback, or reverts intentionally), the entire `handleResponse` (or confirm/claim) reverts.
   - For disputes: delete + state change undone; case stuck in Judging forever; no manual "execute verdict" or "force refund" path.
   - No admin, no timelock escape hatch.
   - Even EOAs can have issues in future (e.g. if account abstraction changes).
   - **Risk:** user error or malicious recipient addr → locked STT in contract.
   - Mitigation ideas (non-breaking for new deploys): switch to pull-claims after verdict recorded (set verdict, emit, let parties `claim()`), or try/catch pay + leave claimable balance mapping.

3. **Worker incomplete for "feature" contracts**
   - Hardcoded to COURT + verdictAbi + court-shaped advocateBrief (terms + client/providerEvidence).
   - Features emit same Disputed/Resolved but have different structs (note vs evidences, different getters).
   - If users create real invoices/gifts/envelopes, no advocate briefs, no console receipt logging.
   - Fix: make worker watch all 4 addrs, dispatch by addr or add unified view functions.

4. **Wallet support extremely narrow (OKX only, no discovery)**
   - Hardcoded `injected({target: {id:"okxWallet", provider: window.okxwallet}})`
   - If no global, opens external page instead of falling back.
   - Somnia testnet users with MetaMask, Rabby, etc. will have poor/no experience.
   - For public demo / Agentathon: big UX blocker.
   - Easy fix: add standard `injected()` + perhaps WC v2 (needs @walletconnect, projectId).

### Medium
5. **Exact string match on LLM output (case/whitespace sensitive)**
   - `keccak256(bytes(verdict)) === keccak256("RELEASE")`
   - Prompt says "exactly one of the allowed", and platform constrains, but if model returns "Refund" / " release\n" / lower, falls to default Refund.
   - In real receipt: it did return uppercase "REFUND".
   - Improvement: toUpper + trim in Solidity (or platform guarantees).

6. **Envelope note handling**
   - `seal(..., note)` stores initial note.
   - `dispute(..., reason)` **overwrites** `note = reason`.
   - Dispute prompt: only "ENVELOPE NOTE: " + (possibly overwritten) note. Loses original sealed message.
   - UI for envelope dispute uses "Reason / note for the AI (optional)".

7. **No reentrancy guards**
   - Multiple external `.call` in state-changing functions (rebates in dispute, all settlements).
   - States prevent most obvious reentrancy (e.g. double-claim), but still violates checks-effects-interactions in places (pay after some effects).
   - Add `ReentrancyGuard` from OZ or simple mutex for robustness (especially if more functions added later).

8. **Hardcoded LLM price / subcommittee in source**
   - `LLM_PRICE_PER_AGENT = 0.07 ether; SUBCOMMITTEE_SIZE = 3;`
   - `disputeDeposit` combines with dynamic `getRequestDeposit()`.
   - If platform changes pricing, deposits will be wrong (under/over). README notes "surplus is rebated".
   - Better: always use platform quote + small buffer, or make configurable.

9. **Feature ABIs in web/lib/features.ts use normalized field names (a/b/text/note)**
   - Works (ABI decoding positional), but the `getInvoice` etc. ABIs don't match on-chain struct names exactly. Minor confusion risk when extending.

10. **Count reads + reverse list in UI**
    - `ids = Array.from({length: n}, (_,i) => BigInt(n-i))` then one read per card.
    - For high usage: N+1 reads, no pagination, no caching beyond RQ.
    - Fine for hackathon.

11. **In page.tsx feature count query always passes `invoiceAbi`**
    - Works because `count()` selector identical across contracts.
    - But `useReadContract` for non-invoice will have wrong ABI in cache/types if ever extended.

12. **Worker + web receipt fetch hardcodes AGENT_REQUESTER**
    - Good (per docs), but if ever different platforms, needs per-contract config.

### Low / Polish
- No reputation display in FeatureCards (only court provider rep).
- Court terms not auto-tagged with `[escrow]` (parseTerms only helps if manually tagged).
- No deal/invoice/gift deadlines or expiration.
- Worker is fire-and-forget console logger; no persistence, no serving briefs to UI.
- No events for some side effects (e.g. reputation changes not emitted).
- .env files present in tree (but gitignored + examples); ensure no accidental commit of keys.
- Next config externals for pino etc. (wallet deps).
- Hardhat verify uses `apiKey: "empty"` (works for Blockscout-style).
- No CI, no lint scripts visible, no gas reports.
- README checklist has some unchecked (live demo URL, video, written submission).

### Security / Trust Model Notes (from code + README)
- No admin keys in contracts (good).
- Deployer/Nous keys only in .env (gitignored).
- Callback strictly `msg.sender == agentRequester`.
- All agent statuses handled (Failed/TimedOut → Refund client).
- Funds never leave contract except via the 3 verdict paths or happy confirms.
- Evidence is on-chain public (free text strings).
- LLM prompt is fully on-chain → auditable what the AI "saw".
- Still relies on: Somnia platform liveness, LLM determinism + consensus honesty, correct agent ID deployment.

---

## 5. Verification Performed During Analysis

- Full dir tree + non-node files enumerated via PowerShell + list_dir.
- All primary .sol, .ts, .tsx, configs, README, scripts read.
- `npx hardhat test` (contracts): **21 passing**.
- `npx tsc --noEmit` (web + worker): clean.
- Live receipt for documented dispute #3481409 fetched + decoded: 3/3 validators → "REFUND" + full CoT reasoning matching the exact on-chain prompt from VerdictCourt (client evidence vs no provider evidence).
- Deployed addresses cross-checked between README, .env.local, scripts.
- Confirmed worker only watches court; base only used by 3 features.
- Confirmed duplication (grep for inheritance only hits the 3 features).

---

## 6. Recommendations / Next Steps (prioritized)

1. **Unify contracts:** Port VerdictCourt to inherit AgentArbitrated (add a thin wrapper or change storage). Or mark court as deprecated.
2. **Generalize worker:** Watch array of addresses, use a registry or per-addr ABI/getter map, make advocate prompt type-aware.
3. **Harden payments:** Consider pull-claim model for AI verdicts (record verdict + amount claimable, parties pull). Add ReentrancyGuard.
4. **Broaden wallet support:** Standard wagmi connectors + fallback.
5. **Defensive LLM decode:** Uppercase + trim the result string before keccak.
6. **Make pricing dynamic + add safety margin** in deposit calc; emit events for all state changes.
7. **Add envelope note preservation** (separate `initialNote` / `disputeNote`).
8. **Expose unified interface** (e.g. a registry or each contract implements a common `IVerdictCase` view).
9. **UI/UX:** Add "all cases" aggregator, better loading states, support more wallets, show full party reps, copyable links.
10. **Ops:** Add a simple indexer or TheGraph-like for cases (instead of on-chain count + N reads), persist worker briefs.
11. **Docs:** Update README with feature contract usage in worker/UI; add security section on locked-funds risk.
12. **For Agentathon:** Record the 2-3min demo video using live-dispute + receipt viewer + worker logs + the real 3481409 proof.

---

## 7. Files of Particular Interest (for further edits)

- Dupe logic: `contracts/contracts/VerdictCourt.sol` vs `contracts/contracts/AgentArbitrated.sol`
- Court-specific everything: `worker/src/*`, `web/lib/contract.ts`, `web/components/DealCard.tsx`
- Payment paths: `_pay` + `_settle` / `_resolve` in base + court
- Prompt construction: `_buildPrompt` / `_prompt` hooks
- Receipt integration: `web/components/Receipt.tsx`, `worker/src/receipts.ts`
- Wallet gate: `web/app/providers.tsx`, `web/components/Connect.tsx`

---

**Summary verdict:** A creative, well-executed hackathon project that genuinely leverages Somnia's unique on-chain AI consensus capability. The core idea and live proof are strong. The main technical debt is the non-refactored VerdictCourt (duplication) and the push-payment locking risk. With the 3 feature contracts using the nice base, the pattern is proven. Polish the wallet support and generalize the worker, and it's a compelling demo of "trustless AI arbitration."

All tests pass, integration verified end-to-end with real on-chain data.

---

*Analysis generated from direct inspection of source, execution, and live Somnia services. No external assumptions beyond fetched receipts.*