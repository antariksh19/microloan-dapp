"use client";

import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";

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

const STATUS = {
  Requested: 0,
  Funded: 1,
  Withdrawn: 2,
  Repaid: 3,
  Defaulted: 4,
};

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
    if (typeof window !== "undefined" && window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    }
    throw new Error("MetaMask is not installed. Please install MetaMask to continue.");
  };

  const switchToSepolia = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: SEPOLIA_CHAIN_ID,
              chainName: "Sepolia Test Network",
              nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://sepolia.infura.io/v3/"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  };

  const loadLoans = useCallback(async (walletAddress) => {
    try {
      setLoading(true);
      setError("");

      const provider = getProvider();
      const network = await provider.getNetwork();

      if (network.chainId !== 11155111n) {
        await switchToSepolia();
        return;
      }

      const balance = await provider.getBalance(walletAddress);
      setWalletBalance(Number(ethers.formatEther(balance)).toFixed(4));

      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
      const totalLoans = await contract.loanCounter();

      const pending = [];
      const active = [];
      let totalBorrowedWei = 0n;
      let totalDueWei = 0n;

      for (let i = 1; i <= Number(totalLoans); i++) {
        try {
          const loan = await contract.loans(i);
          if (loan.borrower.toLowerCase() === walletAddress.toLowerCase()) {
            const status = Number(loan.status);
            const loanData = {
              id: i,
              borrower: loan.borrower,
              principalWei: loan.principal,
              repaymentWei: loan.repaymentAmount,
              principal: ethers.formatEther(loan.principal),
              repayment: ethers.formatEther(loan.repaymentAmount),
              dueDate: new Date(Number(loan.dueDate) * 1000).toLocaleDateString(),
              status: status,
            };

            if (status === STATUS.Requested) {
              pending.push(loanData);
            } else if (status === STATUS.Funded || status === STATUS.Withdrawn) {
              active.push(loanData);
              totalBorrowedWei += loan.principal;
              totalDueWei += loan.repaymentAmount;
            }
          }
        } catch (e) {
          console.error(`Error fetching loan ${i}:`, e);
        }
      }

      setPendingRequests(pending);
      setActiveLoans(active);
      setStats({
        totalBorrowed: ethers.formatEther(totalBorrowedWei),
        activeCount: active.length,
        totalDue: ethers.formatEther(totalDueWei),
      });

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch data from smart contract.");
    } finally {
      setLoading(false);
    }
  }, []);

  const connectWallet = async () => {
    try {
      setError("");
      if (!window.ethereum) throw new Error("MetaMask not found.");

      const provider = getProvider();
      const accounts = await provider.send("eth_requestAccounts", []);
      
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        await loadLoans(accounts[0]);
      }
    } catch (err) {
      setError(err.message || "Wallet connection failed.");
    }
  };

  const handleRequestLoan = async (e) => {
    e.preventDefault();
    if (!principal || !lenderReward || !dueDate) {
      setError("Please fill out all loan fields.");
      return;
    }

    if (Number(principal) <= 0 || Number(lenderReward) < 0) {
      setError("Please enter valid positive numbers.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

      const principalWei = ethers.parseEther(principal.toString());
      const repaymentWei = ethers.parseEther(calculatedRepayment.toString());
      const dueDateTimestamp = Math.floor(new Date(dueDate).getTime() / 1000);

      const tx = await contract.requestLoan(principalWei, repaymentWei, dueDateTimestamp);
      await tx.wait();

      alert("Loan request successfully submitted!");
      setPrincipal("");
      setLenderReward("");
      setDueDate("");
      setShowRequestModal(false);
      await loadLoans(account);
    } catch (err) {
      console.error(err);
      setError(err.reason || err.message || "Transaction failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      setLoading(true);
      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

      const tx = await contract.withdrawToBorrower(selectedLoan.id);
      await tx.wait();

      alert(`Funds for Loan #${selectedLoan.id} withdrawn to your wallet!`);
      setShowWithdrawModal(false);
      await loadLoans(account);
    } catch (err) {
      alert(err.reason || err.message || "Withdrawal failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRepay = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

      const repayWei = ethers.parseEther(repayAmount);
      const tx = await contract.repay(selectedLoan.id, { value: repayWei });
      await tx.wait();

      alert(`Loan #${selectedLoan.id} repaid successfully!`);
      setShowRepayModal(false);
      setRepayAmount("");
      await loadLoans(account);
    } catch (err) {
      alert(err.reason || err.message || "Repayment failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          loadLoans(accounts[0]);
        } else {
          setAccount("");
          setPendingRequests([]);
          setActiveLoans([]);
        }
      });
      window.ethereum.on("chainChanged", () => window.location.reload());
    }
  }, [loadLoans]);

  const shortenAddress = (address) => address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  const getStatusText = (status) => {
    switch (status) {
      case STATUS.Requested: return "Requested";
      case STATUS.Funded: return "Funded";
      case STATUS.Withdrawn: return "Active";
      case STATUS.Repaid: return "Repaid";
      case STATUS.Defaulted: return "Defaulted";
      default: return "Unknown";
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case STATUS.Requested: return "bg-yellow-100 text-yellow-700";
      case STATUS.Funded: return "bg-emerald-100 text-emerald-700";
      case STATUS.Withdrawn: return "bg-blue-100 text-blue-700";
      case STATUS.Repaid: return "bg-slate-200 text-slate-700";
      case STATUS.Defaulted: return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 bg-[#0f172a] text-white md:block">
        <div className="border-b border-slate-800 p-6">
          <h1 className="text-2xl font-bold">MicroLoan</h1>
          <p className="mt-1 text-sm text-slate-400">Borrower Portal</p>
        </div>
        <nav className="p-4">
          <button 
            onClick={() => setActiveTab("dashboard")}
            className={`mb-2 w-full rounded-lg px-4 py-3 text-left font-medium ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab("requests")}
            className={`mb-2 w-full rounded-lg px-4 py-3 text-left font-medium ${activeTab === 'requests' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            Loan Requests
          </button>
          <button 
            onClick={() => setActiveTab("borrowings")}
            className={`mb-2 w-full rounded-lg px-4 py-3 text-left font-medium ${activeTab === 'borrowings' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            My Borrowings
          </button>
          <button 
            onClick={() => alert("Transactions history feature coming in Phase 6!")}
            className="mb-2 w-full rounded-lg px-4 py-3 text-left text-slate-300 hover:bg-slate-800"
          >
            Transactions
          </button>
        </nav>
      </aside>

      <main className="min-h-screen md:ml-64">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold">Borrower Dashboard</h2>
            <p className="text-sm text-slate-500">Manage your loan requests and repayments</p>
          </div>
          <button
            onClick={connectWallet}
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 transition"
          >
            {account ? `${shortenAddress(account)} ✓` : "Connect Wallet"}
          </button>
        </header>

        <div className="p-6">
          {error && <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">{error}</div>}

          {activeTab === "dashboard" && (
            <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
                <p className="text-sm text-slate-500">Wallet Balance</p>
                <h3 className="mt-2 text-2xl font-bold">{account ? `${walletBalance} ETH` : "Not connected"}</h3>
                <p className="mt-1 text-sm text-emerald-600">{account ? "Sepolia network" : "Connect wallet"}</p>
              </div>
              <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
                <p className="text-sm text-slate-500">Total Borrowed</p>
                <h3 className="mt-2 text-2xl font-bold">{account ? `${stats.totalBorrowed} ETH` : "0 ETH"}</h3>
                <p className="mt-1 text-sm text-blue-600">Across active loans</p>
              </div>
              <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
                <p className="text-sm text-slate-500">Active Loans</p>
                <h3 className="mt-2 text-2xl font-bold">{stats.activeCount}</h3>
                <p className="mt-1 text-sm text-slate-500">Current borrowings</p>
              </div>
              <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
                <p className="text-sm text-slate-500">Total Repayment Due</p>
                <h3 className="mt-2 text-2xl font-bold">{account ? `${stats.totalDue} ETH` : "0 ETH"}</h3>
                <p className="mt-1 text-sm text-emerald-600">Principal plus reward</p>
              </div>
            </section>
          )}

          {(activeTab === "dashboard" || activeTab === "requests") && (
            <section className="mt-8 rounded-xl bg-white shadow-sm border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">My Loan Requests</h3>
                  <p className="text-sm text-slate-500">Your pending requests waiting for a lender</p>
                </div>
                <button 
                  onClick={() => setShowRequestModal(true)}
                  className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-200"
                >
                  + New Request
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Loan ID</th>
                      <th className="px-5 py-4 font-semibold">Principal</th>
                      <th className="px-5 py-4 font-semibold">Repayment</th>
                      <th className="px-5 py-4 font-semibold">Due Date</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {pendingRequests.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-5 py-8 text-center text-slate-500">No pending loan requests.</td>
                      </tr>
                    ) : (
                      pendingRequests.map((loan) => (
                        <tr key={loan.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-5 py-4 font-semibold">#{loan.id}</td>
                          <td className="px-5 py-4 font-semibold">{loan.principal} ETH</td>
                          <td className="px-5 py-4">{loan.repayment} ETH</td>
                          <td className="px-5 py-4">{loan.dueDate}</td>
                          <td className="px-5 py-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusStyle(loan.status)}`}>
                              {getStatusText(loan.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {(activeTab === "dashboard" || activeTab === "borrowings") && (
            <section className="mt-8 rounded-xl bg-white shadow-sm border border-slate-100">
              <div className="border-b border-slate-100 p-5">
                <h3 className="text-xl font-bold text-slate-800">My Active Loans</h3>
                <p className="text-sm text-slate-500">Funded loans requiring withdrawal or repayment</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Loan ID</th>
                      <th className="px-5 py-4 font-semibold">Principal</th>
                      <th className="px-5 py-4 font-semibold">Repayment</th>
                      <th className="px-5 py-4 font-semibold">Due Date</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {activeLoans.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-5 py-8 text-center text-slate-500">No active loans found for this wallet.</td>
                      </tr>
                    ) : (
                      activeLoans.map((loan) => (
                        <tr key={loan.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-5 py-4 font-semibold">#{loan.id}</td>
                          <td className="px-5 py-4 font-semibold">{loan.principal} ETH</td>
                          <td className="px-5 py-4">{loan.repayment} ETH</td>
                          <td className="px-5 py-4">{loan.dueDate}</td>
                          <td className="px-5 py-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusStyle(loan.status)}`}>
                              {getStatusText(loan.status)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {loan.status === STATUS.Funded && (
                              <button
                                onClick={() => { setSelectedLoan(loan); setShowWithdrawModal(true); }}
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                              >
                                Withdraw Funds
                              </button>
                            )}
                            {loan.status === STATUS.Withdrawn && (
                              <button
                                onClick={() => { setSelectedLoan(loan); setShowRepayModal(true); setRepayAmount(loan.repayment); }}
                                className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700"
                              >
                                Repay Loan
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </main>

      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Request a Loan</h3>
              <button onClick={() => setShowRequestModal(false)} className="text-2xl text-slate-400 hover:text-slate-700">×</button>
            </div>
            <form onSubmit={handleRequestLoan} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Principal Amount (ETH)</label>
                <p className="text-xs text-slate-500 mb-2">The exact amount of ETH you need to borrow.</p>
                <input type="number" step="0.0001" placeholder="e.g., 3.0" value={principal} onChange={(e) => setPrincipal(e.target.value)} required className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Lender Reward (ETH)</label>
                <p className="text-xs text-slate-500 mb-2">The extra ETH you offer to incentivize a lender.</p>
                <input type="number" step="0.0001" placeholder="e.g., 0.12" value={lenderReward} onChange={(e) => setLenderReward(e.target.value)} required className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              
              <div className="rounded-xl bg-slate-50 p-5 border border-slate-200">
                <div className="flex justify-between text-sm mb-2 text-slate-600">
                  <span>Principal</span>
                  <span className="font-medium">{principal || "0.0000"} ETH</span>
                </div>
                <div className="flex justify-between text-sm mb-3 pb-3 border-b border-slate-200 text-slate-600">
                  <span>Lender Reward</span>
                  <span className="font-medium text-emerald-600">+{lenderReward || "0.0000"} ETH</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-900">Total Repayment</span>
                  <span className="text-xl font-bold text-blue-600">{calculatedRepayment} ETH</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Due Date</label>
                <p className="text-xs text-slate-500 mb-2">When you promise to repay the loan in full.</p>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              
              <button type="submit" disabled={loading} className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 transition">
                {loading ? "Processing..." : "Submit Request"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showWithdrawModal && selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Withdraw Funds</h3>
              <button onClick={() => setShowWithdrawModal(false)} className="text-2xl text-slate-400 hover:text-slate-700">×</button>
            </div>
            <p className="text-sm text-slate-500 mb-6">Loan #{selectedLoan.id} has been funded! Click below to transfer {selectedLoan.principal} ETH into your wallet.</p>
            <button onClick={handleWithdraw} disabled={loading} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg disabled:opacity-50">
              {loading ? "Processing..." : "Confirm Withdrawal"}
            </button>
          </div>
        </div>
      )}

      {showRepayModal && selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Repay Loan #{selectedLoan.id}</h3>
              <button onClick={() => setShowRepayModal(false)} className="text-2xl text-slate-400 hover:text-slate-700">×</button>
            </div>
            <form onSubmit={handleRepay} className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-4 mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-500 text-sm">Principal Received</span>
                  <span className="font-semibold text-sm">{selectedLoan.principal} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Amount Due</span>
                  <span className="font-bold text-slate-800">{selectedLoan.repayment} ETH</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Repayment Amount (ETH)</label>
                <input type="number" step="0.0001" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} required className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" disabled={loading} className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50">
                {loading ? "Processing..." : "Submit Repayment"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}                                                          