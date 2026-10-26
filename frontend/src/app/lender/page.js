"use client";

import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import SharedLayout from "../../components/SharedLayout";
import contractData from "@/constants/contractAddress.json";

const CONTRACT_ADDRESS = contractData?.address || contractData;
const ABI = [
  "function loanCounter() view returns (uint256)",
  "function loans(uint256) view returns (address borrower, address lender, uint256 principal, uint256 repaymentAmount, uint256 dueDate, uint8 status)",
  "function fundLoan(uint256 loanId) payable"
];

const SEPOLIA_CHAIN_ID = "0xaa36a7";
const STATUS = { Requested: 0, Funded: 1, Withdrawn: 2, Repaid: 3, Defaulted: 4 };

export default function LenderDashboard() {
  const [account, setAccount] = useState("");
  const [walletBalance, setWalletBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [availableRequests, setAvailableRequests] = useState([]);
  const [myInvestments, setMyInvestments] = useState([]);
  const [stats, setStats] = useState({ totalInvested: "0", activeLoans: 0, expectedEarnings: "0" });
  
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showFundModal, setShowFundModal] = useState(false);

  const getProvider = () => {
    if (typeof window !== "undefined" && window.ethereum) return new ethers.BrowserProvider(window.ethereum);
    throw new Error("MetaMask is not installed.");
  };

  const loadLenderData = useCallback(async (walletAddress) => {
    try {
      setLoading(true); setError("");
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
          const status = Number(loan.status);
          const loanData = {
            id: i, 
            borrower: loan.borrower, 
            principalWei: loan.principal, 
            repaymentWei: loan.repaymentAmount,
            principal: ethers.formatEther(loan.principal), 
            repayment: ethers.formatEther(loan.repaymentAmount),
            dueDate: new Date(Number(loan.dueDate) * 1000).toLocaleDateString(), 
            status
          };

          if (status === STATUS.Requested) {
            available.push(loanData);
          } else if (loan.lender.toLowerCase() === walletAddress.toLowerCase()) {
            investments.push(loanData);
            if (status === STATUS.Funded || status === STATUS.Withdrawn) {
              totalInvestedWei += loan.principal;
              expectedEarningsWei += (loan.repaymentAmount - loan.principal);
            }
          }
        } catch (e) { console.error(`Error fetching loan ${i}:`, e); }
      }
      
      setAvailableRequests(available); 
      setMyInvestments(investments);
      setStats({ 
        totalInvested: ethers.formatEther(totalInvestedWei), 
        activeLoans: investments.filter(l => l.status === STATUS.Funded || l.status === STATUS.Withdrawn).length, 
        expectedEarnings: ethers.formatEther(expectedEarningsWei) 
      });
    } catch (err) { setError("Failed to fetch data from contract."); } finally { setLoading(false); }
  }, []);

  const connectWallet = async () => {
    try {
      setError(""); if (!window.ethereum) throw new Error("MetaMask not found.");
      const provider = getProvider();
      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts.length > 0) { 
        setAccount(accounts[0]); 
        await loadLenderData(accounts[0]); 
      }
    } catch (err) { setError(err.message || "Wallet connection failed."); }
  };

  const handleFundLoan = async () => {
    try {
      setLoading(true);
      const provider = getProvider(); 
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      
      const tx = await contract.fundLoan(selectedLoan.id, { value: selectedLoan.principalWei });
      await tx.wait();
      
      alert(`Successfully funded Loan #${selectedLoan.id}!`);
      setShowFundModal(false); 
      await loadLenderData(account);
    } catch (err) { alert(err.reason || "Funding failed."); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) { setAccount(accounts[0]); loadLenderData(accounts[0]); } 
        else { setAccount(""); setAvailableRequests([]); setMyInvestments([]); }
      });
    }
  }, [loadLenderData]);

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

  const shortenAddress = (address) => address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  return (
    <SharedLayout 
      account={account} 
      onConnect={connectWallet} 
      title="Lender Dashboard" 
      subtitle="Discover and fund micro-loan investments"
    >
      {error && <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">{error}</div>}

      {/* Stats Row */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500">Wallet Balance</p>
          <h3 className="mt-2 text-2xl font-bold">{account ? `${walletBalance} ETH` : "—"}</h3>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500">Total Invested</p>
          <h3 className="mt-2 text-2xl font-bold">{account ? `${stats.totalInvested} ETH` : "0 ETH"}</h3>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500">Active Loans</p>
          <h3 className="mt-2 text-2xl font-bold">{stats.activeLoans}</h3>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500">Expected Earnings</p>
          <h3 className="mt-2 text-2xl font-bold text-emerald-600">{account ? `+${stats.expectedEarnings} ETH` : "0 ETH"}</h3>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="flex space-x-6 border-b border-slate-200 mb-8 px-2">
        {[
          { id: "dashboard", label: "Overview" },
          { id: "available", label: "Available Requests" },
          { id: "investments", label: "My Investments" }
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

      {/* Available Loan Requests Table */}
      {(activeTab === "dashboard" || activeTab === "available") && (
        <section className="mb-8 rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
          <div className="border-b border-slate-100 p-6">
            <h3 className="text-lg font-bold text-slate-800">Available Loan Requests</h3>
            <p className="text-sm text-slate-500 mt-1">Review borrower requests and fund them to earn rewards</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100">
                <tr><th className="px-6 py-4">Loan ID</th><th className="px-6 py-4">Borrower</th><th className="px-6 py-4">Principal</th><th className="px-6 py-4">Total Return</th><th className="px-6 py-4">Due Date</th><th className="px-6 py-4">Action</th></tr>
              </thead>
              <tbody className="text-sm">
                {availableRequests.length === 0 ? <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">No available loan requests at the moment.</td></tr> : availableRequests.map((loan) => (
                  <tr key={loan.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">#{loan.id}</td>
                    <td className="px-6 py-4 font-mono text-slate-500">{shortenAddress(loan.borrower)}</td>
                    <td className="px-6 py-4 font-medium">{loan.principal} ETH</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">{loan.repayment} ETH</td>
                    <td className="px-6 py-4 text-slate-500">{loan.dueDate}</td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => { setSelectedLoan(loan); setShowFundModal(true); }} 
                        className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition-colors"
                      >
                        Fund Loan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* My Investments Table */}
      {(activeTab === "dashboard" || activeTab === "investments") && (
        <section className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
          <div className="border-b border-slate-100 p-6">
            <h3 className="text-lg font-bold text-slate-800">My Investments</h3>
            <p className="text-sm text-slate-500 mt-1">Track the status of the loans you have funded</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100">
                <tr><th className="px-6 py-4">Loan ID</th><th className="px-6 py-4">Borrower</th><th className="px-6 py-4">Principal</th><th className="px-6 py-4">Expected Return</th><th className="px-6 py-4">Due Date</th><th className="px-6 py-4">Status</th></tr>
              </thead>
              <tbody className="text-sm">
                {myInvestments.length === 0 ? <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">You have no active investments.</td></tr> : myInvestments.map((loan) => (
                  <tr key={loan.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">#{loan.id}</td>
                    <td className="px-6 py-4 font-mono text-slate-500">{shortenAddress(loan.borrower)}</td>
                    <td className="px-6 py-4 font-medium">{loan.principal} ETH</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">{loan.repayment} ETH</td>
                    <td className="px-6 py-4 text-slate-500">{loan.dueDate}</td>
                    <td className="px-6 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(loan.status)}`}>{getStatusText(loan.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Fund Loan Modal */}
      {showFundModal && selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-800">Fund Loan #{selectedLoan.id}</h3>
              <button onClick={() => setShowFundModal(false)} className="text-3xl text-slate-400 hover:text-slate-700 transition-colors">&times;</button>
            </div>
            
            <div className="rounded-xl bg-slate-50 p-5 border border-slate-200 mb-6">
              <div className="flex justify-between text-sm mb-2 text-slate-600">
                <span>Principal Amount</span>
                <span className="font-semibold">{selectedLoan.principal} ETH</span>
              </div>
              <div className="flex justify-between text-sm mb-3 pb-3 border-b border-slate-200 text-slate-600">
                <span>Expected Reward</span>
                <span className="font-bold text-emerald-600">+{Number(selectedLoan.repayment) - Number(selectedLoan.principal)} ETH</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900">Total Return</span>
                <span className="text-xl font-black text-blue-600">{selectedLoan.repayment} ETH</span>
              </div>
            </div>

            <p className="text-sm text-slate-500 mb-6 text-center">
              You are about to transfer <strong className="text-slate-800">{selectedLoan.principal} ETH</strong> to the escrow contract.
            </p>

            <div className="flex gap-3">
              <button onClick={() => setShowFundModal(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">Cancel</button>
              <button onClick={handleFundLoan} disabled={loading} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors">
                {loading ? "Processing..." : "Confirm & Fund"}
              </button>
            </div>
          </div>
        </div>
      )}
    </SharedLayout>
  );
}