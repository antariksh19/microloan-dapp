"use client";

import { useState } from "react";
import SharedLayout from "../../components/SharedLayout";
import { useWallet } from "@/hooks/useWallet";
import { ShieldAlert, Settings2, Activity } from "lucide-react";

export default function AdminDashboard() {
  const { account, connectWallet, walletError } = useWallet();
  const [isPaused, setIsPaused] = useState(false);
  const [maxLoan, setMaxLoan] = useState("5.0");
  const [newMax, setNewMax] = useState("");

  const handlePauseToggle = () => setIsPaused(!isPaused);
  const handleLimitUpdate = () => { if(newMax) setMaxLoan(newMax); setNewMax(""); };

  return (
    <SharedLayout 
      account={account} 
      onConnect={connectWallet} 
      title="Protocol Administration" 
      subtitle="Manage global parameters and emergency protocol controls"
    >
      {walletError && (
        <div className="mb-6 rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-400 border border-rose-500/20 backdrop-blur-xl">
          {walletError}
        </div>
      )}

      {/* Protocol Health Grid */}
      <section className="grid gap-6 sm:grid-cols-3 mb-10">
        <div className="glass-card p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-400"/> Status</p>
          <h3 className="mt-3 text-2xl font-black text-white">{isPaused ? "Halted" : "Running"}</h3>
          <span className={`inline-block mt-2 text-[11px] font-medium px-2.5 py-1 rounded-full border ${isPaused ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
            {isPaused ? "Emergency Pause Active" : "Accepting Activity"}
          </span>
        </div>
        <div className="glass-card p-6 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Settings2 className="w-4 h-4 text-blue-400"/> Max Loan</p>
          <h3 className="mt-3 text-2xl font-black text-white">{maxLoan} ETH</h3>
          <span className="inline-block mt-2 text-[11px] font-medium text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">Per Request Limit</span>
        </div>
        <div className="glass-card p-6 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Contract Loans</p>
          <h3 className="mt-3 text-2xl font-black text-white">1</h3>
          <span className="inline-block mt-2 text-[11px] font-medium text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">Lifetime Volume</span>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-8 mb-10">
        {/* Emergency Controls */}
        <section className="glass-card rounded-3xl p-8 border border-white/10 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl" />
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-rose-400"/> Protocol Pause</h3>
              <p className="text-xs text-slate-400 mt-1">Halt new loan requests during emergency investigations.</p>
            </div>
          </div>
          <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-5 mb-6">
            <p className="text-xs text-slate-300 leading-relaxed">
              Borrowers can still withdraw, repay, and cancel existing loans. Lenders can still fund existing requests. Repayments continue working so borrowers never miss a due date.
            </p>
          </div>
          <button 
            onClick={handlePauseToggle}
            className={`w-full py-3.5 font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all ${isPaused ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 shadow-emerald-500/10" : "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 shadow-rose-500/10"}`}
          >
            {isPaused ? "Resume Protocol" : "Pause Protocol"}
          </button>
        </section>

        {/* Limit Configuration */}
        <section className="glass-card rounded-3xl p-8 border border-white/10">
          <h3 className="text-xl font-bold text-white mb-1">Maximum Loan Amount</h3>
          <p className="text-xs text-slate-400 mb-6">Restrict the maximum ETH borrowers can request in a single loan.</p>
          
          <div className="space-y-5">
            <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-white/5">
              <span className="text-sm font-medium text-slate-300">Current Limit</span>
              <span className="text-sm font-bold text-blue-400">{maxLoan} ETH</span>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Maximum (ETH)</label>
                <div className="flex gap-2">
                  {["1", "5", "10"].map(val => (
                    <button key={val} onClick={() => setNewMax(val)} className="text-[10px] font-bold bg-white/5 hover:bg-white/10 text-slate-300 px-2 py-1 rounded-md transition-colors">{val} ETH</button>
                  ))}
                </div>
              </div>
              <input type="number" step="0.1" value={newMax} onChange={(e) => setNewMax(e.target.value)} placeholder={maxLoan} className="w-full px-4 py-3 glass-input rounded-2xl text-sm mb-2" />
              <p className="text-[10px] text-slate-500 mb-4">Applies to new requests only. Existing loans are unaffected.</p>
            </div>

            <button 
              onClick={handleLimitUpdate}
              className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all"
            >
              Update Limit
            </button>
          </div>
        </section>
      </div>
      
      {/* Contract Reference */}
      <section className="glass-card rounded-3xl p-6 border border-white/10 flex flex-wrap gap-8">
        <div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Contract</p>
          <a href="#" className="text-xs font-mono text-blue-400 hover:underline">0x7a6Df5b4...d3f0</a>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Admin Owner</p>
          <p className="text-xs font-mono text-slate-300">0x2894853...bac0d</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Network</p>
          <p className="text-xs text-emerald-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/> Sepolia Testnet</p>
        </div>
      </section>
    </SharedLayout>
  );
}