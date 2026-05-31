import "dotenv/config";
import { createPublicClient, http, defineChain } from "viem";
import { verdictAbi, VERDICT_LABELS } from "./abi.js";
import { advocateBrief } from "./nous.js";
import { fetchReceipt } from "./receipts.js";

const somniaTestnet = defineChain({
  id: 50312,
  name: "Somnia Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: { default: { http: [process.env.SOMNIA_RPC_URL ?? "https://api.infra.testnet.somnia.network"] } },
});

const address = process.env.COURT_ADDRESS as `0x${string}`;
if (!address) throw new Error("Set COURT_ADDRESS in .env");

const client = createPublicClient({ chain: somniaTestnet, transport: http() });

console.log(`Verdikt Advocate watching ${address} on Somnia testnet...`);

// On dispute: Nous drafts a neutral, human-readable brief (advisory).
client.watchContractEvent({
  address, abi: verdictAbi, eventName: "Disputed",
  onLogs: async (logs) => {
    for (const log of logs) {
      const id = (log as any).args.id as bigint;
      const d = await client.readContract({ address, abi: verdictAbi, functionName: "getDeal", args: [id] });
      try {
        const brief = await advocateBrief(d.terms, d.clientEvidence, d.providerEvidence);
        console.log(`\n[Case #${id}] Advocate brief:\n${brief}\n`);
      } catch (e) { console.error(`[Case #${id}] brief failed:`, (e as Error).message); }
    }
  },
});

// On resolution: print the binding verdict + the real Somnia receipt steps.
client.watchContractEvent({
  address, abi: verdictAbi, eventName: "Resolved",
  onLogs: async (logs) => {
    for (const log of logs) {
      const { id, verdict, requestId } = (log as any).args;
      console.log(`\n[Case #${id}] VERDICT: ${VERDICT_LABELS[verdict]} (request ${requestId})`);
      const receipt = await fetchReceipt(requestId as bigint);
      if (receipt) console.log("Receipt steps:", receipt.steps.map((s) => s.name).join(" -> "));
      else console.log("Receipt not available yet.");
    }
  },
});
