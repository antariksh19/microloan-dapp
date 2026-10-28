// Shared by the admin CLI and the default bot.
// Reads the ABI and address from frontend/src/constants, the same files the UI uses,
// so the scripts can never call a function name the contract doesn't have.

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const CONSTANTS = path.join(__dirname, "..", "..", "frontend", "src", "constants");

// Matches the Status enum in backend/contracts/MicroLoan.sol.
const STATUS = { Requested: 0, Funded: 1, Withdrawn: 2, Repaid: 3, Defaulted: 4, Cancelled: 5, Refunded: 6 };

function readJson(file) {
  const text = fs.readFileSync(path.join(CONSTANTS, file), "utf8").trim();
  return text ? JSON.parse(text) : null;
}

function loadContract(runner) {
  const abiFile = readJson("MicroLoanABI.json");
  const addrFile = readJson("contractAddress.json");
  const abi = Array.isArray(abiFile) ? abiFile : (abiFile?.abi ?? []);
  const address = typeof addrFile === "string" ? addrFile : addrFile?.address;
  if (!ethers.isAddress(address)) throw new Error("No valid address in contractAddress.json");
  return new ethers.Contract(address, abi, runner);
}

module.exports = { STATUS, loadContract };
