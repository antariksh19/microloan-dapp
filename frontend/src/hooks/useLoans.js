"use client";
import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { POLL_MS } from "@/constants/adminConfig";
import { MICROLOAN_ABI, getContractAddress, getSepoliaReader } from "@/utils/web3Helpers";

// Reads every loan from the contract (and the wallet balance), and refreshes on a timer.
// Works without a connected wallet when NEXT_PUBLIC_SEPOLIA_RPC_URL is set.
export function useLoans(account, chainId) {
  const [loans, setLoans] = useState([]);
  const [maxLoanWei, setMaxLoanWei] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    const address = getContractAddress();
    if (!address) {
      setError("No contract address is set. Add it to src/constants/contractAddress.json.");
      return;
    }
    try {
      const reader = await getSepoliaReader();
      if (!reader) {
        // Wallet is on another network and there's no shared RPC URL to fall back on.
        setLoans([]);
        setBalance(null);
        setError("");
        return;
      }
      const contract = new ethers.Contract(address, MICROLOAN_ABI, reader);
      const [count, max] = await Promise.all([contract.loanCounter(), contract.maxLoanAmount()]);
      const ids = Array.from({ length: Number(count) }, (_, i) => i + 1);
      const raw = await Promise.all(ids.map((id) => contract.loans(id)));
      setLoans(
        raw.map((l, i) => ({
          id: ids[i],
          borrower: l.borrower,
          lender: l.lender,
          principalWei: l.principal,
          repaymentWei: l.repayment,
          dueTs: Number(l.dueDate),
          status: Number(l.status),
        }))
      );
      setMaxLoanWei(max);
      setBalance(account ? await reader.getBalance(account) : null);
      setError("");
      setLoaded(true);
    } catch (err) {
      console.error(err);
      setError("Couldn't read loans from Sepolia. Check your connection. We'll keep retrying.");
    }
  }, [account]);

  useEffect(() => {
    reload();
    const id = setInterval(reload, POLL_MS);
    return () => clearInterval(id);
  }, [reload, chainId]);

  return { loans, maxLoanWei, balance, loaded, error, reload };
}
