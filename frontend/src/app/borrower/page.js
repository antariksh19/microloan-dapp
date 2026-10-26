"use client";

import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import SharedLayout from "../../components/SharedLayout";
import contractData from "@/constants/contractAddress.json";

const CONTRACT_ADDRESS = contractData?.address || contractData;
const ABI = [
  "function loanCounter() view returns (uint256)",
  "function loans(uint256) view returns (address borrower, address lender, uint256 principal, uint256 repaymentAmount, uint256 dueDate, uint8 status)",
  "function requestLoan(uint256 principal, uint256 repaymentAmount, uint256 dueDate) returns (uint256)",
  "function withdrawToBorrower(uint256 loanId)",
  "function repay(uint256 loanId) payable"
];
const SEPOLIA_CHAIN_ID = "0xaa36a7";
const STATUS = { Requested: 0, Funded: 1, Withdrawn: 2, Repaid: 3, Defaulted: 4 };

export default function BorrowerDashboard() {
  const [account, setAccount] = useState("");
  const [walletBalance, setWalletBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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

  const getProvider = () => {
    if (typeof window !== "undefined" && window.ethereum) return new ethers.BrowserProvider(window.ethereum);
    throw new Error("MetaMask is not installed.");
  };

  const switchToSepolia = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_CHAIN_ID }] });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{ chainId: SEPOLIA_CHAIN_ID, chainName: "Sepolia Test Network", nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://sepolia.infura.io/v3/"], blockExplorerUrls: ["https://sepolia.etherscan.io"] }],
        });
      }
    }
  };

  const loadLoans = useCallback(async (walletAddress) => {
    try {
      setLoading(true); setError("");
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
          if (loan.borrower.toLowerCase() === walletAddress.toLowerCase()) {
            const status = Number(loan.status);
            const loanData = {
              id: i, borrower: loan.borrower, principalWei: loan.principal, repaymentWei: loan.repaymentAmount,
              principal: ethers.formatEther(loan.principal), repayment: ethers.formatEther(loan.repaymentAmount),
              dueDate: new Date(Number(loan.dueDate) * 1000).toLocaleDateString(), status
            };
            if (status === STATUS.Requested) pending.push(loanData);
            else if (status === STATUS.Funded || status === STATUS.Withdrawn) {
              active.push(loanData); totalBorrowedWei += loan.principal; totalDueWei += loan.repaymentAmount;
            }
          }
        } catch (e) { console.error(`Error fetching loan ${i}:`, e); }
      }
      setPendingRequests(pending); setActiveLoans(active);
      setStats({ totalBorrowed: ethers.formatEther(totalBorrowedWei), activeCount: active.length, totalDue: ethers.formatEther(totalDueWei) });
    } catch (err) { setError(err.message || "Failed to fetch data."); } finally { setLoading(false); }
  }, []);

  const connectWallet = async () => {
    try {
      setError(""); if (!window.ethereum) throw new Error("MetaMask not found.");
      const provider = getProvider();
      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts.length > 0) { setAccount(accounts[0]); await loadLoans(accounts[0]); }
    } catch (err) { setError(err.message || "Wallet connection failed."); }
  };

  const handleRequestLoan = async (e) => {
    e.preventDefault();
    if (!principal || !lenderReward || !dueDate) return setError("Please fill out all fields.");
    try {
      setLoading(true); setError("");
      const provider = getProvider(); const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      const principalWei = ethers.parseEther(principal.toString());
      const repaymentWei = ethers.parseEther(calculatedRepayment.toString());
      const dueDateTimestamp = Math.floor(new Date(dueDate).getTime() / 1000);
      const tx = await contract.requestLoan(principalWei, repaymentWei, dueDateTimestamp);
      await tx.wait();
      alert("Loan request submitted!");
      setPrincipal(""); setLenderReward(""); setDueDate(""); setShowRequestModal(false);
      await loadLoans(account);
    } catch (err) { setError(err.reason || err.message || "Transaction failed."); } finally { setLoading(false); }
  };

  const handleWithdraw = async () => {
    try {
      setLoading(true);
      const provider = getProvider(); const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      const tx = await contract.withdrawToBorrower(selectedLoan.id);
      await tx.wait();
      alert(`Funds for Loan #${selectedLoan.id} withdrawn!`);
      setShowWithdrawModal(false); await loadLoans(account);
    } catch (err) { alert(err.reason || "Withdrawal failed."); } finally { setLoading(false); }
  };

  const handleRepay = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const provider = getProvider(); const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      const tx = await contract.repay(selectedLoan.id, { value: ethers.parseEther(repayAmount) });
      await tx.wait();
      alert(`Loan #${selectedLoan.id} repaid!`);
      setShowRepayModal(false); setRepayAmount(""); await loadLoans(account);
    } catch (err) { alert(err.reason || "Repayment failed."); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) { setAccount(accounts[0]); loadLoans(accounts[0]); } 
        else { setAccount(""); setPendingRequests([]); setActiveLoans([]); }
      });
      window.ethereum.on("chainChanged", () => window.location.reload());
    }
  }, [loadLoans]);

  const getStatusText = (status) => Object.keys(STATUS).find(key => STATUS[key] === status) || "Unknown";
  const getStatusStyle = (status) => {
    switch (status) {
      case STATUS.Requested: return "bg-yellow-100 text-yellow-700";
      case STATUS.Funded: return "bg-emerald-100 text-emerald-700";
      case STATUS.Withdrawn: return "bg-blue-100 text-blue-700";
      case STATUS.Repaid: return "bg-slate-200 text-slate-700";
      default: return "bg-red-100 text-red-700";
    }
  };

  return (
    <SharedLayout 
      account={account} 
      onConnect={connectWallet} 
      title="Borrower Dashboard" 
      subtitle="Manage your loan requests and active repayments"
    >
      {error && <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">{error}</div>}

      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500">Wallet Balance</p>
          <h3 className="mt-2 text-2xl font-bold">{account ? `${walletBalance} ETH` : "—"}</h3>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500">Total Borrowed</p>
          <h3 className="mt-2 text-2xl font-bold">{account ? `${stats.totalBorrowed} ETH` : "0 ETH"}</h3>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500">Active Loans</p>
          <h3 className="mt-2 text-2xl font-bold">{stats.activeCount}</h3>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500">Total Repayment Due</p>
          <h3 className="mt-2 text-2xl font-bold text-blue-600">{account ? `${stats.totalDue} ETH` : "0 ETH"}</h3>
        </div>
      </section>

      <div className="flex space-x-6 border-b border-slate-200 mb-8 px-2">
        {[
          { id: "dashboard", label: "Overview" },
          { id: "requests", label: "My Requests" },
          { id: "borrowings", label: "Active Loans" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {(activeTab === "dashboard" || activeTab === "requests") && (
        <section className="mb-8 rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">My Loan Requests</h3>
              <p className="text-sm text-slate-500 mt-1">Pending requests waiting for a lender</p>
            </div>
            <button onClick={() => setShowRequestModal(true)} className="rounded-xl bg-blue-50 px-5 py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-100 transition-colors">
              + New Request
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100">
                <tr><th className="px-6 py-4">Loan ID</th><th className="px-6 py-4">Principal</th><th className="px-6 py-4">Repayment</th><th className="px-6 py-4">Due Date</th><th className="px-6 py-4">Status</th></tr>
              </thead>
              <tbody className="text-sm">
                {pendingRequests.length === 0 ? <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">No pending requests.</td></tr> : pendingRequests.map((loan) => (
                  <tr key={loan.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">#{loan.id}</td>
                    <td className="px-6 py-4 font-medium">{loan.principal} ETH</td>
                    <td className="px-6 py-4">{loan.repayment} ETH</td>
                    <td className="px-6 py-4 text-slate-500">{loan.dueDate}</td>
                    <td className="px-6 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(loan.status)}`}>{getStatusText(loan.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {(activeTab === "dashboard" || activeTab === "borrowings") && (
        <section className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
          <div className="border-b border-slate-100 p-6">
            <h3 className="text-lg font-bold text-slate-800">My Active Loans</h3>
            <p className="text-sm text-slate-500 mt-1">Funded loans requiring withdrawal or repayment</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100">
                <tr><th className="px-6 py-4">Loan ID</th><th className="px-6 py-4">Principal</th><th className="px-6 py-4">Repayment</th><th className="px-6 py-4">Due Date</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Action</th></tr>
              </thead>
              <tbody className="text-sm">
                {activeLoans.length === 0 ? <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">No active loans found.</td></tr> : activeLoans.map((loan) => (
                  <tr key={loan.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">#{loan.id}</td>
                    <td className="px-6 py-4 font-medium">{loan.principal} ETH</td>
                    <td className="px-6 py-4">{loan.repayment} ETH</td>
                    <td className="px-6 py-4 text-slate-500">{loan.dueDate}</td>
                    <td className="px-6 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(loan.status)}`}>{getStatusText(loan.status)}</span></td>
                    <td className="px-6 py-4">
                      {loan.status === STATUS.Funded && <button onClick={() => { setSelectedLoan(loan); setShowWithdrawModal(true); }} className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-600 shadow-sm">Withdraw</button>}
                      {loan.status === STATUS.Withdrawn && <button onClick={() => { setSelectedLoan(loan); setShowRepayModal(true); setRepayAmount(loan.repayment); }} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm">Repay</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-800">Request a Loan</h3>
              <button onClick={() => setShowRequestModal(false)} className="text-3xl text-slate-400 hover:text-slate-700 transition-colors">&times;</button>
            </div>
            <form onSubmit={handleRequestLoan} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Principal Amount (ETH)</label>
                <input type="number" step="0.0001" placeholder="e.g., 3.0" value={principal} onChange={(e) => setPrincipal(e.target.value)} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Lender Reward (ETH)</label>
                <input type="number" step="0.0001" placeholder="e.g., 0.12" value={lenderReward} onChange={(e) => setLenderReward(e.target.value)} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="rounded-xl bg-blue-50/50 p-5 border border-blue-100">
                <div className="flex justify-between text-sm mb-2 text-slate-600"><span>Principal</span><span className="font-semibold">{principal || "0.0000"} ETH</span></div>
                <div className="flex justify-between text-sm mb-3 pb-3 border-b border-blue-200/60 text-slate-600"><span>Lender Reward</span><span className="font-bold text-emerald-600">+{lenderReward || "0.0000"} ETH</span></div>
                <div className="flex justify-between items-center"><span className="font-bold text-slate-900">Total Repayment</span><span className="text-xl font-black text-blue-600">{calculatedRepayment} ETH</span></div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Due Date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" disabled={loading} className="w-full mt-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50 transition-all active:scale-[0.98]">
                {loading ? "Processing..." : "Submit Request"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showWithdrawModal && selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl text-center">
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Withdraw Funds</h3>
            <p className="text-sm text-slate-500 mb-6">Transfer <strong className="text-slate-800">{selectedLoan.principal} ETH</strong> to your wallet.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowWithdrawModal(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">Cancel</button>
              <button onClick={handleWithdraw} disabled={loading} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-50 transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {showRepayModal && selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-800">Repay Loan #{selectedLoan.id}</h3>
              <button onClick={() => setShowRepayModal(false)} className="text-3xl text-slate-400 hover:text-slate-700 transition-colors">&times;</button>
            </div>
            <form onSubmit={handleRepay} className="space-y-5">
              <div className="rounded-xl bg-slate-50 p-5 border border-slate-200">
                <div className="flex justify-between mb-2"><span className="text-slate-500 text-sm">Principal Received</span><span className="font-bold text-sm">{selectedLoan.principal} ETH</span></div>
                <div className="flex justify-between"><span className="text-slate-500 text-sm">Amount Due</span><span className="font-black text-slate-800">{selectedLoan.repayment} ETH</span></div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Confirm Repayment (ETH)</label>
                <input type="number" step="0.0001" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" disabled={loading} className="w-full mt-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50 transition-all active:scale-[0.98]">
                {loading ? "Processing..." : "Submit Repayment"}
              </button>
            </form>
          </div>
        </div>
      )}
    </SharedLayout>
  );
}