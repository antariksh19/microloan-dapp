import { defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  solidity: "0.8.20", // Ensure this matches your MicroLoan.sol pragma
  plugins: [hardhatToolboxMochaEthers],
  // Only define sepolia when a URL is set; an empty URL makes Hardhat reject the
  // whole config, which would also stop `npm test` from running locally.
  networks: process.env.SEPOLIA_RPC_URL
    ? {
        sepolia: {
          type: "http",
          url: process.env.SEPOLIA_RPC_URL,
          accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        },
      }
    : {},
  verify: {
    etherscan: {
      apiKey: process.env.ETHERSCAN_API_KEY || "",
    },
  },
});