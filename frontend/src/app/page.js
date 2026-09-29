"use client";
import { useState } from "react";
import { ethers } from "ethers";
import { getContractInstance } from "../utils/contract";

export default function Home() {
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(false);

  // Form inputs for Requesting a Loan
  const [principal, setPrincipal] = useState("");
  const [repayment, setRepayment] = useState("");
  const [durationDays, setDurationDays] = useState("");

  // Action inputs for Withdraw and Repay
  const [withdrawLoanId, setWithdrawLoanId] = useState("");
  const [repayLoanId, setRepayLoanId] = useState("");
  const [repayAmount, setRepayAmount] = useState("");

  // Connect Wallet Action
  async function connectWallet() {
    try {
      if (!window.ethereum) return alert("Please install MetaMask!");
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]);
    } catch (err) {
      console.error(err);
      alert("Failed to connect wallet.");
    }
  }

  // 1. Submit Loan Request Action
  async function handleRequestLoan(e) {
    e.preventDefault();
    try {
      setLoading(true);
      const contract = await getContractInstance();

      // Convert ETH inputs to Wei
      const principalWei = ethers.parseUnits(principal, 18);
      const repaymentWei = ethers.parseUnits(repayment, 18);
      const dueDateUnix =
        Math.floor(Date.now() / 1000) + parseInt(durationDays) * 86400;

      const tx = await contract.requestLoan(
        principalWei,
        repaymentWei,
        dueDateUnix
      );
      await tx.wait();

      alert("Loan request successfully submitted to the blockchain!");
      setPrincipal("");
      setRepayment("");
      setDurationDays("");
    } catch (err) {
      console.error(err);
      alert(err.reason || err.message || "Loan request failed");
    } finally {
      setLoading(false);
    }
  }

  // 2. Withdraw Escrowed Funds Action
  async function handleWithdraw(e) {
    e.preventDefault();
    try {
      setLoading(true);
      const contract = await getContractInstance();

      const tx = await contract.withdrawToBorrower(withdrawLoanId);
      await tx.wait();

      alert(`Funds for Loan #${withdrawLoanId} successfully withdrawn!`);
      setWithdrawLoanId("");
    } catch (err) {
      console.error(err);
      alert(err.reason || err.message || "Withdrawal failed");
    } finally {
      setLoading(false);
    }
  }

  // 3. Repay Loan Action
  async function handleRepay(e) {
    e.preventDefault();
    try {
      setLoading(true);
      const contract = await getContractInstance();

      const repayWei = ethers.parseUnits(repayAmount, 18);
      const tx = await contract.repay(repayLoanId, { value: repayWei });
      await tx.wait();

      alert(`Loan #${repayLoanId} repaid successfully!`);
      setRepayLoanId("");
      setRepayAmount("");
    } catch (err) {
      console.error(err);
      alert(err.reason || err.message || "Repayment failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Borrower Portal</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Micro-Loan DApp — Request, Withdraw, and Repay
            </p>
          </div>
          <button
            onClick={connectWallet}
            className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            {account
              ? `${account.substring(0, 6)}...${account.slice(-4)}`
              : "Connect Wallet"}
          </button>
        </div>

        {/* Section 1: Request Loan Form */}
        <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">1. Request a Loan</h2>
          <form onSubmit={handleRequestLoan} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Principal Amount (ETH)
              </label>
              <input
                type="number"
                step="0.0001"
                placeholder="0.01"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Total Repayment Amount (ETH)
              </label>
              <input
                type="number"
                step="0.0001"
                placeholder="0.011"
                value={repayment}
                onChange={(e) => setRepayment(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Duration (Days)
              </label>
              <input
                type="number"
                placeholder="7"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Waiting for MetaMask..." : "Submit Request"}
            </button>
          </form>
        </section>

        {/* Section 2: Withdraw Escrowed Loan */}
        <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">2. Withdraw Funded Loan</h2>
          <form onSubmit={handleWithdraw} className="flex gap-3">
            <input
              type="number"
              placeholder="Loan ID"
              value={withdrawLoanId}
              onChange={(e) => setWithdrawLoanId(e.target.value)}
              required
              className="flex-1 px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Processing..." : "Withdraw"}
            </button>
          </form>
        </section>

        {/* Section 3: Repay Loan */}
        <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">3. Repay Loan</h2>
          <form onSubmit={handleRepay} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Loan ID</label>
              <input
                type="number"
                placeholder="Loan ID"
                value={repayLoanId}
                onChange={(e) => setRepayLoanId(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Repayment Amount (ETH)
              </label>
              <input
                type="number"
                step="0.0001"
                placeholder="0.011"
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Processing..." : "Repay Loan"}
            </button>
          </form>
        </section>

      </div>
    </div>
  );
}
