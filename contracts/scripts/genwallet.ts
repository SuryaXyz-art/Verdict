// One-off helper: create a fresh testnet deployer wallet and store its key in .env.
// Prints only the public address (never the private key).
import { Wallet } from "ethers";
import * as fs from "fs";

const w = Wallet.createRandom();
const path = ".env";
let env = fs.readFileSync(path, "utf8");
env = env.replace(/^PRIVATE_KEY=.*$/m, `PRIVATE_KEY=${w.privateKey}`);
fs.writeFileSync(path, env);

console.log("\nDeployer wallet created and saved to contracts/.env");
console.log("Fund THIS address with STT from https://testnet.somnia.network :\n");
console.log("   " + w.address + "\n");
console.log("Then paste LLM_AGENT_ID into .env and we deploy.");
