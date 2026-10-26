"use client";

import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import SharedLayout from "../../components/SharedLayout";
import { useWallet } from "@/hooks/useWallet";
import MaintenanceBanner from "@/components/MaintenanceBanner";
import { MICROLOAN_ABI as ABI, getContractAddress, describeTxError, sameAddress } from "@/utils/web3Helpers";

const CONTRACT_ADDRESS = getContractAddress();
const STATUS = { Requested: 0, Funded: 1, Withdrawn: 2, Repaid: 3, Defaulted: 4, Cancelled: 5 };

export default function LenderDashboard() {
  const { account, connectWallet, walletError, setWalletError, getProvider, switchToSepolia, onSepolia } = useWallet();
  const [notice, setNotice] = useState("");
  
  const [walletBalance, setWalletBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  
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
      if (!CONTRACT_ADDRESS) { setWalletError("No contract address configured."); return; }
      const network = await provider.getNetwork();
      if (network.chainId !== 11155111n) { setWalletError("Switch MetaMask to the Sepolia network to continue."); return; }

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
            repaymentWei: loan.repayment,
            principal: ethers.formatEther(loan.principal), 
            repayment: ethers.formatEther(loan.repayment),
            dueDate: new Date(Number(loan.dueDate) * 1000).toLocaleDateString(), 
            status
          };

          if (status === STATUS.Requested) {
            available.push(loanData);
          } else if (sameAddress(loan.lender, walletAddress)) {
            investments.push(loanData);
            if (status === STATUS.Funded || status === STATUS.Withdrawn) {
              totalInvestedWei += loan.principal;
              expectedEarningsWei += (loan.repayment - loan.principal);
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
    } catch { setWalletError("Failed to fetch data from contract."); } finally { setLoading(false); }
  }, [getProvider, setWalletError]);

  useEffect(() => {
    if (account && onSepolia) {
      loadLenderData(account);
    } else {
      setAvailableRequests([]);
      setMyInvestments([]);
      setWalletBalance("0");
    }
  }, [account, onSepolia, loadLenderData]);

  const handleFundLoan = async () => {
    try {
      setLoading(true); setWalletError(""); setNotice("");
      const provider = getProvider(); 
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      
      const tx = await contract.fund(selectedLoan.id, { value: selectedLoan.principalWei });
      await tx.wait();
      
      setNotice(`Successfully funded Loan #${selectedLoan.id}!`);
      setShowFundModal(false); 
      await loadLenderData(account);
    } catch (err) { setShowFundModal(false); setWalletError(describeTxError(err)); } finally { setLoading(false); }
  };

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
      <div className="mb-6 empty:hidden"><MaintenanceBanner /></div>
      {account && !onSepolia && <div className="mb-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-800 border border-amber-200 flex items-center justify-between gap-3"><span>MetaMask is on another network.</span><button onClick={switchToSepolia} className="font-bold underline">Switch to Sepolia</button></div>}
      {notice && <div className="mb-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 border border-emerald-200 flex justify-between"><span>{notice}</span><button onClick={() => setNotice("")} className="font-bold">Dismiss</button></div>}
      {walletError && <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">{walletError}</div>}

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
                      {sameAddress(loan.borrower, account) ? (
                        <span className="text-xs font-medium text-slate-400">Your request</span>
                      ) : (
                        <button 
                          onClick={() => { setSelectedLoan(loan); setShowFundModal(true); }} 
                          className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition-colors"
                        >
                          Fund Loan
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

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
                <span className="font-bold text-emerald-600">+{ethers.formatEther(selectedLoan.repaymentWei - selectedLoan.principalWei)} ETH</span>
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