// Marks overdue loans as Defaulted. Run from admin-backend/:
//
//   npm run bot
//
// Scans every loan on start, then every 6 hours. markDefault() is open to anyone,
// so PRIVATE_KEY can be any funded Sepolia wallet; it only pays gas.
// Reads SEPOLIA_RPC_URL and PRIVATE_KEY from admin-backend/.env.

require("dotenv").config();
const { ethers } = require("ethers");
const { STATUS, loadContract } = require("./contract");

const SCAN_MS = 6 * 60 * 60 * 1000;

async function checkAndMarkDefaults(contract, provider) {
  console.log("🔍 Scanning loans for defaults...");

  const total = Number(await contract.loanCounter());
  // Compare against chain time, not the local clock, since that's what the contract checks.
  const { timestamp: now } = await provider.getBlock("latest");

  for (let i = 1; i <= total; i++) {
    try {
      const loan = await contract.loans(i);
      // Only Withdrawn loans can default; Funded-but-unwithdrawn ones are reclaimed by the lender.
      if (Number(loan.status) !== STATUS.Withdrawn || now <= Number(loan.dueDate)) continue;

      console.log(`⚠️ Loan #${i} is overdue (due ${new Date(Number(loan.dueDate) * 1000).toISOString()}). Marking default...`);
      const tx = await contract.markDefault(i);
      console.log(`⏳ Transaction submitted: ${tx.hash}`);
      await tx.wait();
      console.log(`✅ Loan #${i} marked as Defaulted.`);
    } catch (err) {
      console.error(`Error processing loan #${i}:`, err.reason || err.shortMessage || err.message);
    }
  }
  console.log("✨ Scan complete.\n");
}

function main() {
  const { SEPOLIA_RPC_URL, PRIVATE_KEY } = process.env;
  if (!SEPOLIA_RPC_URL || !PRIVATE_KEY) {
    console.error("❌ SEPOLIA_RPC_URL and PRIVATE_KEY must be set in admin-backend/.env.");
    process.exit(1);
  }
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const contract = loadContract(new ethers.Wallet(PRIVATE_KEY, provider));

  const scan = () =>
    checkAndMarkDefaults(contract, provider).catch((err) =>
      console.error("❌ Scan failed:", err.shortMessage || err.message)
    );
  scan();
  setInterval(scan, SCAN_MS);
}

main();
