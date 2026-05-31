import { ethers } from "hardhat";

const ADDR = "0x67288D6249eA68C05e46B484057Ca705F0f28cc4";
const PROVIDER = "0x000000000000000000000000000000000000dEaD"; // distinct from client

async function main() {
  const court = await ethers.getContractAt("VerdictCourt", ADDR);

  let tx = await court.createDeal(
    PROVIDER,
    "Provider agreed to deliver a logo as an SVG by Friday. Client says nothing arrived; provider says it was emailed on time.",
    { value: ethers.parseEther("0.001") }
  );
  await tx.wait();
  const id = await court.dealCount();
  console.log("Created deal #", id.toString());

  tx = await court.submitEvidence(id, "Client: my inbox and spam are empty, no SVG was ever received.");
  await tx.wait();
  console.log("Evidence submitted");

  const dep = await court.disputeDeposit();
  console.log("Dispute deposit:", ethers.formatEther(dep), "STT");
  tx = await court.dispute(id, { value: dep });
  const rc = await tx.wait();
  console.log("Dispute tx:", rc?.hash);

  const d = await court.getDeal(id);
  console.log("agent requestId:", d.requestId.toString(), "| state:", d.state.toString());
  console.log("Re-check with: npx hardhat run scripts/check.ts --network somniaTestnet");
}

main().catch((e) => { console.error("REVERTED:", e.shortMessage ?? e.message); process.exitCode = 1; });
