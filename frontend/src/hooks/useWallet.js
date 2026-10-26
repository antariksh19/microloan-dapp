"use client";
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { SEPOLIA } from "@/constants/adminConfig";

export function useWallet() {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [walletError, setWalletError] = useState("");
  // null until we are on the client and know whether MetaMask exists.
  const [hasWallet, setHasWallet] = useState(null);

  // Memoized so consumers' effects don't re-run on every render.
  const getProvider = useCallback(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    }
    throw new Error("MetaMask is not installed.");
  }, []);

  const getSigner = useCallback(() => getProvider().getSigner(), [getProvider]);

  const switchToSepolia = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA.hexChainId }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: SEPOLIA.hexChainId,
              chainName: "Sepolia Test Network",
              nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://rpc.sepolia.org"],
              blockExplorerUrls: [SEPOLIA.explorer],
            },
          ],
        });
      } else {
        setWalletError(switchError.message || "Could not switch network.");
      }
    }
  }, []);

  const connectWallet = useCallback(async () => {
    try {
      setWalletError("");
      setConnecting(true);
      if (!window.ethereum) throw new Error("MetaMask not found.");
      const provider = getProvider();
      const network = await provider.getNetwork();
      if (network.chainId !== SEPOLIA.chainId) await switchToSepolia();
      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts.length > 0) setAccount(accounts[0]);
      setChainId((await getProvider().getNetwork()).chainId);
    } catch (err) {
      setWalletError(err.code === "ACTION_REJECTED" || err.code === 4001 ? "Connection request rejected." : err.message || "Wallet connection failed.");
    } finally {
      setConnecting(false);
    }
  }, [getProvider, switchToSepolia]);

  useEffect(() => {
    const eth = typeof window !== "undefined" ? window.ethereum : null;
    setHasWallet(Boolean(eth));
    if (!eth) return;

    (async () => {
      try {
        const provider = getProvider();
        const accounts = await provider.send("eth_accounts", []);
        if (accounts.length > 0) setAccount(accounts[0]);
        setChainId((await provider.getNetwork()).chainId);
      } catch (e) {
        console.error("Connection check failed", e);
      }
    })();

    const handleAccountsChanged = (accounts) => setAccount(accounts.length > 0 ? accounts[0] : "");
    // Track the new chain in state instead of reloading the page.
    const handleChainChanged = (hex) => setChainId(BigInt(hex));

    eth.on("accountsChanged", handleAccountsChanged);
    eth.on("chainChanged", handleChainChanged);
    return () => {
      eth.removeListener("accountsChanged", handleAccountsChanged);
      eth.removeListener("chainChanged", handleChainChanged);
    };
  }, [getProvider]);

  return {
    account,
    chainId,
    onSepolia: chainId === SEPOLIA.chainId,
    hasWallet,
    connecting,
    connect: connectWallet,
    connectWallet,
    getSigner,
    getProvider,
    switchToSepolia,
    error: walletError,
    walletError,
    setWalletError,
  };
}