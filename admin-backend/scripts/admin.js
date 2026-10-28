// Admin command line for MicroLoan (Node + ethers v6). Run from admin-backend/:
//
//   npm run admin -- status
//   npm run admin -- pause
//   npm run admin -- unpause
//   npm run admin -- limit 5          (maximum loan amount in ETH)
//   npm run admin -- transfer 0xNew   (step 1: current admin nominates a new admin)
//   npm run admin -- accept           (step 2: run with the NEW admin's PRIVATE_KEY)
//
// Reads SEPOLIA_RPC_URL and PRIVATE_KEY (the admin wallet) from admin-backend/.env.
// Reads the ABI and address from frontend/src/constants, the same files the UI uses.

require("dotenv").config();
const { ethers } = require("ethers");
const { loadContract } = require("./contract");

async function printStatus(c) {
  const [admin, paused, maxLoanAmount, loanCounter] = await Promise.all([
    c.admin(),
    c.paused(),
    c.maxLoanAmount(),
    c.loanCounter(),
  ]);
  console.log(`Contract      ${await c.getAddress()}`);
  console.log(`Admin         ${admin}`);
  console.log(`Platform      ${paused ? "PAUSED" : "running"}`);
  console.log(`Max loan      ${ethers.formatEther(maxLoanAmount)} ETH`);
  console.log(`Total loans   ${loanCounter}`);
}

async function send(label, txPromise) {
  const tx = await txPromise;
  console.log(`${label}: sent ${tx.hash}`);
  console.log(`https://sepolia.etherscan.io/tx/${tx.hash}`);
  await tx.wait();
  console.log(`${label}: confirmed\n`);
}

async function main() {
  const [command = "status", arg] = process.argv.slice(2);
  const { SEPOLIA_RPC_URL, PRIVATE_KEY } = process.env;
  if (!SEPOLIA_RPC_URL) throw new Error("SEPOLIA_RPC_URL is missing from admin-backend/.env");
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);

  if (command === "status") return printStatus(loadContract(provider));

  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is missing from admin-backend/.env");
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const c = loadContract(signer);

  // The nominee isn't admin yet, so this one runs before the admin check.
  if (command === "accept") {
    await send("Accept admin", c.acceptAdmin());
    return printStatus(c);
  }

  const admin = await c.admin();
  if (admin.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`PRIVATE_KEY is for ${signer.address}, but the admin is ${admin}`);
  }

  if (command === "pause" || command === "unpause") {
    // togglePause() flips the flag, so only send it if it moves us where we asked.
    const paused = await c.paused();
    if (paused === (command === "pause")) {
      console.log(`Already ${paused ? "paused" : "running"}. Nothing to do.\n`);
    } else {
      await send(command === "pause" ? "Pause" : "Resume", c.togglePause());
    }
  } else if (command === "limit") {
    if (!arg) throw new Error("Usage: npm run admin -- limit <maxLoanEth>");
    const wei = ethers.parseEther(arg);
    if (wei === 0n) throw new Error("Use an amount above 0. To stop all requests, pause instead.");
    await send("Set max loan", c.setMaxLoanAmount(wei));
  } else if (command === "transfer") {
    if (!ethers.isAddress(arg)) throw new Error("Usage: npm run admin -- transfer <newAdminAddress>");
    await send("Nominate admin", c.transferAdmin(arg));
    console.log(`Now run "npm run admin -- accept" with ${arg}'s PRIVATE_KEY to finish.\n`);
  } else {
    throw new Error(`Unknown command "${command}". Use status, pause, unpause, limit, transfer or accept.`);
  }

  await printStatus(c);
}

main().catch((e) => {
  console.error(`Error: ${e.reason || e.shortMessage || e.message}`);
  process.exit(1);
});
