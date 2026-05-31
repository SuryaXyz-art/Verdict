import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    somniaTestnet: {
      url: process.env.SOMNIA_RPC_URL ?? "https://api.infra.testnet.somnia.network",
      chainId: 50312,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  // Blockscout-style verification on Shannon explorer
  etherscan: {
    apiKey: { somniaTestnet: "empty" },
    customChains: [
      {
        network: "somniaTestnet",
        chainId: 50312,
        urls: {
          apiURL: "https://shannon-explorer.somnia.network/api",
          browserURL: "https://shannon-explorer.somnia.network",
        },
      },
    ],
  },
};

export default config;
