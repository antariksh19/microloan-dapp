import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { ADMIN_FUNCTIONS as F, POLL_MS } from "@/constants/adminConfig";
import {
  MICROLOAN_ABI,
  describeTxError,
  getContractAddress,
  getSepoliaReader,
  hasFunction,
  sameAddress,
} from "@/utils/web3Helpers";

const EMPTY = { admin: null, paused: null, maxLoanAmount: null, loanCount: null };

const READ_ERROR =
  "Couldn't read the contract. Check that contractAddress.json points at the Sepolia deployment.";

// Plain async read, no React state. Resolves to null when there's nothing to read yet.
async function readAdminState(address, supports) {
  if (!address) return null;
  const reader = await getSepoliaReader();
  if (!reader) return null;
  const c = new ethers.Contract(address, MICROLOAN_ABI, reader);
  const call = (ok, name) => (ok ? c.getFunction(name)() : Promise.resolve(null));
  const [admin, paused, maxLoanAmount, loanCount] = await Promise.all([
    call(supports.admin, F.admin),
    call(supports.pause, F.paused),
    call(supports.limit, F.maxLoanAmount),
    call(supports.loanCount, F.loanCounter),
  ]);
  return { admin, paused, maxLoanAmount, loanCount };
}

class StaleStateError extends Error {}

export function useAdminContract(wallet) {
  const address = useMemo(() => getContractAddress(), []);
  const supports = useMemo(
    () => ({
      admin: hasFunction(F.admin),
      pause: hasFunction(F.paused) && hasFunction(F.togglePause),
      limit: hasFunction(F.maxLoanAmount) && hasFunction(F.setMaxLoanAmount),
      loanCount: hasFunction(F.loanCounter),
    }),
    []
  );

  const [data, setData] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [readError, setReadError] = useState(null);
  const [pending, setPending] = useState(null); // { action, stage: "wallet" | "mining", hash? }
  const [lastTx, setLastTx] = useState(null); // { action, ok, hash?, message? }
  const busy = useRef(false); // blocks double-clicks before React re-renders

  // State only changes inside .then callbacks, never synchronously in the effect.
  const refresh = useCallback(
    () =>
      readAdminState(address, supports).then(
        (next) => {
          if (!next) return; // no Sepolia reader yet (wallet on another network)
          setData(next);
          setLoaded(true);
          setReadError(null);
        },
        () => setReadError(READ_ERROR)
      ),
    [address, supports]
  );

  // Read on load, whenever the wallet account or network changes, and on a timer.
  useEffect(() => {
    refresh();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [refresh, wallet.account, wallet.chainId]);

  const run = useCallback(
    async (action, fnName, args = [], precheck) => {
      if (busy.current) return;
      busy.current = true;
      setLastTx(null);
      setPending({ action, stage: "wallet" });
      let hash;
      try {
        const signer = await wallet.getSigner();
        const c = new ethers.Contract(address, MICROLOAN_ABI, signer);
        if (precheck) await precheck(c);
        const tx = await c.getFunction(fnName)(...args);
        hash = tx.hash;
        setPending({ action, stage: "mining", hash });
        await tx.wait(); // throws if the transaction reverts
        setLastTx({ action, ok: true, hash });
      } catch (e) {
        const message = e instanceof StaleStateError ? e.message : describeTxError(e);
        setLastTx({ action, ok: false, hash, message });
      } finally {
        await refresh();
        setPending(null);
        busy.current = false;
      }
    },
    [address, wallet, refresh]
  );

  // togglePause() flips the flag, so check the live value first. Otherwise a
  // stale page could "pause" a contract that someone else already paused,
  // which would actually resume it.
  const setPausedTo = useCallback(
    (target) =>
      run(target ? "pause" : "unpause", F.togglePause, [], async (c) => {
        const now = await c.getFunction(F.paused)();
        if (now === target) {
          throw new StaleStateError(
            `It's already ${target ? "paused" : "running"}. The page has been updated.`
          );
        }
      }),
    [run]
  );

  return {
    address,
    supports,
    ...data,
    loaded,
    readError,
    isAdmin: sameAddress(data.admin, wallet.account),
    pending,
    lastTx,
    clearLastTx: () => setLastTx(null),
    refresh,
    pause: () => setPausedTo(true),
    unpause: () => setPausedTo(false),
    setMaxLoanAmount: (wei) => run("limit", F.setMaxLoanAmount, [wei]),
  };
}
