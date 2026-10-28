require("dotenv").config();
const { ethers } = require("ethers");

// Configuration from your environment
const RPC_URL = process.env.RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY; // Must be the contract owner/admin wallet
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// Minimal ABI containing only what the bot needs
const ABI = [
  "function loanCounter() view returns (uint256)",
  "function loans(uint256) view returns (uint256 id, address borrower, address lender, uint256 principal, uint256 repaymentAmount, uint256 dueDate, uint8 status)",
  "function markDefaulted(uint256 loanId) external"
];

const STATUS = { Requested: 0, Funded: 1, Withdrawn: 2, Repaid: 3, Defaulted: 4 };

async function checkAndMarkDefaults() {
  if (!PRIVATE_KEY || !CONTRACT_ADDRESS) {
    console.error("❌ Missing ADMIN_PRIVATE_KEY or CONTRACT_ADDRESS in environment variables.");
    return;
  }

  console.log("🔍 Scanning active protocol loans for defaults...");

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    const totalLoans = await contract.loanCounter();
    const currentTimestamp = Math.floor(Date.now() / 1000);

    for (let i = 1; i <= Number(totalLoans); i++) {
      try {
        const loan = await contract.loans(i);
        const status = Number(loan.status);
        const dueDate = Number(loan.dueDate);

        // Check if the loan is Funded or Withdrawn and past its due date
        if ((status === STATUS.Funded || status === STATUS.Withdrawn) && currentTimestamp > dueDate) {
          console.log(`⚠️ Loan #${i} is overdue! Due: ${new Date(dueDate * 1000).toLocaleString()}. Triggering default...`);
          
          const tx = await contract.markDefaulted(i);
          console.log(`⏳ Transaction submitted: ${tx.hash}`);
          
          await tx.wait();
          console.log(`✅ Successfully marked Loan #${i} as Defaulted.`);
        }
      } catch (err) {
        console.error(`Error processing loan #${i}:`, err.reason || err.message);
      }
    }
    console.log("✨ Scan complete. Sleeping...\n");
  } catch (err) {
    console.error("❌ Failed to connect to network or contract:", err.message);
  }
}

// Run immediately, then poll every 6 hours
checkAndMarkDefaults();
setInterval(checkAndMarkDefaults, 6 * 60 * 60 * 1000);