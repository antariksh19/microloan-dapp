"use client";
import { useCallback, useState } from "react";
import { ethers } from "ethers";
import { MICROLOAN_ABI, describeTxError, getContractAddress } from "@/utils/web3Helpers";

// Runs one contract write end to end: wallet prompt, waiting for the block, then a refresh.
// `busy` holds the key of the action in flight so only that button shows progress.
export function useTxRunner({ getSigner, onSepolia, reload }) {
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null); // { tone, text, hash }

  const run = useCallback(
    async (key, successText, call) => {
      if (!onSepolia) {
        setNotice({ tone: "error", text: "Switch MetaMask to Sepolia first." });
        return false;
      }
      const address = getContractAddress();
      if (!address) {
        setNotice({ tone: "error", text: "No contract address is set. Add it to src/constants/contractAddress.json." });
        return false;
      }
      setBusy(key);
      setNotice({ tone: "info", text: "Confirm the transaction in MetaMask." });
      try {
        const signer = await getSigner();
        const contract = new ethers.Contract(address, MICROLOAN_ABI, signer);
        const tx = await call(contract);
        setNotice({ tone: "info", text: "Waiting for Sepolia to confirm. This usually takes under a minute.", hash: tx.hash });
        await tx.wait();
        setNotice({ tone: "success", text: successText, hash: tx.hash });
        await reload();
        return true;
      } catch (err) {
        setNotice({ tone: "error", text: describeTxError(err) });
        return false;
      } finally {
        setBusy(null);
      }
    },
    [getSigner, onSepolia, reload]
  );

  const clear = useCallback(() => setNotice(null), []);
  return { busy, notice, run, clear };
}
