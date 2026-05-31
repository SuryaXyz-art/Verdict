import { ethers } from "hardhat";

const ADDR = "0x67288D6249eA68C05e46B484057Ca705F0f28cc4";
const STATE = ["None", "Open", "Judging", "Resolved"];
const VERDICT = ["None", "Release", "Refund", "Split"];

async function main() {
  const court = await ethers.getContractAt("VerdictCourt", ADDR);
  const id = await court.dealCount();
  const d = await court.getDeal(id);
  console.log(`Deal #${id} | state: ${STATE[Number(d.state)]} | verdict: ${VERDICT[Number(d.verdict)]} | requestId: ${d.requestId}`);

  if (d.requestId !== 0n) {
    const platform = process.env.AGENT_REQUESTER ?? "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776";
    const url = `https://receipts.testnet.agents.somnia.host/agent-receipts?requestId=${d.requestId}&contractAddress=${platform}&type=minimal`;
    const res = await fetch(url);
    const r = res.ok ? await res.json() : null;
    const steps = r?.receipts?.[0]?.agentReceipt?.steps;
    console.log(steps?.length ? "Receipt steps: " + steps.map((s: any) => s.name).join(" -> ") : `Receipt not available yet (${res.status})`);
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
