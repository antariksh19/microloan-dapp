"use client";
import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { POLL_MS } from "@/constants/adminConfig";
import { MICROLOAN_ABI, getContractAddress, getSepoliaReader } from "@/utils/web3Helpers";

const NO_ADDRESS = "No contract address is set. Add it to src/constants/contractAddress.json.";
const READ_FAILED = "Couldn't read loans from Sepolia. Check your connection. We'll keep retrying.";

// Plain async read, no React state. Resolves to null when there is no Sepolia
// reader (no shared RPC URL and the wallet is missing or on another network).
async function readLoans(address, account) {
  const reader = await getSepoliaReader();
  if (!reader) return null;
  const contract = new ethers.Contract(address, MICROLOAN_ABI, reader);
  const [count, maxLoanWei, balance, claimableWei] = await Promise.all([
    contract.loanCounter(),
    contract.maxLoanAmount(),
    account ? reader.getBalance(account) : null,
    account ? contract.pendingWithdrawals(account) : null,
  ]);
  const ids = Array.from({ length: Number(count) }, (_, i) => i + 1);
  const raw = await Promise.all(ids.map((id) => contract.loans(id)));
  const loans = raw.map((l, i) => ({
    id: ids[i],
    borrower: l.borrower,
    lender: l.lender,
    principalWei: l.principal,
    repaymentWei: l.repayment,
    duration: Number(l.duration),
    dueTs: Number(l.dueDate),
    status: Number(l.status),
  }));
  return { loans, maxLoanWei, balance, claimableWei };
}

const EMPTY = { loans: [], maxLoanWei: null, balance: null, claimableWei: null };

// Reads every loan from the contract (plus the wallet's balance and claimable
// repayments) and refreshes on a timer. Works without a wallet when
// NEXT_PUBLIC_SEPOLIA_RPC_URL is set; otherwise `unavailable` is true until one connects.
export function useLoans(account, chainId) {
  const [data, setData] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState("");

  // State only changes inside .then callbacks, never synchronously in the effect.
  const reload = useCallback(() => {
    const address = getContractAddress();
    return Promise.resolve(address ? readLoans(address, account) : Promise.reject(new Error(NO_ADDRESS))).then(
      (next) => {
        setUnavailable(!next);
        setData(next ?? EMPTY);
        setLoaded(Boolean(next));
        setError("");
      },
      (err) => {
        console.error(err);
        setError(err.message === NO_ADDRESS ? NO_ADDRESS : READ_FAILED);
      }
    );
  }, [account]);

  useEffect(() => {
    reload();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") reload();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [reload, chainId]);

  return { ...data, loaded, unavailable, error, reload };
}
