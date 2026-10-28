"use client";
import { useCallback, useState } from "react";
import { ethers } from "ethers";
import { toast } from "sonner";
import { MICROLOAN_ABI, describeTxError, getContractAddress } from "@/utils/web3Helpers";

// Runs one contract write end to end: wallet prompt, waiting for the block, then a refresh.
// `busy` holds the key of the action in flight so only that button shows progress.
export function useTxRunner({ getSigner, account, onSepolia, reload }) {
  const [busy, setBusy] = useState(null);

  const run = useCallback(
    async (key, { pending, success }, call) => {
      if (!account) {
        toast.error("Connect your wallet first.");
        return false;
      }
      if (!onSepolia) {
        toast.error("Switch MetaMask to Sepolia first.");
        return false;
      }
      const address = getContractAddress();
      if (!address) {
        toast.error("No contract address is set. Add it to src/constants/contractAddress.json.");
        return false;
      }
      setBusy(key);
      const id = toast.loading("Confirm the transaction in MetaMask.");
      try {
        const signer = await getSigner();
        const contract = new ethers.Contract(address, MICROLOAN_ABI, signer);
        const tx = await call(contract);
        toast.loading(pending, { id });
        await tx.wait(); // throws if the transaction reverts
        toast.success(success, { id });
        await reload();
        return true;
      } catch (err) {
        toast.error(describeTxError(err), { id });
        return false;
      } finally {
        setBusy(null);
      }
    },
    [getSigner, account, onSepolia, reload]
  );

  return { busy, run };
}
