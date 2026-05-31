import { ethers } from "hardhat";

// Deploys the three per-feature contracts. Reuses AGENT_REQUESTER + LLM_AGENT_ID from .env.
async function main() {
  const agentRequester = process.env.AGENT_REQUESTER;
  const llmAgentId = process.env.LLM_AGENT_ID;
  if (!agentRequester || !llmAgentId) throw new Error("Set AGENT_REQUESTER and LLM_AGENT_ID in .env");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  for (const name of ["InvoiceVerdict", "GiftVerdict", "EnvelopeVerdict"]) {
    const c = await (await ethers.getContractFactory(name)).deploy(agentRequester, llmAgentId);
    await c.waitForDeployment();
    console.log(`${name}:`, await c.getAddress());
  }
  console.log("Set NEXT_PUBLIC_*_ADDRESS in web/.env.local for each address above.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
