import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { ADMIN_FUNCTIONS as F, POLL_MS } from "../constants/adminConfig";
import { MICROLOAN_ABI, getContractAddress, getSepoliaReader, hasFunction } from "../lib/contract";

// For the borrower and lender pages: true while the contract is paused.
export function useContractPaused() {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const address = getContractAddress();
    if (!address || !hasFunction(F.paused)) return;
    let active = true;

    const check = async () => {
      try {
        const reader = await getSepoliaReader();
        if (!reader) return;
        const c = new ethers.Contract(address, MICROLOAN_ABI, reader);
        const value = await c.getFunction(F.paused)();
        if (active) setPaused(Boolean(value));
      } catch {
        // Keep the last known value; a flaky RPC call shouldn't flash the banner.
      }
    };

    check();
    const id = setInterval(check, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return paused;
}
