"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { ShieldAlert, Settings2, Activity } from "lucide-react";
import SharedLayout from "@/components/SharedLayout";
import { ActionButton, StatCard, StatGrid } from "@/components/ui/Dashboard";
import { fmtEth, parseEthInput } from "@/components/ui/format";
import { useWallet } from "@/hooks/useWallet";
import { useAdminContract } from "@/hooks/useAdminContract";
import { addressUrl, shortAddress, txUrl } from "@/utils/web3Helpers";

const ACTION_LABEL = { pause: "Pause", unpause: "Resume", limit: "Limit update" };

// Works out why the controls are locked, if they are. Returns { text, action? } or null.
function getGate(wallet, admin) {
  if (!admin.address) return { text: "No contract address is set. Add it to src/constants/contractAddress.json." };
  if (wallet.hasWallet === false) return { text: "Install MetaMask to manage the platform." };
  if (!wallet.account) return { text: "Connect the admin wallet to pause the platform or change the limit.", action: { label: "Connect wallet", onClick: wallet.connectWallet } };
  if (!wallet.onSepolia) return { text: "MetaMask is on another network. Switch to Sepolia to continue.", action: { label: "Switch to Sepolia", onClick: wallet.switchToSepolia } };
  if (admin.readError) return { text: admin.readError };
  if (!admin.loaded) return { text: "Reading the contract..." };
  if (!admin.isAdmin) return { text: `This wallet isn't the admin. Only ${shortAddress(admin.admin)} can make changes, so the controls are read-only.` };
  return null;
}

export default function AdminPage() {
  const wallet = useWallet();
  const admin = useAdminContract(wallet);
  const [newMax, setNewMax] = useState("");
  const [limitError, setLimitError] = useState("");

  const gate = getGate(wallet, admin);
  const canAct = !gate && !admin.pending;
  const busy = admin.pending?.action;

  const updateLimit = () => {
    const wei = parseEthInput(newMax);
    if (wei === null || wei === 0n) return setLimitError("Enter an amount above zero. To stop new loans, pause instead.");
    if (wei === admin.maxLoanAmount) return setLimitError("That's already the limit.");
    setLimitError("");
    admin.setMaxLoanAmount(wei).then((ok) => ok && setNewMax(""));
  };

  const paused = admin.paused;
  const maxLoanEth = admin.maxLoanAmount === null ? null : Number(ethers.formatEther(admin.maxLoanAmount));

  return (
    <SharedLayout
      account={wallet.account}
      onConnect={wallet.connectWallet}
      wrongNetwork={Boolean(wallet.account) && !wallet.onSepolia}
      onSwitchNetwork={wallet.switchToSepolia}
      error={wallet.walletError}
      title="Protocol Administration"
      subtitle="Manage global parameters and emergency protocol controls"
    >
      <StatGrid columns="sm:grid-cols-3">
        <StatCard
          label="Status"
          icon={<Activity className="w-4 h-4 text-emerald-400" />}
          value={paused === null ? "..." : paused ? "Paused" : "Running"}
          accent={paused ? "rose" : "emerald"}
          badge={paused === null ? null : paused ? "New requests and funding halted" : "Accepting activity"}
        />
        <StatCard
          label="Max Loan"
          icon={<Settings2 className="w-4 h-4 text-blue-400" />}
          value={maxLoanEth ?? "..."}
          decimals={maxLoanEth !== null && maxLoanEth % 1 ? 4 : 0}
          unit="ETH"
          badge="Per request limit"
          accent="blue"
        />
        <StatCard
          label="Total Contract Loans"
          value={admin.loanCount === null ? "..." : Number(admin.loanCount)}
          badge="Lifetime requests"
          accent="indigo"
        />
      </StatGrid>

      {gate && (
        <div className="mb-8 rounded-2xl p-4 text-sm border border-white/10 bg-slate-900/60 text-slate-300 flex flex-wrap items-center justify-between gap-3">
          <span>{gate.text}</span>
          {gate.action && <ActionButton onClick={gate.action.onClick}>{gate.action.label}</ActionButton>}
        </div>
      )}

      {admin.lastTx && (
        <div className={`mb-8 rounded-2xl p-4 text-sm border flex flex-wrap items-center justify-between gap-3 ${admin.lastTx.ok ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-rose-500/20 bg-rose-500/10 text-rose-300"}`}>
          <span>
            {ACTION_LABEL[admin.lastTx.action]} {admin.lastTx.ok ? "confirmed on Sepolia." : `failed: ${admin.lastTx.message}`}
            {admin.lastTx.hash && (
              <> <a href={txUrl(admin.lastTx.hash)} target="_blank" rel="noreferrer" className="underline">View transaction</a></>
            )}
          </span>
          <button onClick={admin.clearLastTx} aria-label="Dismiss" className="text-lg leading-none opacity-70 hover:opacity-100">&times;</button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8 mb-10">
        <section className="glass-card rounded-3xl p-8 border border-white/10 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl" />
          <h3 className="text-xl font-bold text-white flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-rose-400" /> Protocol Pause</h3>
          <p className="text-xs text-slate-400 mt-1 mb-6">Halt new loan requests and funding during emergency investigations.</p>
          <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-5 mb-6">
            <p className="text-xs text-slate-300 leading-relaxed">
              While paused, nobody can request or fund a loan. Borrowers can still cancel requests, withdraw funded loans and
              repay, lenders can still reclaim expired funding and withdraw repayments, and overdue loans can still be marked
              as defaulted.
            </p>
          </div>
          <ActionButton
            variant={paused ? "success" : "danger"}
            className="w-full py-3.5 rounded-2xl uppercase tracking-wider"
            disabled={!canAct || paused === null}
            busy={busy === "pause" || busy === "unpause"}
            busyText={admin.pending?.stage === "mining" ? "Waiting for Sepolia..." : "Confirm in MetaMask..."}
            onClick={paused ? admin.unpause : admin.pause}
          >
            {paused ? "Resume Protocol" : "Pause Protocol"}
          </ActionButton>
        </section>

        <section className="glass-card rounded-3xl p-8 border border-white/10">
          <h3 className="text-xl font-bold text-white mb-1">Maximum Loan Amount</h3>
          <p className="text-xs text-slate-400 mb-6">Restrict the maximum ETH borrowers can request in a single loan.</p>
          <div className="space-y-5">
            <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-white/5">
              <span className="text-sm font-medium text-slate-300">Current Limit</span>
              <span className="text-sm font-bold text-blue-400 font-mono">{admin.maxLoanAmount === null ? "..." : `${fmtEth(admin.maxLoanAmount)} ETH`}</span>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label htmlFor="new-max" className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Maximum (ETH)</label>
                <div className="flex gap-2">
                  {["1", "5", "10"].map((val) => (
                    <button key={val} onClick={() => setNewMax(val)} className="text-[10px] font-bold font-mono bg-white/5 hover:bg-white/10 text-slate-300 px-2 py-1 rounded-md transition-colors active:scale-95">{val} ETH</button>
                  ))}
                </div>
              </div>
              <input
                id="new-max"
                inputMode="decimal"
                value={newMax}
                onChange={(e) => { setNewMax(e.target.value); setLimitError(""); }}
                placeholder={admin.maxLoanAmount === null ? "" : fmtEth(admin.maxLoanAmount)}
                className="w-full px-4 py-3 glass-input rounded-2xl text-sm mb-2 font-mono"
              />
              {limitError ? (
                <p className="text-[11px] text-rose-400 mb-4">{limitError}</p>
              ) : (
                <p className="text-[10px] text-slate-500 mb-4">Applies to new requests only. Existing loans are unaffected.</p>
              )}
            </div>
            <ActionButton
              variant="ghost"
              className="w-full py-3.5 rounded-2xl uppercase tracking-wider text-white"
              disabled={!canAct || !newMax}
              busy={busy === "limit"}
              busyText={admin.pending?.stage === "mining" ? "Waiting for Sepolia..." : "Confirm in MetaMask..."}
              onClick={updateLimit}
            >
              Update Limit
            </ActionButton>
          </div>
        </section>
      </div>

      <section className="glass-card rounded-3xl p-6 border border-white/10 flex flex-wrap gap-8">
        <div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Contract</p>
          {admin.address ? (
            <a href={addressUrl(admin.address)} target="_blank" rel="noreferrer" className="text-xs font-mono text-blue-400 hover:underline">{shortAddress(admin.address)}</a>
          ) : (
            <p className="text-xs text-rose-400">Not set</p>
          )}
        </div>
        <div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Admin</p>
          {admin.admin ? (
            <a href={addressUrl(admin.admin)} target="_blank" rel="noreferrer" className="text-xs font-mono text-blue-400 hover:underline">{shortAddress(admin.admin)}</a>
          ) : (
            <p className="text-xs text-slate-500">...</p>
          )}
        </div>
        <div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Network</p>
          <p className="text-xs text-emerald-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Sepolia Testnet</p>
        </div>
      </section>
    </SharedLayout>
  );
}
