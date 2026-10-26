import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ethers } from "ethers";
import { SEPOLIA } from "@/constants/adminConfig";

const noSubscribe = () => () => {};

export function useWallet() {
  // null on the server, true/false in the browser. Avoids a hydration mismatch.
  const hasWallet = useSyncExternalStore(
    noSubscribe,
    () => Boolean(window.ethereum),
    () => null
  );
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const eth = window.ethereum;
    if (!eth) return;

    // eth_accounts never opens a popup; it only returns already-approved accounts.
    eth.request({ method: "eth_accounts" }).then((a) => setAccount(a[0] ?? null)).catch(() => {});
    eth.request({ method: "eth_chainId" }).then((id) => setChainId(BigInt(id))).catch(() => {});

    const onAccounts = (a) => setAccount(a[0] ?? null);
    const onChain = (id) => setChainId(BigInt(id));
    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) return;
    setConnecting(true);
    setError(null);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0] ?? null);
    } catch (e) {
      if (e?.code === 4001) setError("You declined the connection request.");
      else if (e?.code === -32002) setError("MetaMask already has a request open. Check the extension.");
      else setError(e?.message || "Couldn't connect to MetaMask.");
    } finally {
      setConnecting(false);
    }
  }, []);

  const switchToSepolia = useCallback(async () => {
    setError(null);
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA.hexChainId }],
      });
    } catch (e) {
      setError(
        e?.code === 4001
          ? "You declined the network switch."
          : "Couldn't switch networks. Turn on test networks in MetaMask settings, then pick Sepolia."
      );
    }
  }, []);

  // A fresh provider each time, so a network change never leaves a stale one behind.
  const getSigner = useCallback(async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    return provider.getSigner();
  }, []);

  return {
    hasWallet,
    account,
    chainId,
    onSepolia: chainId === SEPOLIA.chainId,
    connecting,
    error,
    connect,
    switchToSepolia,
    getSigner,
  };
}
