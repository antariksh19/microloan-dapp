"use client";
import { useState } from "react";
import { shortAddress } from "@/utils/web3Helpers";
import { btn } from "./styles";

// One button that covers every wallet state: no MetaMask, not connected, wrong network, connected.
export default function WalletButton({ wallet }) {
  const [copied, setCopied] = useState(false);

  if (wallet.hasWallet === null) return <span className="h-10 w-36 rounded-lg bg-line/60" aria-hidden />;

  if (wallet.hasWallet === false) {
    return (
      <a className={btn("ink")} href="https://metamask.io/download/" target="_blank" rel="noreferrer">
        Install MetaMask
      </a>
    );
  }

  if (!wallet.account) {
    return (
      <button type="button" onClick={wallet.connect} disabled={wallet.connecting} className={btn("ink")}>
        {wallet.connecting ? "Check MetaMask…" : "Connect wallet"}
      </button>
    );
  }

  if (!wallet.onSepolia) {
    return (
      <button type="button" onClick={wallet.switchToSepolia} className={btn("danger")}>
        Switch to Sepolia
      </button>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(wallet.account);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked; the address is still readable on screen.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy address"
      className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-paper px-3.5 py-2.5 font-mono text-sm font-medium text-ink hover:bg-fog"
    >
      <span aria-hidden className="h-2 w-2 rounded-full bg-lagoon" />
      {copied ? "Address copied" : shortAddress(wallet.account)}
    </button>
  );
}
