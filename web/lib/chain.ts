import { defineChain } from "viem";

export const somniaTestnet = defineChain({
  id: 50312,
  name: "Somnia Testnet",
  nativeCurrency: { name: "Somnia Test Token", symbol: "STT", decimals: 18 },
  rpcUrls: { default: { http: ["https://api.infra.testnet.somnia.network"] } },
  blockExplorers: { default: { name: "Shannon", url: "https://shannon-explorer.somnia.network" } },
  testnet: true,
});

export const RECEIPTS_BASE = "https://receipts.testnet.agents.somnia.host";
// Somnia Agents platform (AgentRequester) — receipts are indexed under this address, not the dApp's.
export const AGENT_REQUESTER = "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776";
// Official Somnia Agents web app — renders the full execution receipt per request.
export const AGENTS_APP_BASE = "https://agents.testnet.somnia.network";
