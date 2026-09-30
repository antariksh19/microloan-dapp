import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { ADMIN_FUNCTIONS as F, POLL_MS } from "../constants/adminConfig";
import {
  MICROLOAN_ABI,
  describeTxError,
  getContractAddress,
  getSepoliaReader,
  hasFunction,
  sameAddress,
} from "../lib/contract";

const EMPTY = { owner: null, paused: null, maxPrincipal: null, maxDuration: null };

export function useAdminContract(wallet) {
  const address = useMemo(() => getContractAddress(), []);
  const supports = useMemo(
    () => ({
      owner: hasFunction(F.owner),
      pause: hasFunction(F.paused) && hasFunction(F.pause) && hasFunction(F.unpause),
      limits: hasFunction(F.maxPrincipal) && hasFunction(F.maxDuration) && hasFunction(F.setLimits),
    }),
    []
  );

  const [data, setData] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [readError, setReadError] = useState(null);
  const [pending, setPending] = useState(null); // { action, stage: "wallet" | "mining", hash? }
  const [lastTx, setLastTx] = useState(null); // { action, ok, hash?, message? }
  const busy = useRef(false); // blocks double-clicks before React re-renders

  // Reads only; state is set in the .then handlers below, never synchronously.
  const read = useCallback(async () => {
    if (!address) return null;
    const reader = await getSepoliaReader();
    if (!reader) return null; // wallet is on another network and no RPC URL is set
    const c = new ethers.Contract(address, MICROLOAN_ABI, reader);
    const call = (ok, name) => (ok ? c.getFunction(name)() : Promise.resolve(null));
    const [owner, paused, maxPrincipal, maxDuration] = await Promise.all([
      call(supports.owner, F.owner),
      call(supports.pause, F.paused),
      call(supports.limits, F.maxPrincipal),
      call(supports.limits, F.maxDuration),
    ]);
    return { owner, paused, maxPrincipal, maxDuration };
  }, [address, supports]);

  const onRead = useCallback((next) => {
    if (!next) return;
    setData(next);
    setLoaded(true);
    setReadError(null);
  }, []);

  const onReadError = useCallback(() => {
    setReadError(
      "Couldn't read the contract. Check that contractAddress.json points at the Sepolia deployment."
    );
  }, []);

  const refresh = useCallback(() => read().then(onRead, onReadError), [read, onRead, onReadError]);

  // Read on load, whenever the wallet account or network changes, and on a timer.
  useEffect(() => {
    refresh();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [refresh, wallet.account, wallet.chainId]);

  const run = useCallback(
    async (action, fnName, args = []) => {
      if (busy.current) return;
      busy.current = true;
      setLastTx(null);
      setPending({ action, stage: "wallet" });
      let hash;
      try {
        const signer = await wallet.getSigner();
        const c = new ethers.Contract(address, MICROLOAN_ABI, signer);
        const tx = await c.getFunction(fnName)(...args);
        hash = tx.hash;
        setPending({ action, stage: "mining", hash });
        await tx.wait(); // throws if the transaction reverts
        setLastTx({ action, ok: true, hash });
        await refresh();
      } catch (e) {
        setLastTx({ action, ok: false, hash, message: describeTxError(e) });
      } finally {
        setPending(null);
        busy.current = false;
      }
    },
    [address, wallet, refresh]
  );

  return {
    address,
    supports,
    ...data,
    loaded,
    readError,
    isOwner: sameAddress(data.owner, wallet.account),
    pending,
    lastTx,
    clearLastTx: () => setLastTx(null),
    refresh,
    pause: () => run("pause", F.pause),
    unpause: () => run("unpause", F.unpause),
    setLimits: (maxPrincipalWei, maxDurationSec) =>
      run("limits", F.setLimits, [maxPrincipalWei, maxDurationSec]),
  };
}
