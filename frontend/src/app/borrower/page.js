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

export default function BorrowerDashboard() {
  const { account, connectWallet, walletError, setWalletError, getProvider, switchToSepolia } = useWallet();
  
  const [walletBalance, setWalletBalance] = useState("0");
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);
  const [stats, setStats] = useState({ totalBorrowed: "0", activeCount: 0, totalDue: "0" });
  
  const [activeTab, setActiveTab] = useState("dashboard");

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  
  const [principal, setPrincipal] = useState("");
  const [lenderReward, setLenderReward] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [repayAmount, setRepayAmount] = useState("");

  const calculatedRepayment = principal && lenderReward 
    ? (Number(principal) + Number(lenderReward)).toFixed(4)
    : "0.0000";

  const loadLoans = useCallback(async (walletAddress) => {
    try {
      setLoading(true); setWalletError("");
      const provider = getProvider();
      const network = await provider.getNetwork();
      if (network.chainId !== 11155111n) { await switchToSepolia(); return; }

      const balance = await provider.getBalance(walletAddress);
      setWalletBalance(Number(ethers.formatEther(balance)).toFixed(4));

      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
      const totalLoans = await contract.loanCounter();

      const pending = []; const active = [];
      let totalBorrowedWei = 0n; let totalDueWei = 0n;

      for (let i = 1; i <= Number(totalLoans); i++) {
        try {
          const loan = await contract.loans(i);
          
          if (!loan || loan.borrower === ethers.ZeroAddress) continue;
          
          if (loan.borrower.toLowerCase() === walletAddress.toLowerCase()) {
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

            if (status === STATUS.Requested) pending.push(loanData);
            else if (status === STATUS.Funded || status === STATUS.Withdrawn) {
              active.push(loanData); 
              totalBorrowedWei += principalWei; 
              totalDueWei += repaymentWei;
            }
          }
        } catch (e) { 
          console.error(`Error fetching loan ${i}:`, e); 
        }
      }
      setPendingRequests(pending); setActiveLoans(active);
      setStats({ totalBorrowed: ethers.formatEther(totalBorrowedWei), activeCount: active.length, totalDue: ethers.formatEther(totalDueWei) });
    } catch (err) { 
      setWalletError(err.message || "Failed to fetch data."); 
      toast.error("Failed to sync blockchain data.");
    } finally { 
      setLoading(false); 
    }
  }, [getProvider, switchToSepolia, setWalletError]);

  useEffect(() => {
    if (account) {
      loadLoans(account);
    } else {
      setPendingRequests([]);
      setActiveLoans([]);
      setWalletBalance("0");
      setLoading(false);
    }
  }, [account, loadLoans]);

  const handleRequestLoan = async (e) => {
    e.preventDefault();
    if (!principal || !lenderReward || !dueDate) {
      toast.error("Please fill out all fields.");
      return;
    }
    
    try {
      setLoading(true); setWalletError("");
      const provider = getProvider(); const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      
      const safePrincipalStr = Number(principal).toFixed(18);
      const safeRepaymentStr = (Number(principal) + Number(lenderReward)).toFixed(18);
      const principalWei = ethers.parseEther(safePrincipalStr);
      const repaymentWei = ethers.parseEther(safeRepaymentStr);
      
      const dateObj = new Date(dueDate);
      dateObj.setHours(23, 59, 59, 999);
      const now = Date.now();
      const durationInSeconds = Math.floor((dateObj.getTime() - now) / 1000);

      if (durationInSeconds <= 0) {
        toast.error("Due date must be in the future.");
        setLoading(false);
        return;
      }

      const tx = await contract.requestLoan(principalWei, repaymentWei, durationInSeconds);
      toast.loading("Transaction pending...", { id: "tx-request" });
      await tx.wait();
      
      toast.success("Loan request submitted successfully!", { id: "tx-request" });
      setPrincipal(""); setLenderReward(""); setDueDate(""); setShowRequestModal(false);
      await loadLoans(account);
    } catch (err) { 
      setWalletError(err.reason || err.message || "Transaction failed."); 
      toast.error(err.reason || "Loan request failed.", { id: "tx-request" });
    } finally { 
      setLoading(false); 
    }
  };

  // NEW: Cancel Loan Request Logic
  const handleCancelLoan = async (loanId) => {
    try {
      setLoading(true);
      const provider = getProvider(); 
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      
      const tx = await contract.cancelLoan(loanId);
      toast.loading("Canceling request...", { id: "tx-cancel" });
      await tx.wait();
      
      toast.success(`Request #${loanId} cancelled successfully!`, { id: "tx-cancel" });
      await loadLoans(account);
    } catch (err) { 
      toast.error(err.reason || "Cancellation failed.", { id: "tx-cancel" }); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleWithdraw = async () => {
    try {
      setLoading(true);
      const provider = getProvider(); const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      
      const tx = await contract.withdrawToBorrower(selectedLoan.id);
      toast.loading("Processing withdrawal...", { id: "tx-withdraw" });
      await tx.wait();
      
      toast.success(`Funds for Loan #${selectedLoan.id} withdrawn successfully!`, { id: "tx-withdraw" });
      setShowWithdrawModal(false); 
      await loadLoans(account);
    } catch (err) { 
      toast.error(err.reason || "Withdrawal failed.", { id: "tx-withdraw" }); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleRepay = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const provider = getProvider(); const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      
      const tx = await contract.repay(selectedLoan.id, { value: ethers.parseEther(Number(repayAmount).toFixed(18)) });
      toast.loading("Processing repayment...", { id: "tx-repay" });
      await tx.wait();
      
      toast.success(`Loan #${selectedLoan.id} repaid successfully!`, { id: "tx-repay" });
      setShowRepayModal(false); setRepayAmount(""); await loadLoans(account);
    } catch (err) { 
      toast.error(err.reason || "Repayment failed.", { id: "tx-repay" }); 
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
      title="Borrower Dashboard" 
      subtitle="Manage your decentralized micro-loan requests and active repayments"
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
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Borrowed</p>
          <div className="mt-3 flex items-baseline gap-1">
            <h3 className="text-3xl font-black text-white font-mono tracking-tight">
              <CountUp end={Number(stats.totalBorrowed)} decimals={4} duration={2} separator="," />
            </h3>
            <span className="text-sm font-bold text-slate-500">ETH</span>
          </div>
          <span className="inline-block mt-2 text-[11px] font-medium text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">Escrow Principal</span>
        </motion.div>

        <motion.div variants={cardVariant} className="glass-card p-6 rounded-3xl relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Loans</p>
          <h3 className="mt-3 text-3xl font-black text-white font-mono tracking-tight">
            <CountUp end={stats.activeCount} duration={1.5} />
          </h3>
          <span className="inline-block mt-2 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">In Progress</span>
        </motion.div>

        <motion.div variants={cardVariant} className="glass-card p-6 rounded-3xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Repayment Due</p>
          <div className="mt-3 flex items-baseline gap-1">
            <h3 className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
              <CountUp end={Number(stats.totalDue)} decimals={4} duration={2.5} separator="," />
            </h3>
            <span className="text-sm font-bold text-slate-500">ETH</span>
          </div>
          <span className="inline-block mt-2 text-[11px] font-medium text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">Smart Escrow</span>
        </motion.div>
      </motion.section>

      {/* Navigation Tabs */}
      <div className="flex space-x-6 border-b border-white/10 mb-8 px-2">
        {[
          { id: "dashboard", label: "Overview" },
          { id: "requests", label: "My Requests" },
          { id: "borrowings", label: "Active Loans" }
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

      {/* Requests Section */}
      {(activeTab === "dashboard" || activeTab === "requests") && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-10 glass-card rounded-3xl overflow-hidden border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 p-6">
            <div>
              <h3 className="text-lg font-bold text-white">My Loan Requests</h3>
              <p className="text-xs text-slate-400 mt-0.5">Pending requests awaiting lender funding</p>
            </div>
            <button 
              onClick={() => setShowRequestModal(true)} 
              className="rounded-2xl bg-blue-600/20 border border-blue-500/30 px-5 py-2.5 text-xs font-bold text-blue-400 hover:bg-blue-600/30 transition-all active:scale-95"
            >
              + New Request
            </button>
          </div>
          
          {loading ? (
            <SkeletonTable />
          ) : pendingRequests.length === 0 ? (
            <EmptyState 
              title="No Pending Requests" 
              description="You haven't requested any micro-loans yet. Start by creating a new request to get funded."
              actionText="Create New Request"
              onAction={() => setShowRequestModal(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-900/40 text-[11px] uppercase text-slate-400 font-semibold border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4">Loan ID</th>
                    <th className="px-6 py-4">Principal</th>
                    <th className="px-6 py-4">Repayment</th>
                    <th className="px-6 py-4">Due Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-white/5">
                  {pendingRequests.map((loan) => (
                    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={loan.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-300">#{loan.id}</td>
                      <td className="px-6 py-4 font-medium text-white font-mono">{loan.principal} ETH</td>
                      <td className="px-6 py-4 text-emerald-400 font-medium font-mono">{loan.repayment} ETH</td>
                      <td className="px-6 py-4">
                        <LoanProgressBar dueDate={loan.dueDate} status={loan.status} />
                      </td>
                      <td className="px-6 py-4"><span className={`rounded-full px-3 py-1 text-[11px] font-bold ${getStatusStyle(loan.status)}`}>{getStatusText(loan.status)}</span></td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => handleCancelLoan(loan.id)} 
                          className="rounded-xl bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 shadow-lg shadow-rose-500/10 transition-all active:scale-95"
                        >
                          Cancel
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

      {/* Active Loans Section */}
      {(activeTab === "dashboard" || activeTab === "borrowings") && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-3xl overflow-hidden border border-white/10">
          <div className="border-b border-white/10 p-6">
            <h3 className="text-lg font-bold text-white">My Active Loans</h3>
            <p className="text-xs text-slate-400 mt-0.5">Funded loans requiring withdrawal or repayment</p>
          </div>
          
          {loading ? (
            <SkeletonTable />
          ) : activeLoans.length === 0 ? (
            <EmptyState 
              title="No Active Loans" 
              description="You do not have any funded loans right now."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-900/40 text-[11px] uppercase text-slate-400 font-semibold border-b border-white/5">
                  <tr><th className="px-6 py-4">Loan ID</th><th className="px-6 py-4">Principal</th><th className="px-6 py-4">Repayment</th><th className="px-6 py-4">Due Date</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Action</th></tr>
                </thead>
                <tbody className="text-sm divide-y divide-white/5">
                  {activeLoans.map((loan) => (
                    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={loan.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-300">#{loan.id}</td>
                      <td className="px-6 py-4 font-medium text-white font-mono">{loan.principal} ETH</td>
                      <td className="px-6 py-4 text-emerald-400 font-medium font-mono">{loan.repayment} ETH</td>
                      <td className="px-6 py-4">
                        <LoanProgressBar dueDate={loan.dueDate} status={loan.status} />
                      </td>
                      <td className="px-6 py-4"><span className={`rounded-full px-3 py-1 text-[11px] font-bold ${getStatusStyle(loan.status)}`}>{getStatusText(loan.status)}</span></td>
                      <td className="px-6 py-4">
                        {loan.status === STATUS.Funded && (
                          <button onClick={() => { setSelectedLoan(loan); setShowWithdrawModal(true); }} className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all active:scale-95">Withdraw</button>
                        )}
                        {loan.status === STATUS.Withdrawn && (
                          <button onClick={() => { setSelectedLoan(loan); setShowRepayModal(true); setRepayAmount(loan.repayment); }} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-lg shadow-blue-600/30 transition-all active:scale-95">Repay</button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.section>
      )}

      {/* Modals with AnimatePresence */}
      <AnimatePresence>
        {showRequestModal && (
          <motion.div variants={modalBackdrop} initial="hidden" animate="visible" exit="hidden" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4">
            <motion.div variants={modalContent} className="w-full max-w-md glass-card p-8 rounded-3xl border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Request a Loan</h3>
                <button onClick={() => setShowRequestModal(false)} className="text-2xl text-slate-400 hover:text-white transition-colors">&times;</button>
              </div>
              <form onSubmit={handleRequestLoan} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Principal Amount (ETH)</label>
                  <input type="number" step="0.0001" placeholder="e.g., 2.5" value={principal} onChange={(e) => setPrincipal(e.target.value)} required className="w-full px-4 py-3 glass-input rounded-2xl text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Lender Reward (ETH)</label>
                  <input type="number" step="0.0001" placeholder="e.g., 0.15" value={lenderReward} onChange={(e) => setLenderReward(e.target.value)} required className="w-full px-4 py-3 glass-input rounded-2xl text-sm font-mono" />
                </div>
                <div className="rounded-2xl bg-slate-900/60 p-5 border border-white/5 space-y-2">
                  <div className="flex justify-between text-xs text-slate-400"><span>Principal</span><span className="font-semibold text-white font-mono">{principal || "0.0000"} ETH</span></div>
                  <div className="flex justify-between text-xs text-slate-400 pb-2 border-b border-white/5"><span>Lender Reward</span><span className="font-bold text-emerald-400 font-mono">+{lenderReward || "0.0000"} ETH</span></div>
                  <div className="flex justify-between items-center pt-1"><span className="font-bold text-slate-200 text-xs uppercase">Total Repayment</span><span className="text-lg font-black text-blue-400 font-mono">{calculatedRepayment} ETH</span></div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Due Date</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className="w-full px-4 py-3 glass-input rounded-2xl text-sm font-mono" />
                </div>
                <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-600/30 disabled:opacity-50 transition-all active:scale-95">
                  {loading ? "Processing..." : "Submit Loan Request"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showWithdrawModal && selectedLoan && (
          <motion.div variants={modalBackdrop} initial="hidden" animate="visible" exit="hidden" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4">
            <motion.div variants={modalContent} className="w-full max-w-sm glass-card p-8 rounded-3xl border border-white/10 shadow-2xl text-center">
              <h3 className="text-xl font-bold text-white mb-2">Withdraw Funds</h3>
              <p className="text-xs text-slate-400 mb-6">Transfer <strong className="text-white font-bold font-mono">{selectedLoan.principal} ETH</strong> to your wallet from escrow.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowWithdrawModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-2xl transition-colors active:scale-95">Cancel</button>
                <button onClick={handleWithdraw} disabled={loading} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-colors active:scale-95">Confirm</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showRepayModal && selectedLoan && (
          <motion.div variants={modalBackdrop} initial="hidden" animate="visible" exit="hidden" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4">
            <motion.div variants={modalContent} className="w-full max-w-md glass-card p-8 rounded-3xl border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Repay Loan #{selectedLoan.id}</h3>
                <button onClick={() => setShowRepayModal(false)} className="text-2xl text-slate-400 hover:text-white transition-colors">&times;</button>
              </div>
              <form onSubmit={handleRepay} className="space-y-5">
                <div className="rounded-2xl bg-slate-900/60 p-5 border border-white/5 space-y-2">
                  <div className="flex justify-between text-xs text-slate-400"><span>Principal Received</span><span className="font-semibold text-white font-mono">{selectedLoan.principal} ETH</span></div>
                  <div className="flex justify-between text-xs text-slate-400"><span>Amount Due</span><span className="font-black text-emerald-400 font-mono">{selectedLoan.repayment} ETH</span></div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Confirm Repayment (ETH)</label>
                  <input type="number" step="0.0001" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} required className="w-full px-4 py-3 glass-input rounded-2xl text-sm font-mono" />
                </div>
                <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-600/30 disabled:opacity-50 transition-all active:scale-95">
                  {loading ? "Processing..." : "Submit Repayment"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SharedLayout>
  );
}