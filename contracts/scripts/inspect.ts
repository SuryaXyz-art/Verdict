import { ethers } from "hardhat";

const PLATFORM = "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776";
const REQUEST_ID = 3481409n;

async function main() {
  const p = await ethers.getContractAt("IAgentRequester", PLATFORM);
  const r = await p.getRequest(REQUEST_ID);
  console.log("status:", r.status.toString(), "responses:", r.responses.length);
  for (const resp of r.responses) {
    let decoded = "";
    try { decoded = ethers.AbiCoder.defaultAbiCoder().decode(["string"], resp.result)[0]; } catch {}
    console.log(`  validator ${resp.validator} | status ${resp.status} | receipt ${resp.receipt} | result "${decoded}"`);
  }
}

main().catch((e) => { console.error(e.shortMessage ?? e.message); process.exitCode = 1; });
