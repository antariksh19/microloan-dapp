"use client";

import { ethers } from "ethers";
import PauseCard from "./PauseCard";
import LimitCard from "./LimitCard";
import TxNotice from "./TxNotice";
import { card, cardTitle, smallButton, link } from "./ui";
import { useWallet } from "@/hooks/useWallet";
import { useAdminContract } from "@/hooks/useAdminContract";
import { addressUrl, shortAddress } from "@/utils/web3Helpers";

// Works out why controls are locked, if they are.
function getGate(wallet, admin) {
  if (!admin.address) {
    return { text: "No contract address found in src/constants/contractAddress.json." };
  }
  if (wallet.hasWallet === false) return { text: "Install MetaMask to manage the platform.", metamask: true };
  if (wallet.hasWallet === null) return { text: "Looking for MetaMask…" };
  if (!wallet.account) return { text: "Connect the admin wallet to pause the platform or change the limit." };
  if (!wallet.onSepolia) return { text: "MetaMask is on another network. Switch to Sepolia to continue." };
  if (!admin.loaded) return { text: "Reading the contract…" };
  if (admin.supports.admin && !admin.isAdmin) {
    return {
      text: `This wallet isn't the admin. Only ${shortAddress(admin.admin)} can make changes, so the controls are read-only.`,
    };
  }
  return null;
}

function WalletButton({ wallet }) {
  if (wallet.hasWallet === false) return null;
  if (!wallet.account) {
    return (
      <button
        type="button"
        onClick={wallet.connect}
        disabled={wallet.connecting}
        className={`${smallButton} bg-blue-600 hover:bg-blue-700`}
      >
        {wallet.connecting ? "Waiting for MetaMask…" : "Connect Wallet"}
      </button>
    );
  }
  if (!wallet.onSepolia) {
    return (
      <button type="button" onClick={wallet.switchToSepolia} className={`${smallButton} bg-amber-600 hover:bg-amber-700`}>
        Switch to Sepolia
      </button>
    );
  }
  return (
    <span className="px-5 py-2.5 bg-blue-50 text-blue-700 font-medium text-sm rounded-lg border border-blue-100">
      {shortAddress(wallet.account)} ✓
    </span>
  );
}

function StatCard({ title, value, note, noteClass = "text-slate-500" }) {
  return (
    <div className={card}>
      <p className="text-xs font-semibold text-slate-500">{title}</p>
      <h3 className="mt-2 text-2xl font-bold text-slate-900">{value}</h3>
      <p className={`mt-2 text-xs font-medium ${noteClass}`}>{note}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const wallet = useWallet();
  const admin = useAdminContract(wallet);
  const gate = getGate(wallet, admin);
  const canAct = !gate && !admin.pending;
  const pendingAction = admin.pending?.action ?? null;

  const status =
    admin.paused === null
      ? { value: "Unknown", note: "Not read yet", cls: "text-slate-500" }
      : admin.paused
        ? { value: "Paused", note: "All loan actions blocked", cls: "text-amber-600" }
        : { value: "Running", note: "Accepting loan activity", cls: "text-emerald-600" };

  return (
    <div className="min-h-screen bg-[#f3f6f9] text-slate-800 font-sans">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 bg-[#0b1329] md:block text-white">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight">MicroLoan</h1>
          <p className="text-xs text-slate-400 mt-1">Admin Portal</p>
        </div>
        <nav className="mt-4 px-3 space-y-1">
          <span className="block w-full px-4 py-3 text-left text-sm rounded-xl bg-blue-600 text-white font-semibold">
            Platform Controls
          </span>
        </nav>
      </aside>

      <main className="min-h-screen md:ml-64 p-4 sm:p-8 space-y-6">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white px-6 py-5 rounded-2xl border border-slate-200/80 shadow-xs gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2>
            <p className="text-sm text-slate-500 mt-0.5">Pause the platform and set the maximum loan amount</p>
          </div>
          <WalletButton wallet={wallet} />
        </header>

        {gate && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 font-medium flex flex-wrap items-center justify-between gap-3">
            <span>{gate.text}</span>
            {gate.metamask && (
              <a className={`${smallButton} bg-blue-600 hover:bg-blue-700`} href="https://metamask.io/download/" target="_blank" rel="noreferrer">
                Get MetaMask
              </a>
            )}
          </div>
        )}

        {wallet.error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 font-medium" role="alert">
            {wallet.error}
          </div>
        )}

        {admin.readError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 font-medium flex flex-wrap items-center justify-between gap-3" role="alert">
            <span>{admin.readError}</span>
            <button type="button" onClick={admin.refresh} className="font-semibold cursor-pointer hover:opacity-70">
              Try again
            </button>
          </div>
        )}

        <TxNotice pending={admin.pending} lastTx={admin.lastTx} onDismiss={admin.clearLastTx} />

        <section className="grid gap-5 sm:grid-cols-3">
          <StatCard title="Platform Status" value={status.value} note={status.note} noteClass={status.cls} />
          <StatCard
            title="Maximum Loan"
            value={admin.maxLoanAmount === null ? "–" : `${ethers.formatEther(admin.maxLoanAmount)} ETH`}
            note="Per loan request"
            noteClass="text-blue-600"
          />
          <StatCard
            title="Total Loans"
            value={admin.loanCount === null ? "–" : admin.loanCount.toString()}
            note="Created on this contract"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2 items-start">
          <PauseCard
            paused={admin.paused}
            supported={admin.supports.pause}
            canAct={canAct}
            pendingAction={pendingAction}
            onPause={admin.pause}
            onUnpause={admin.unpause}
          />
          <LimitCard
            key={admin.lastTx?.ok && admin.lastTx.action === "limit" ? admin.lastTx.hash : "limit"}
            maxLoanAmount={admin.maxLoanAmount}
            supported={admin.supports.limit}
            canAct={canAct}
            pendingAction={pendingAction}
            onSave={admin.setMaxLoanAmount}
          />
        </section>

        <section className={card}>
          <h3 className={cardTitle}>Contract Details</h3>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <dt className="text-xs font-semibold text-slate-500">Contract</dt>
              <dd className="mt-1 font-mono text-slate-900 break-all">
                {admin.address ? (
                  <a className={link} href={addressUrl(admin.address)} target="_blank" rel="noreferrer">
                    {admin.address}
                  </a>
                ) : (
                  "Not set"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">Admin</dt>
              <dd className="mt-1 font-mono text-slate-900 break-all">{admin.admin ?? "Unknown"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">Network</dt>
              <dd className="mt-1 text-slate-900">Sepolia testnet</dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  );
}
