import { ethers } from "hardhat";

async function main() {
  const agentRequester = process.env.AGENT_REQUESTER;
  const llmAgentId = process.env.LLM_AGENT_ID;
  if (!agentRequester || !llmAgentId) throw new Error("Set AGENT_REQUESTER and LLM_AGENT_ID in .env");

  const [deployer] = await ethers.getSigners();
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer:", deployer.address, "balance:", ethers.formatEther(bal), "STT");
  if (bal === 0n) throw new Error("Deployer has 0 STT — fund it from https://testnet.somnia.network");

  const Court = await ethers.getContractFactory("VerdictCourt");
  const court = await Court.deploy(agentRequester, llmAgentId);
  await court.waitForDeployment();
  const addr = await court.getAddress();
  console.log("VerdictCourt deployed:", addr);
  console.log("Next: set NEXT_PUBLIC_COURT_ADDRESS (web) and COURT_ADDRESS (worker) to", addr);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
