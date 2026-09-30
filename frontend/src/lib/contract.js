import { ethers } from "ethers";
import abiFile from "../constants/MicroLoanABI.json";
import addressFile from "../constants/contractAddress.json";
import { SEPOLIA } from "../constants/adminConfig";

// Both files are written by backend/scripts/deploy.js. Never edit them by hand.
export const MICROLOAN_ABI = Array.isArray(abiFile) ? abiFile : abiFile.abi;

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

// A provider that is guaranteed to be on Sepolia, or null.
// Prefers the shared Alchemy/Infura URL so reads work without a wallet.
export async function getSepoliaReader() {
  if (RPC_URL) return new ethers.JsonRpcProvider(RPC_URL, Number(SEPOLIA.chainId));
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

const KNOWN_ERRORS = {
  OwnableUnauthorizedAccount: "Only the contract owner can do this.",
  EnforcedPause: "The contract is already paused.",
  ExpectedPause: "The contract isn't paused.",
  PrincipalAboveLimit: "That amount is above the current loan limit.",
  DurationAboveLimit: "That due date is further out than the current limit allows.",
};

// ethers doesn't always decode custom errors (it depends on the RPC and wallet),
// so look for raw revert data in the usual places and decode it against the ABI.
function revertName(err) {
  if (err?.revert?.name) return err.revert.name;
  const candidates = [err?.data, err?.info?.error?.data, err?.info?.error?.data?.data, err?.error?.data];
  for (const data of candidates) {
    if (typeof data !== "string" || !data.startsWith("0x") || data.length < 10) continue;
    try {
      const parsed = iface.parseError(data);
      if (parsed) return parsed.name;
    } catch {
      // not one of ours
    }
  }
  return null;
}

// Turns an ethers v6 error into one plain sentence. Shared with the other UIs.
export function describeTxError(err) {
  if (err?.code === "ACTION_REJECTED" || err?.info?.error?.code === 4001) {
    return "You rejected the transaction in MetaMask.";
  }
  if (err?.code === "INSUFFICIENT_FUNDS") {
    return "This wallet doesn't have enough Sepolia ETH to pay for gas.";
  }
  const name = revertName(err);
  if (name && KNOWN_ERRORS[name]) return KNOWN_ERRORS[name];
  if (name) return `The contract rejected this (${name}).`;
  if (err?.reason) return err.reason;
  return err?.shortMessage || err?.message || "The transaction failed.";
}
