"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";

import contractData from "../constants/contractAddress.json";
import MicroLoanArtifact from "../constants/MicroLoanABI.json";

const CONTRACT_ADDRESS = contractData.address;
const ABI = MicroLoanArtifact.abi;

// Sepolia
const SEPOLIA_CHAIN_ID = "0xaa36a7";

// Contract enum:
// 0 = Requested
// 1 = Funded
// 2 = Withdrawn
// 3 = Repaid
// 4 = Defaulted
const STATUS = {
  Requested: 0,
  Funded: 1,
  Withdrawn: 2,
  Repaid: 3,
  Defaulted: 4,
};

export default function Home() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletBalance, setWalletBalance] = useState("0");

  const [loanRequests, setLoanRequests] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);

  const [showFundModal, setShowFundModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);

  const [loadingLoans, setLoadingLoans] = useState(false);
  const [funding, setFunding] = useState(false);
  const [error, setError] = useState("");

  const [stats, setStats] = useState({
    totalInvested: "0",
    activeLoans: 0,
    expectedEarnings: "0",
  });

  // --------------------------------------------------
  // GET PROVIDER
  // --------------------------------------------------

  function getProvider() {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed.");
    }

    return new ethers.BrowserProvider(window.ethereum);
  }

  // --------------------------------------------------
  // SWITCH TO SEPOLIA
  // --------------------------------------------------

  async function switchToSepolia() {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed.");
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError) {
      if (switchError.code === 4001) {
        throw new Error("You rejected the Sepolia network switch.");
      }

      if (switchError.code === 4902) {
        throw new Error(
          "Sepolia is not available in MetaMask. Please enable the Sepolia test network."
        );
      }

      throw new Error("Could not switch to Sepolia.");
    }
  }

  // --------------------------------------------------
  // LOAD LOANS FROM SMART CONTRACT
  // --------------------------------------------------

  async function loadLoans(address = walletAddress) {
    if (!window.ethereum || !address) {
      return;
    }

    try {
      setLoadingLoans(true);
      setError("");

      const provider = getProvider();

      const network = await provider.getNetwork();

      if (network.chainId !== 11155111n) {
        await switchToSepolia();
        return;
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        ABI,
        provider
      );

      const count = await contract.loanCounter();
      const totalLoans = Number(count);

      const requests = [];
      const lenderLoans = [];

      let totalInvested = 0n;
      let expectedEarnings = 0n;

      for (let i = 1; i <= totalLoans; i++) {
        try {
          const loan = await contract.loans(i);

          const borrower = loan[0];
          const lender = loan[1];
          const principal = loan[2];
          const repayment = loan[3];
          const dueDate = loan[4];
          const status = Number(loan[5]);

          const loanData = {
            id: i,
            borrower,
            lender,
            principalWei: principal.toString(),
            repaymentWei: repayment.toString(),
            principal: ethers.formatEther(principal),
            repayment: ethers.formatEther(repayment),
            dueDate: new Date(
              Number(dueDate) * 1000
            ).toLocaleDateString(),
            status,
          };

          // Available loans for lenders
          if (status === STATUS.Requested) {
            requests.push(loanData);
          }

          // Loans belonging to connected lender
          if (
            lender &&
            lender !== ethers.ZeroAddress &&
            lender.toLowerCase() === address.toLowerCase()
          ) {
            lenderLoans.push(loanData);

            // Active lender positions
            if (
              status === STATUS.Funded ||
              status === STATUS.Withdrawn
            ) {
              totalInvested += principal;
              expectedEarnings +=
                repayment > principal
                  ? repayment - principal
                  : 0n;
            }
          }
        } catch (loanError) {
          console.error(`Could not load loan ${i}:`, loanError);
        }
      }

      setLoanRequests(requests);
      setActiveLoans(lenderLoans);

      setStats({
        totalInvested: ethers.formatEther(totalInvested),
        activeLoans: lenderLoans.filter(
          (loan) =>
            loan.status === STATUS.Funded ||
            loan.status === STATUS.Withdrawn
        ).length,
        expectedEarnings: ethers.formatEther(expectedEarnings),
      });
    } catch (err) {
      console.error("Load loans error:", err);
      setError(err.message || "Could not load loans.");
    } finally {
      setLoadingLoans(false);
    }
  }

  // --------------------------------------------------
  // CONNECT WALLET
  // --------------------------------------------------

  async function connectWallet() {
    try {
      setError("");

      if (!window.ethereum) {
        alert("Please install MetaMask first.");
        return;
      }

      await switchToSepolia();

      const provider = getProvider();

      const accounts = await provider.send(
        "eth_requestAccounts",
        []
      );

      if (!accounts || accounts.length === 0) {
        return;
      }

      const address = accounts[0];

      const balance = await provider.getBalance(address);

      setWalletAddress(address);
      setWalletBalance(
        Number(ethers.formatEther(balance)).toFixed(4)
      );
      setWalletConnected(true);

      await loadLoans(address);
    } catch (err) {
      console.error("Wallet connection error:", err);

      if (err.code === 4001) {
        alert("You rejected the MetaMask request.");
      } else {
        alert(err.message || "Wallet connection failed.");
      }
    }
  }

  // --------------------------------------------------
  // FUND LOAN
  // --------------------------------------------------

  async function fundLoan() {
    if (!selectedLoan) {
      return;
    }

    try {
      setFunding(true);
      setError("");

      if (!window.ethereum) {
        throw new Error("MetaMask is not installed.");
      }

      await switchToSepolia();

      const provider = getProvider();
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        ABI,
        signer
      );

      // Check current wallet balance
      const currentBalance = await provider.getBalance(
        await signer.getAddress()
      );

      const amountNeeded = BigInt(
        selectedLoan.principalWei
      );

      if (currentBalance < amountNeeded) {
        throw new Error(
          `Insufficient Sepolia ETH. You need at least ${selectedLoan.principal} ETH plus gas fees.`
        );
      }

      // REAL SMART CONTRACT TRANSACTION
      const tx = await contract.fund(selectedLoan.id, {
        value: selectedLoan.principalWei,
      });

      alert(
        `Transaction submitted!\n\nTransaction Hash:\n${tx.hash}\n\nWaiting for confirmation...`
      );

      await tx.wait();

      alert(
        `Loan #${selectedLoan.id} funded successfully.`
      );

      setShowFundModal(false);
      setSelectedLoan(null);

      // Refresh wallet balance
      const newBalance = await provider.getBalance(
        await signer.getAddress()
      );

      setWalletBalance(
        Number(ethers.formatEther(newBalance)).toFixed(4)
      );

      // Refresh loans
      await loadLoans(walletAddress);
    } catch (err) {
      console.error("Funding error:", err);

      if (err.code === 4001) {
        alert("You rejected the transaction in MetaMask.");
      } else {
        alert(
          err.reason ||
            err.shortMessage ||
            err.message ||
            "Funding transaction failed."
        );
      }
    } finally {
      setFunding(false);
    }
  }

  // --------------------------------------------------
  // WALLET / NETWORK CHANGES
  // --------------------------------------------------

  useEffect(() => {
    if (!window.ethereum) {
      return;
    }

    const handleAccountsChanged = async (accounts) => {
      if (!accounts || accounts.length === 0) {
        setWalletConnected(false);
        setWalletAddress("");
        setWalletBalance("0");
        setLoanRequests([]);
        setActiveLoans([]);
        return;
      }

      const address = accounts[0];

      try {
        const provider = getProvider();
        const balance = await provider.getBalance(address);

        setWalletAddress(address);
        setWalletBalance(
          Number(ethers.formatEther(balance)).toFixed(4)
        );
        setWalletConnected(true);

        await loadLoans(address);
      } catch (err) {
        console.error(err);
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on(
      "accountsChanged",
      handleAccountsChanged
    );

    window.ethereum.on(
      "chainChanged",
      handleChainChanged
    );

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );

        window.ethereum.removeListener(
          "chainChanged",
          handleChainChanged
        );
      }
    };
  }, []);

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  function openFundModal(loan) {
    setSelectedLoan(loan);
    setShowFundModal(true);
  }

  function closeFundModal() {
    if (funding) {
      return;
    }

    setShowFundModal(false);
    setSelectedLoan(null);
  }

  function shortenAddress(address) {
    if (!address) {
      return "";
    }

    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  function getStatusText(status) {
    switch (status) {
      case STATUS.Requested:
        return "Requested";
      case STATUS.Funded:
        return "Funded";
      case STATUS.Withdrawn:
        return "Active";
      case STATUS.Repaid:
        return "Repaid";
      case STATUS.Defaulted:
        return "Defaulted";
      default:
        return "Unknown";
    }
  }

  function getStatusStyle(status) {
    switch (status) {
      case STATUS.Requested:
        return "bg-yellow-100 text-yellow-700";

      case STATUS.Funded:
      case STATUS.Withdrawn:
        return "bg-green-100 text-green-700";

      case STATUS.Repaid:
        return "bg-blue-100 text-blue-700";

      case STATUS.Defaulted:
        return "bg-red-100 text-red-700";

      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">

      {/* SIDEBAR */}
      <aside className="fixed left-0 top-0 hidden h-screen w-64 bg-slate-900 text-white md:block">

        <div className="border-b border-slate-700 p-6">
          <h1 className="text-2xl font-bold">
            MicroLoan
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Lender Portal
          </p>
        </div>

        <nav className="p-4">

          <button className="mb-2 w-full rounded-lg bg-blue-600 px-4 py-3 text-left">
            Dashboard
          </button>

          <button className="mb-2 w-full rounded-lg px-4 py-3 text-left text-slate-300 hover:bg-slate-800">
            Loan Requests
          </button>

          <button className="mb-2 w-full rounded-lg px-4 py-3 text-left text-slate-300 hover:bg-slate-800">
            My Investments
          </button>

          <button className="mb-2 w-full rounded-lg px-4 py-3 text-left text-slate-300 hover:bg-slate-800">
            Transactions
          </button>

        </nav>
      </aside>

      {/* MAIN */}
      <main className="min-h-screen md:ml-64">

        {/* HEADER */}
        <header className="flex items-center justify-between border-b bg-white px-6 py-5 shadow-sm">

          <div>
            <h2 className="text-2xl font-bold">
              Lender Dashboard
            </h2>

            <p className="text-sm text-slate-500">
              Manage your micro-loan investments
            </p>
          </div>

          <button
            onClick={connectWallet}
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            {walletConnected
              ? `${shortenAddress(walletAddress)} ✓`
              : "Connect Wallet"}
          </button>

        </header>

        <div className="p-6">

          {/* ERROR */}
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* STATS */}
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <div className="rounded-xl bg-white p-5 shadow">
              <p className="text-sm text-slate-500">
                Wallet Balance
              </p>

              <h3 className="mt-2 text-2xl font-bold">
                {walletConnected
                  ? `${walletBalance} ETH`
                  : "Not connected"}
              </h3>

              <p className="mt-1 text-sm text-green-600">
                {walletConnected
                  ? "Sepolia balance"
                  : "Connect wallet"}
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 shadow">
              <p className="text-sm text-slate-500">
                Total Invested
              </p>

              <h3 className="mt-2 text-2xl font-bold">
                {walletConnected
                  ? `${stats.totalInvested} ETH`
                  : "0 ETH"}
              </h3>

              <p className="mt-1 text-sm text-blue-600">
                Across funded loans
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 shadow">
              <p className="text-sm text-slate-500">
                Active Loans
              </p>

              <h3 className="mt-2 text-2xl font-bold">
                {stats.activeLoans}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Current investments
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 shadow">
              <p className="text-sm text-slate-500">
                Expected Earnings
              </p>

              <h3 className="mt-2 text-2xl font-bold">
                {walletConnected
                  ? `${stats.expectedEarnings} ETH`
                  : "0 ETH"}
              </h3>

              <p className="mt-1 text-sm text-green-600">
                Repayment minus principal
              </p>
            </div>

          </section>

          {/* AVAILABLE LOANS */}
          <section className="mt-8 rounded-xl bg-white shadow">

            <div className="flex items-center justify-between border-b p-5">

              <div>
                <h3 className="text-xl font-bold">
                  Available Loan Requests
                </h3>

                <p className="text-sm text-slate-500">
                  Real loan requests from the smart contract
                </p>
              </div>

              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                {loadingLoans
                  ? "Loading..."
                  : `${loanRequests.length} Requests`}
              </span>

            </div>

            <div className="overflow-x-auto">

              <table className="w-full text-left">

                <thead className="bg-slate-50 text-sm text-slate-500">

                  <tr>
                    <th className="px-5 py-4">Loan ID</th>
                    <th className="px-5 py-4">Borrower</th>
                    <th className="px-5 py-4">Principal</th>
                    <th className="px-5 py-4">Repayment</th>
                    <th className="px-5 py-4">Due Date</th>
                    <th className="px-5 py-4">Action</th>
                  </tr>

                </thead>

                <tbody>

                  {loanRequests.length === 0 && !loadingLoans ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-5 py-8 text-center text-slate-500"
                      >
                        No loan requests available.
                      </td>
                    </tr>
                  ) : (
                    loanRequests.map((loan) => (

                      <tr
                        key={loan.id}
                        className="border-t hover:bg-slate-50"
                      >

                        <td className="px-5 py-4 font-semibold">
                          #{loan.id}
                        </td>

                        <td className="px-5 py-4 font-medium">
                          {shortenAddress(loan.borrower)}
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {loan.principal} ETH
                        </td>

                        <td className="px-5 py-4">
                          {loan.repayment} ETH
                        </td>

                        <td className="px-5 py-4">
                          {loan.dueDate}
                        </td>

                        <td className="px-5 py-4">

                          <button
                            onClick={() => openFundModal(loan)}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                          >
                            Fund Loan
                          </button>

                        </td>

                      </tr>

                    ))
                  )}

                </tbody>

              </table>

            </div>

          </section>

          {/* MY LOANS */}
          <section className="mt-8 rounded-xl bg-white shadow">

            <div className="border-b p-5">

              <h3 className="text-xl font-bold">
                My Investments
              </h3>

              <p className="text-sm text-slate-500">
                Loans associated with your wallet
              </p>

            </div>

            <div className="overflow-x-auto">

              <table className="w-full text-left">

                <thead className="bg-slate-50 text-sm text-slate-500">

                  <tr>
                    <th className="px-5 py-4">Loan ID</th>
                    <th className="px-5 py-4">Borrower</th>
                    <th className="px-5 py-4">Principal</th>
                    <th className="px-5 py-4">Repayment</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Due Date</th>
                  </tr>

                </thead>

                <tbody>

                  {activeLoans.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-5 py-8 text-center text-slate-500"
                      >
                        No investments found for this wallet.
                      </td>
                    </tr>
                  ) : (
                    activeLoans.map((loan) => (

                      <tr
                        key={loan.id}
                        className="border-t"
                      >

                        <td className="px-5 py-4 font-semibold">
                          #{loan.id}
                        </td>

                        <td className="px-5 py-4">
                          {shortenAddress(loan.borrower)}
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {loan.principal} ETH
                        </td>

                        <td className="px-5 py-4">
                          {loan.repayment} ETH
                        </td>

                        <td className="px-5 py-4">

                          <span
                            className={`rounded-full px-3 py-1 text-sm ${getStatusStyle(
                              loan.status
                            )}`}
                          >
                            {getStatusText(loan.status)}
                          </span>

                        </td>

                        <td className="px-5 py-4">
                          {loan.dueDate}
                        </td>

                      </tr>

                    ))
                  )}

                </tbody>

              </table>

            </div>

          </section>

        </div>

      </main>

      {/* FUND MODAL */}
      {showFundModal && selectedLoan && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

            <div className="flex items-center justify-between">

              <h3 className="text-xl font-bold">
                Fund Loan #{selectedLoan.id}
              </h3>

              <button
                onClick={closeFundModal}
                disabled={funding}
                className="text-2xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>

            </div>

            <div className="mt-5 space-y-3 rounded-lg bg-slate-50 p-4">

              <div className="flex justify-between">
                <span className="text-slate-500">
                  Borrower
                </span>

                <span className="font-semibold">
                  {shortenAddress(selectedLoan.borrower)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">
                  Principal
                </span>

                <span className="font-semibold">
                  {selectedLoan.principal} ETH
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">
                  Repayment
                </span>

                <span className="font-semibold text-green-600">
                  {selectedLoan.repayment} ETH
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">
                  Due Date
                </span>

                <span className="font-semibold">
                  {selectedLoan.dueDate}
                </span>
              </div>

            </div>

            <p className="mt-4 text-sm text-slate-500">
              MetaMask will ask you to approve the exact principal
              amount plus the blockchain gas fee.
            </p>

            <div className="mt-6 flex gap-3">

              <button
                onClick={closeFundModal}
                disabled={funding}
                className="w-1/2 rounded-lg border border-slate-300 px-4 py-3 font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={fundLoan}
                disabled={funding}
                className="w-1/2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {funding ? "Processing..." : "Confirm Funding"}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}