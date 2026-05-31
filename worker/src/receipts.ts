// Fetches the real Somnia execution receipt for an agent request.
// Docs: https://docs.somnia.network/agents/invoking-agents/receipts
const BASE = process.env.RECEIPTS_BASE_URL ?? "https://receipts.testnet.agents.somnia.host";
// Receipts are indexed under the Somnia Agents platform (AgentRequester) address.
const AGENT_REQUESTER = process.env.AGENT_REQUESTER ?? "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776";

export interface Receipt { steps: { name: string; [k: string]: unknown }[] }

export async function fetchReceipt(requestId: bigint): Promise<Receipt | null> {
  const res = await fetch(`${BASE}/agent-receipts?requestId=${requestId.toString()}&contractAddress=${AGENT_REQUESTER}&type=minimal`);
  if (!res.ok) return null;
  const data = await res.json();
  const steps = data.receipts?.[0]?.agentReceipt?.steps;
  return steps?.length ? { steps } : null;
}
