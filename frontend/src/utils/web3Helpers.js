import { ethers } from "ethers";
import abiFile from "@/constants/MicroLoanABI.json";
import addressFile from "@/constants/contractAddress.json";
import { SEPOLIA } from "@/constants/adminConfig";

export const MICROLOAN_ABI = Array.isArray(abiFile) ? abiFile : (abiFile?.abi ?? []);

const iface = new ethers.Interface(MICROLOAN_ABI);

export function hasFunction(name) {
  try {
    return Boolean(iface.getFunction(name));
  } catch {
    return false;
  }
}

// Accepts "0x..." or { address } or { MicroLoan } or { contractAddress }.
export function getContractAddress() {
  const f = addressFile;
  const value =
    typeof f === "string" ? f : f?.address || f?.MicroLoan || f?.microLoan || f?.contractAddress;
  return value && ethers.isAddress(value) ? value : null;
}

const RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;

// One shared read-only provider, so polling doesn't create a new one every time.
let rpcProvider = null;

// A provider that is guaranteed to be on Sepolia, or null.
// Prefers the shared Alchemy/Infura URL so reads work without a wallet.
export async function getSepoliaReader() {
  if (RPC_URL) {
    if (!rpcProvider) {
      rpcProvider = new ethers.JsonRpcProvider(RPC_URL, Number(SEPOLIA.chainId), {
        staticNetwork: true,
      });
    }
    return rpcProvider;
  }
  if (typeof window === "undefined" || !window.ethereum) return null;
  const provider = new ethers.BrowserProvider(window.ethereum);
  const { chainId } = await provider.getNetwork();
  return chainId === SEPOLIA.chainId ? provider : null;
}

export function sameAddress(a, b) {
  return Boolean(a && b) && a.toLowerCase() === b.toLowerCase();
}

export function shortAddress(a) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

export const txUrl = (hash) => `${SEPOLIA.explorer}/tx/${hash}`;
export const addressUrl = (a) => `${SEPOLIA.explorer}/address/${a}`;

// The contract's require() messages, in plainer words.
const KNOWN_REASONS = [
  ["Caller is not the admin", "Only the admin wallet can do this."],
  ["Contract is currently paused by admin", "The platform is paused right now. Try again once it's resumed."],
  ["Requested amount exceeds admin maximum limit", "That amount is above the maximum loan amount."],
  ["Loan not in Requested state", "This loan has already been funded."],
  ["Must fund the exact principal amount", "The amount sent must equal the loan principal."],
  ["Borrower cannot fund their own loan", "You can't fund your own loan request."],
  ["Loan is not funded", "This loan hasn't been funded yet."],
  ["Only borrower can withdraw", "Only the borrower can withdraw these funds."],
  ["Loan not active", "This loan is not active."],
  ["Must pay exact repayment amount", "The amount sent must equal the full repayment."],
  ["Loan is past due date", "This loan is past its due date and can no longer be repaid."],
  ["Principal must be greater than zero", "The principal must be more than zero."],
  ["Repayment must cover the principal", "The repayment can't be less than the principal."],
  ["Duration must be greater than zero", "Pick a due date in the future."],
  ["Only borrower can cancel", "Only the borrower can cancel this request."],
  ["Loan is not yet past due", "This loan is not past its due date yet."],
];

// Turns an ethers v6 error into one plain sentence.
export function describeTxError(err) {
  if (err?.code === "ACTION_REJECTED" || err?.info?.error?.code === 4001) {
    return "You rejected the transaction in MetaMask.";
  }
  if (err?.code === "INSUFFICIENT_FUNDS") {
    return "This wallet doesn't have enough Sepolia ETH to cover the amount plus gas.";
  }
  const text = [err?.reason, err?.shortMessage, err?.info?.error?.message, err?.message]
    .filter(Boolean)
    .join(" ");
  for (const [needle, friendly] of KNOWN_REASONS) {
    if (text.includes(needle)) return friendly;
  }
  if (err?.reason) return err.reason;
  return err?.shortMessage || err?.message || "The transaction failed.";
}