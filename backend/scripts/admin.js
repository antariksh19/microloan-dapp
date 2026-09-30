// Admin command line for MicroLoan. Plain Node + ethers v6, no Hardhat needed,
// so it works the same on Windows, macOS and Linux.
//
//   node scripts/admin.js status
//   node scripts/admin.js pause
//   node scripts/admin.js unpause
//   node scripts/admin.js limits <maxPrincipalEth> <maxDays>    (0 = no limit)
//
// Reads SEPOLIA_RPC_URL and PRIVATE_KEY from backend/.env (the owner wallet).
// Reads the ABI and address from frontend/src/constants, the same files the UI uses.

// backend/package.json sets "type": "module", so this file uses ES imports.
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONSTANTS = path.join(__dirname, "..", "..", "frontend", "src", "constants");

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(CONSTANTS, file), "utf8"));
}

function loadContractInfo() {
  const abiFile = readJson("MicroLoanABI.json");
  const addrFile = readJson("contractAddress.json");
  const abi = Array.isArray(abiFile) ? abiFile : abiFile.abi;
  const address =
    typeof addrFile === "string"
      ? addrFile
      : addrFile.address || addrFile.MicroLoan || addrFile.microLoan || addrFile.contractAddress;
  if (!ethers.isAddress(address)) throw new Error("No valid address in contractAddress.json");
  return { abi, address };
}

const days = (seconds) => Number(seconds) / 86400;

async function printStatus(c) {
  const [owner, paused, maxPrincipal, maxDuration] = await Promise.all([
    c.owner(),
    c.paused(),
    c.maxPrincipal(),
    c.maxDuration(),
  ]);
  console.log(`Contract      ${await c.getAddress()}`);
  console.log(`Owner         ${owner}`);
  console.log(`Lending       ${paused ? "PAUSED" : "open"}`);
  console.log(`Largest loan  ${maxPrincipal === 0n ? "no limit" : ethers.formatEther(maxPrincipal) + " ETH"}`);
  console.log(`Longest term  ${maxDuration === 0n ? "no limit" : days(maxDuration) + " days"}`);
}

async function send(label, txPromise) {
  const tx = await txPromise;
  console.log(`${label}: sent ${tx.hash}`);
  console.log(`https://sepolia.etherscan.io/tx/${tx.hash}`);
  await tx.wait();
  console.log(`${label}: confirmed`);
}

let iface;

function revertName(e) {
  if (e?.revert?.name) return e.revert.name;
  for (const data of [e?.data, e?.info?.error?.data, e?.info?.error?.data?.data]) {
    if (typeof data !== "string" || !data.startsWith("0x")) continue;
    try {
      const parsed = iface?.parseError(data);
      if (parsed) return parsed.name;
    } catch {}
  }
  return null;
}

async function main() {
  const [command = "status", ...args] = process.argv.slice(2);
  const { SEPOLIA_RPC_URL, PRIVATE_KEY } = process.env;
  if (!SEPOLIA_RPC_URL) throw new Error("SEPOLIA_RPC_URL is missing from backend/.env");

  const { abi, address } = loadContractInfo();
  iface = new ethers.Interface(abi);
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);

  if (command === "status") {
    return printStatus(new ethers.Contract(address, abi, provider));
  }

  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is missing from backend/.env");
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const c = new ethers.Contract(address, abi, signer);

  const owner = await c.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`PRIVATE_KEY is for ${signer.address}, but the owner is ${owner}`);
  }

  if (command === "pause") await send("Pause", c.pause());
  else if (command === "unpause") await send("Unpause", c.unpause());
  else if (command === "limits") {
    const [eth, maxDays] = args;
    if (eth === undefined || maxDays === undefined) {
      throw new Error("Usage: node scripts/admin.js limits <maxPrincipalEth> <maxDays>");
    }
    const principal = ethers.parseEther(eth);
    const duration = BigInt(Math.round(Number(maxDays) * 86400));
    await send("Set limits", c.setLimits(principal, duration));
  } else {
    throw new Error(`Unknown command "${command}". Use status, pause, unpause or limits.`);
  }

  console.log("");
  await printStatus(c);
}

main().catch((e) => {
  const name = revertName(e);
  console.error(`Error: ${name ? `contract reverted with ${name}` : e.shortMessage || e.message}`);
  process.exit(1);
});
