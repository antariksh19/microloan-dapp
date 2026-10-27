
"use client";

import { ethers } from "ethers";
import PauseCard from "./PauseCard";
import LimitCard from "./LimitCard";
import TxNotice from "./TxNotice";
import { card, cardTitle, smallButton, link } from "./ui";
import { useAdminContract } from "@/hooks/useAdminContract";
import { addressUrl, shortAddress } from "@/utils/web3Helpers";

function getGate(wallet, admin) {
  if (!admin.address) {
    return {
      text: "No contract address found in src/constants/contractAddress.json.",
    };
  }

  if (wallet.hasWallet === false) {
    return {
      text: "Install MetaMask to manage the platform.",
      metamask: true,
    };
  }

  if (wallet.hasWallet === null) {
    return { text: "Looking for MetaMask…" };
  }

  if (!wallet.account) {
    return {
      text: "Connect the admin wallet to pause the platform or change the limit.",
    };
  }

  if (!wallet.onSepolia) {
    return {
      text: "MetaMask is on another network. Switch to Sepolia to continue.",
    };
  }

  if (!admin.loaded) {
    return { text: "Reading the contract…" };
  }

  if (admin.supports.admin && !admin.isAdmin) {
    return {
      text: `This wallet isn't the admin. Only ${shortAddress(
        admin.admin
      )} can make changes, so the controls are read-only.`,
    };
  }

  return null;
}

function WalletButton({ wallet }) {
  if (wallet.hasWallet === false || !wallet.account) return null;

  if (!wallet.onSepolia) {
    return (
      <button
        type="button"
        onClick={wallet.switchToSepolia}
        className={`${smallButton} bg-amber-600 hover:bg-amber-700`}
      >
        Switch to Sepolia
      </button>
    );
  }

  return null;
}

function StatCard({ title, value, note, noteClass = "text-slate-400" }) {
  return (
    <div className={`${card} min-w-0`}>
      <p className="text-xs font-semibold text-slate-400">{title}</p>

      <h3 className="mt-3 break-words text-2xl font-bold text-white">
        {value}
      </h3>

      <p className={`mt-2 text-xs font-medium ${noteClass}`}>{note}</p>
    </div>
  );
}

export default function AdminDashboard({ wallet }) {
  const admin = useAdminContract(wallet);
  const gate = getGate(wallet, admin);
  const canAct = !gate && !admin.pending;
  const pendingAction = admin.pending?.action ?? null;

  const status =
    admin.paused === null
      ? {
          value: "Unknown",
          note: "Not read yet",
          cls: "text-slate-300",
        }
      : admin.paused
        ? {
            value: "Paused",
            note: "All loan actions blocked",
            cls: "text-amber-300",
          }
        : {
            value: "Running",
            note: "Accepting loan activity",
            cls: "text-emerald-400",
          };

  return (
    <div className="space-y-6 text-slate-100">
      <WalletButton wallet={wallet} />

      {gate && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm font-medium text-slate-200">
          <span>{gate.text}</span>

          {gate.metamask && (
            <a
              className={`${smallButton} bg-violet-600 text-white hover:bg-violet-700`}
              href="https://metamask.io/download/"
              target="_blank"
              rel="noreferrer"
            >
              Get MetaMask
            </a>
          )}
        </div>
      )}

      {wallet.error && (
        <div
          className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-sm font-medium text-rose-200"
          role="alert"
        >
          {wallet.error}
        </div>
      )}

      {admin.readError && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-sm font-medium text-rose-200"
          role="alert"
        >
          <span>{admin.readError}</span>

          <button
            type="button"
            onClick={admin.refresh}
            className="cursor-pointer font-semibold text-rose-200 hover:text-white"
          >
            Try again
          </button>
        </div>
      )}

      <TxNotice
        pending={admin.pending}
        lastTx={admin.lastTx}
        onDismiss={admin.clearLastTx}
      />

      <section className="grid gap-5 sm:grid-cols-3">
        <StatCard
          title="Platform Status"
          value={status.value}
          note={status.note}
          noteClass={status.cls}
        />

        <StatCard
          title="Maximum Loan"
          value={
            admin.maxLoanAmount === null
              ? "Loading…"
              : `${ethers.formatEther(admin.maxLoanAmount)} ETH`
          }
          note="Per loan request"
          noteClass="text-violet-300"
        />

        <StatCard
          title="Total Loans"
          value={
            admin.loanCount === null
              ? "Loading…"
              : admin.loanCount.toString()
          }
          note="Created on this contract"
        />
      </section>

      <section className="grid items-start gap-6 lg:grid-cols-2">
        <PauseCard
          paused={admin.paused}
          supported={admin.supports.pause}
          canAct={canAct}
          pendingAction={pendingAction}
          onPause={admin.pause}
          onUnpause={admin.unpause}
        />

        <LimitCard
          key={
            admin.lastTx?.ok && admin.lastTx.action === "limit"
              ? admin.lastTx.hash
              : "limit"
          }
          maxLoanAmount={admin.maxLoanAmount}
          supported={admin.supports.limit}
          canAct={canAct}
          pendingAction={pendingAction}
          onSave={admin.setMaxLoanAmount}
        />
      </section>

      <section className={`${card} min-w-0`}>
        <h3 className={cardTitle}>Contract Details</h3>

        <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-3">
          <div className="min-w-0">
            <dt className="text-xs font-semibold text-slate-400">
              Contract
            </dt>

            <dd className="mt-2 break-all font-mono text-slate-100">
              {admin.address ? (
                <a
                  className={link}
                  href={addressUrl(admin.address)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {admin.address}
                </a>
              ) : (
                <span className="text-slate-400">Not set</span>
              )}
            </dd>
          </div>

          <div className="min-w-0">
            <dt className="text-xs font-semibold text-slate-400">
              Admin
            </dt>

            <dd className="mt-2 break-all font-mono text-slate-100">
              {admin.admin ?? "Unknown"}
            </dd>
          </div>

          <div className="min-w-0">
            <dt className="text-xs font-semibold text-slate-400">
              Network
            </dt>

            <dd className="mt-2 text-slate-100">
              Sepolia Testnet
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
