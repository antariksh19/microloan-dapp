import hre from "hardhat";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The frontend, admin CLI and admin bot all read the ABI and address from here.
const CONSTANTS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "frontend", "src", "constants");

async function main() {
  console.log("Deploying MicroLoan contract to Sepolia...");

  // Explicitly initialize the network connection for Hardhat 3
  const connection = await hre.network.create();
  const ethers = connection.ethers;

  const MicroLoan = await ethers.getContractFactory("MicroLoan");
  const microLoan = await MicroLoan.deploy();

  await microLoan.waitForDeployment();

  const contractAddress = await microLoan.getAddress();
  console.log(`✅ MicroLoan officially deployed to Sepolia at address: ${contractAddress}`);

  const artifact = await hre.artifacts.readArtifact("MicroLoan");
  fs.writeFileSync(path.join(CONSTANTS, "MicroLoanABI.json"), JSON.stringify(artifact.abi, null, 2) + "\n");
  fs.writeFileSync(path.join(CONSTANTS, "contractAddress.json"), JSON.stringify({ address: contractAddress }, null, 2) + "\n");
  console.log(`Wrote the ABI and address to ${CONSTANTS}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
