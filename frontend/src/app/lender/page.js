"use client";

import LoanProgressBar from "@/components/ui/LoanProgressBar";
import CountUp from "react-countup";
import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import SharedLayout from "../../components/SharedLayout";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeletons";
import { useWallet } from "@/hooks/useWallet";
import contractData from "@/constants/contractAddress.json";
import MicroLoanABI from "@/constants/MicroLoanABI.json";

const CONTRACT_ADDRESS = contractData?.address || contractData;
const ABI = MicroLoanABI.abi || MicroLoanABI;
const STATUS = { Requested: 0, Funded: 1, Withdrawn: 2, Repaid: 3, Defaulted: 4 };

export default function LenderDashboard() {
  const { account, connectWallet, walletError, setWalletError, getProvider, switchToSepolia } = useWallet();
  
  const [walletBalance, setWalletBalance] = useState("0");
  const [loading, setLoading] = useState(true);
  
  const [availableRequests, setAvailableRequests] = useState([]);
  const [myInvestments, setMyInvestments] = useState([]);
  const [stats, setStats] = useState({ totalInvested: "0", activeLoans: 0, expectedEarnings: "0" });
  
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showFundModal, setShowFundModal] = useState(false);

  const loadLenderData = useCallback(async (walletAddress) => {
    try {
      setLoading(true); setWalletError("");
      const provider = getProvider();
      
      const balance = await provider.getBalance(walletAddress);
      setWalletBalance(Number(ethers.formatEther(balance)).toFixed(4));

      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
      const totalLoans = await contract.loanCounter();

      const available = []; 
      const investments = [];
      let totalInvestedWei = 0n; 
      let expectedEarningsWei = 0n;

      for (let i = 1; i <= Number(totalLoans); i++) {
        try {
          const loan = await contract.loans(i);
          
          if (!loan || loan.borrower === ethers.ZeroAddress) continue;
          
          const principalWei = loan.principal || 0n;
          const repaymentWei = loan.repaymentAmount || 0n;
          const status = Number(loan.status || 0);
          
          const loanData = {
            id: i, 
            borrower: loan.borrower, 
            principalWei, 
            repaymentWei,
            principal: ethers.formatEther(principalWei), 
            repayment: ethers.formatEther(repaymentWei),
            dueDate: new Date(Number(loan.dueDate || 0) * 1000).toLocaleDateString(), 
            status
          };

          if (status === STATUS.Requested) {
            available.push(loanData);
          } else if (loan.lender.toLowerCase() === walletAddress.toLowerCase()) {
            investments.push(loanData);
            if (status === STATUS.Funded || status === STATUS.Withdrawn) {
              totalInvestedWei += principalWei;
              expectedEarningsWei += (repaymentWei - principalWei);
            }
          }
        } catch (e) { 
          console.error(`Error fetching loan ${i}:`, e); 
        }
      }
      
      setAvailableRequests(available); 
      setMyInvestments(investments);
      setStats({ 
        totalInvested: ethers.formatEther(totalInvestedWei), 
        activeLoans: investments.filter(l => l.status === STATUS.Funded || l.status === STATUS.Withdrawn).length, 
        expectedEarnings: ethers.formatEther(expectedEarningsWei) 
      });
    } catch (err) { 
      setWalletError("Failed to fetch data from contract."); 
      toast.error("Failed to sync blockchain data.");
    } finally { 
      setLoading(false); 
    }
  }, [getProvider, setWalletError]);

  useEffect(() => {
    if (account) {
      loadLenderData(account);
    } else {
      setAvailableRequests([]);
      setMyInvestments([]);
      setWalletBalance("0");
      setLoading(false);
    }
  }, [account, loadLenderData]);

  const handleFundLoan = async () => {
    try {
      setLoading(true);
      const provider = getProvider(); 
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      
      const tx = await contract.fundLoan(selectedLoan.id, { value: selectedLoan.principalWei });
      toast.loading("Funding transaction in progress...", { id: "tx-fund" });
      await tx.wait();
      
      toast.success(`Successfully funded Loan #${selectedLoan.id}!`, { id: "tx-fund" });
      setShowFundModal(false); 
      await loadLenderData(account);
    } catch (err) { 
      toast.error(err.reason || "Funding failed.", { id: "tx-fund" }); 
    } finally { 
      setLoading(false); 
    }
  };

  const getStatusText = (status) => Object.keys(STATUS).find(key => STATUS[key] === status) || "Unknown";
  const getStatusStyle = (status) => {
    switch (status) {
      case STATUS.Requested: return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case STATUS.Funded: return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case STATUS.Withdrawn: return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case STATUS.Repaid: return "bg-slate-800 text-slate-400 border border-slate-700";
      default: return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
    }
  };

  const shortenAddress = (address) => address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  // Framer Motion variants
  const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const cardVariant = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };
  const modalBackdrop = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };
  const modalContent = {
    hidden: { scale: 0.95, opacity: 0, y: 20 },
    visible: { scale: 1, opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } }
  };

  return (
    <SharedLayout 
      account={account} 
      onConnect={connectWallet} 
      title="Lender Dashboard" 
      subtitle="Discover borrower requests and fund high-yield decentralized micro-loans"
    >
      {walletError && (
        <div className="mb-6 rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-400 border border-rose-500/20 backdrop-blur-xl">
          {walletError}
        </div>
      )}

      {/* Bento Grid Stats */}
      <motion.section 
        variants={staggerContainer} 
        initial="hidden" 
        animate="show" 
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10"
      >
        <motion.div variants={cardVariant} className="glass-card p-6 rounded-3xl relative overflow-hidden group hover:border-blue-500/30 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Wallet Balance</p>
          <div className="mt-3 flex items-baseline gap-1">
            <h3 className="text-3xl font-black text-white font-mono tracking-tight">
              <CountUp end={Number(walletBalance)} decimals={4} duration={2} separator="," />
            </h3>
            <span className="text-sm font-bold text-slate-500">ETH</span>
          </div>
          <span className="inline-block mt-2 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">Active Session</span>
        </motion.div>

        <motion.div variants={cardVariant} className="glass-card p-6 rounded-3xl relative overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Invested</p>
          <div className="mt-3 flex items-baseline gap-1">
            <h3 className="text-3xl font-black text-white font-mono tracking-tight">
              <CountUp end={Number(stats.totalInvested)} decimals={4} duration={2} separator="," />
            </h3>
            <span className="text-sm font-bold text-slate-500">ETH</span>
          </div>
          <span className="inline-block mt-2 text-[11px] font-medium text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">Active Capital</span>
        </motion.div>

        <motion.div variants={cardVariant} className="glass-card p-6 rounded-3xl relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Loans</p>
          <h3 className="mt-3 text-3xl font-black text-white font-mono tracking-tight">
            <CountUp end={stats.activeLoans} duration={1.5} />
          </h3>
          <span className="inline-block mt-2 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">Performing</span>
        </motion.div>

        <motion.div variants={cardVariant} className="glass-card p-6 rounded-3xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expected Earnings</p>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-black text-emerald-400 font-mono tracking-tight">+</span>
            <h3 className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
              <CountUp end={Number(stats.expectedEarnings)} decimals={4} duration={2.5} separator="," />
            </h3>
            <span className="text-sm font-bold text-slate-500">ETH</span>
          </div>
          <span className="inline-block mt-2 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">Yield Return</span>
        </motion.div>
      </motion.section>

      {/* Navigation Tabs */}
      <div className="flex space-x-6 border-b border-white/10 mb-8 px-2">
        {[
          { id: "dashboard", label: "Overview" },
          { id: "available", label: "Available Requests" },
          { id: "investments", label: "My Investments" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Available Requests Section */}
      {(activeTab === "dashboard" || activeTab === "available") && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-10 glass-card rounded-3xl overflow-hidden border border-white/10">
          <div className="border-b border-white/10 p-6">
            <h3 className="text-lg font-bold text-white">Available Loan Requests</h3>
            <p className="text-xs text-slate-400 mt-0.5">Review borrower requests and fund them to earn fixed rewards</p>
          </div>
          
          {loading ? (
            <SkeletonTable />
          ) : availableRequests.length === 0 ? (
            <EmptyState 
              title="No Open Requests" 
              description="There are currently no unfunded loan requests on the market. Check back later for new opportunities."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-900/40 text-[11px] uppercase text-slate-400 font-semibold border-b border-white/5">
                  <tr><th className="px-6 py-4">Loan ID</th><th className="px-6 py-4">Borrower</th><th className="px-6 py-4">Principal</th><th className="px-6 py-4">Total Return</th><th className="px-6 py-4">Due Date</th><th className="px-6 py-4">Action</th></tr>
                </thead>
                <tbody className="text-sm divide-y divide-white/5">
                  {availableRequests.map((loan) => (
                    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={loan.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-300">#{loan.id}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">{shortenAddress(loan.borrower)}</td>
                      <td className="px-6 py-4 font-medium text-white font-mono">{loan.principal} ETH</td>
                      <td className="px-6 py-4 font-bold text-emerald-400 font-mono">{loan.repayment} ETH</td>
                      <td className="px-6 py-4">
                        <LoanProgressBar dueDate={loan.dueDate} status={loan.status} />
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => { setSelectedLoan(loan); setShowFundModal(true); }} 
                          className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-lg shadow-blue-600/30 transition-all active:scale-95"
                        >
                          Fund Loan
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.section>
      )}

      {/* Investments Section */}
      {(activeTab === "dashboard" || activeTab === "investments") && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-3xl overflow-hidden border border-white/10">
          <div className="border-b border-white/10 p-6">
            <h3 className="text-lg font-bold text-white">My Investments</h3>
            <p className="text-xs text-slate-400 mt-0.5">Track the live performance and status of loans you have funded</p>
          </div>
          
          {loading ? (
            <SkeletonTable />
          ) : myInvestments.length === 0 ? (
            <EmptyState 
              title="No Active Investments" 
              description="You haven't funded any loans yet. Browse available requests to start earning yield."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-900/40 text-[11px] uppercase text-slate-400 font-semibold border-b border-white/5">
                  <tr><th className="px-6 py-4">Loan ID</th><th className="px-6 py-4">Borrower</th><th className="px-6 py-4">Principal</th><th className="px-6 py-4">Expected Return</th><th className="px-6 py-4">Due Date</th><th className="px-6 py-4">Status</th></tr>
                </thead>
                <tbody className="text-sm divide-y divide-white/5">
                  {myInvestments.map((loan) => (
                    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={loan.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-300">#{loan.id}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">{shortenAddress(loan.borrower)}</td>
                      <td className="px-6 py-4 font-medium text-white font-mono">{loan.principal} ETH</td>
                      <td className="px-6 py-4 font-bold text-emerald-400 font-mono">{loan.repayment} ETH</td>
                      <td className="px-6 py-4">
                        <LoanProgressBar dueDate={loan.dueDate} status={loan.status} />
                      </td>
                      <td className="px-6 py-4"><span className={`rounded-full px-3 py-1 text-[11px] font-bold ${getStatusStyle(loan.status)}`}>{getStatusText(loan.status)}</span></td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.section>
      )}

      {/* Fund Modal with AnimatePresence */}
      <AnimatePresence>
        {showFundModal && selectedLoan && (
          <motion.div variants={modalBackdrop} initial="hidden" animate="visible" exit="hidden" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4">
            <motion.div variants={modalContent} className="w-full max-w-md glass-card p-8 rounded-3xl border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Fund Loan #{selectedLoan.id}</h3>
                <button onClick={() => setShowFundModal(false)} className="text-2xl text-slate-400 hover:text-white transition-colors">&times;</button>
              </div>
              
              <div className="rounded-2xl bg-slate-900/60 p-5 border border-white/5 space-y-2 mb-6">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Principal Amount</span>
                  <span className="font-semibold text-white font-mono">{selectedLoan.principal} ETH</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400 pb-2 border-b border-white/5">
                  <span>Expected Reward</span>
                  <span className="font-bold text-emerald-400 font-mono">+{Number(selectedLoan.repayment) - Number(selectedLoan.principal)} ETH</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="font-bold text-slate-200 text-xs uppercase">Total Return</span>
                  <span className="text-lg font-black text-blue-400 font-mono">{selectedLoan.repayment} ETH</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-6 text-center">
                You are about to transfer <strong className="text-white font-bold font-mono">{selectedLoan.principal} ETH</strong> to the secure escrow contract.
              </p>

              <div className="flex gap-3">
                <button onClick={() => setShowFundModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-2xl transition-colors active:scale-95">Cancel</button>
                <button onClick={handleFundLoan} disabled={loading} className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-600/30 disabled:opacity-50 transition-colors active:scale-95">
                  {loading ? "Processing..." : "Confirm & Fund"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SharedLayout>
  );
}