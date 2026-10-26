"use client";
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

const SEPOLIA_CHAIN_ID = "0xaa36a7";

export function useWallet() {
  const [account, setAccount] = useState("");
  const [walletError, setWalletError] = useState("");

  // Memoize to prevent infinite re-renders in consumer components
  const getProvider = useCallback(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    }
    throw new Error("MetaMask is not installed.");
  }, []);

  const switchToSepolia = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_CHAIN_ID }] });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{ 
            chainId: SEPOLIA_CHAIN_ID, 
            chainName: "Sepolia Test Network", 
            nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 }, 
            rpcUrls: ["https://sepolia.infura.io/v3/"], 
            blockExplorerUrls: ["https://sepolia.etherscan.io"] 
          }],
        });
      } else {
        throw switchError;
      }
    }
  }, []);

  const connectWallet = useCallback(async () => {
    try {
      setWalletError("");
      if (!window.ethereum) throw new Error("MetaMask not found.");
      
      const provider = getProvider();
      const network = await provider.getNetwork();
      if (network.chainId !== 11155111n) {
        await switchToSepolia();
      }

      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts.length > 0) setAccount(accounts[0]);
    } catch (err) {
      setWalletError(err.message || "Wallet connection failed.");
    }
  }, [getProvider, switchToSepolia]);

  useEffect(() => {
    if (!window.ethereum) return;

    const checkConnection = async () => {
      try {
        const provider = getProvider();
        const accounts = await provider.send("eth_accounts", []);
        if (accounts.length > 0) setAccount(accounts[0]);
      } catch (e) {
        console.error("Connection check failed", e);
      }
    };
    checkConnection();

    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) setAccount(accounts[0]);
      else setAccount("");
    };
    const handleChainChanged = () => window.location.reload();

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [getProvider]);

  return { account, connectWallet, walletError, setWalletError, getProvider, switchToSepolia };
}