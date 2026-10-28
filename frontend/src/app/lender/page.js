"use client";

import { useState } from "react";
import { ethers } from "ethers";
import SharedLayout from "@/components/SharedLayout";
import EmptyState from "@/components/ui/EmptyState";
import LoanProgressBar from "@/components/ui/LoanProgressBar";
import { SkeletonTable } from "@/components/ui/Skeletons";
import {
  ActionButton, ConnectPrompt, LoanTable, Modal, Panel, StatCard, StatGrid, StatusPill, SummaryRow, Tabs,
} from "@/components/ui/Dashboard";
import { STATUS, durationLabel, fmtEth, isActive, rewardPercent } from "@/components/ui/format";
import { useWallet } from "@/hooks/useWallet";
import { useLoans } from "@/hooks/useLoans";
import { useTxRunner } from "@/hooks/useTxRunner";
import { useNow } from "@/hooks/useNow";
import { addressUrl, sameAddress, shortAddress } from "@/utils/web3Helpers";

const toEth = (wei) => Number(ethers.formatEther(wei ?? 0n));
const sum = (list, pick) => list.reduce((total, l) => total + pick(l), 0n);

export default function LenderDashboard() {
  const { account, chainId, onSepolia, connecting, connectWallet, switchToSepolia, getSigner, walletError } = useWallet();
  const { loans, balance, claimableWei, loaded, unavailable, error, reload } = useLoans(account, chainId);
  const { busy, run } = useTxRunner({ getSigner, account, onSepolia, reload });
  const now = useNow();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [funding, setFunding] = useState(null);

  // A lender can't fund their own request, so don't offer it.
  const available = loans.filter((l) => l.status === STATUS.Requested && !sameAddress(l.borrower, account));
  const investments = account ? loans.filter((l) => sameAddress(l.lender, account)) : [];
  const active = investments.filter((l) => isActive(l.status));

  const fund = async () => {
    const loan = funding;
    const ok = await run(`fund-${loan.id}`, { pending: "Funding loan...", success: `Loan #${loan.id} funded.` }, (c) =>
      c.fund(loan.id, { value: loan.principalWei })
    );
    if (ok) setFunding(null);
  };

  const reclaim = (loan) =>
    run(`reclaim-${loan.id}`, { pending: "Reclaiming funds...", success: `${fmtEth(loan.principalWei)} ETH returned from loan #${loan.id}.` }, (c) =>
      c.reclaimFunding(loan.id)
    );

  const claim = () =>
    run("claim", { pending: "Withdrawing repayments...", success: `${fmtEth(claimableWei)} ETH sent to your wallet.` }, (c) => c.withdrawPending());

  const availableBody = () => {
    if (unavailable) return <ConnectPrompt text="Connect your wallet on Sepolia to load loan requests." onConnect={account ? null : connectWallet} connecting={connecting} />;
    if (!loaded && !error) return <SkeletonTable />;
    if (available.length === 0) return <EmptyState title="No Open Requests" description="There are no unfunded loan requests right now. Check back later." />;
    return (
      <LoanTable columns={["Loan ID", "Borrower", "Principal", "Total Return", "Term", "Action"]}>
        {available.map((loan) => (
          <tr key={loan.id} className="hover:bg-white/[0.02] transition-colors">
            <td className="px-6 py-4 font-mono font-bold text-slate-300">#{loan.id}</td>
            <td className="px-6 py-4 font-mono text-xs"><BorrowerLink address={loan.borrower} /></td>
            <td className="px-6 py-4 font-medium text-white font-mono">{fmtEth(loan.principalWei)} ETH</td>
            <td className="px-6 py-4 font-bold text-emerald-400 font-mono">
              {fmtEth(loan.repaymentWei)} ETH <span className="text-[10px] text-slate-500">({rewardPercent(loan.principalWei, loan.repaymentWei) ?? "0%"})</span>
            </td>
            <td className="px-6 py-4 text-xs text-slate-300">{durationLabel(loan.duration)}</td>
            <td className="px-6 py-4">
              <ActionButton onClick={() => setFunding(loan)}>Fund Loan</ActionButton>
            </td>
          </tr>
        ))}
      </LoanTable>
    );
  };

  const investmentsBody = () => {
    if (!account) return <ConnectPrompt text="Connect your wallet to see the loans you funded." onConnect={connectWallet} connecting={connecting} />;
    if (!loaded && !error) return <SkeletonTable />;
    if (investments.length === 0) return <EmptyState title="No Investments" description="You haven't funded any loans yet. Browse available requests to start earning." />;
    return (
      <LoanTable columns={["Loan ID", "Borrower", "Principal", "Expected Return", "Due", "Status", "Action"]}>
        {investments.map((loan) => (
          <tr key={loan.id} className="hover:bg-white/[0.02] transition-colors">
            <td className="px-6 py-4 font-mono font-bold text-slate-300">#{loan.id}</td>
            <td className="px-6 py-4 font-mono text-xs"><BorrowerLink address={loan.borrower} /></td>
            <td className="px-6 py-4 font-medium text-white font-mono">{fmtEth(loan.principalWei)} ETH</td>
            <td className="px-6 py-4 font-bold text-emerald-400 font-mono">{fmtEth(loan.repaymentWei)} ETH</td>
            <td className="px-6 py-4"><LoanProgressBar dueTs={loan.dueTs} duration={loan.duration} status={loan.status} /></td>
            <td className="px-6 py-4"><StatusPill status={loan.status} /></td>
            <td className="px-6 py-4">
              {loan.status === STATUS.Funded && now > loan.dueTs && (
                <ActionButton variant="success" busy={busy === `reclaim-${loan.id}`} busyText="Reclaiming..." onClick={() => reclaim(loan)}>
                  Reclaim
                </ActionButton>
              )}
            </td>
          </tr>
        ))}
      </LoanTable>
    );
  };

  return (
    <SharedLayout
      account={account}
      onConnect={connectWallet}
      wrongNetwork={Boolean(account) && !onSepolia}
      onSwitchNetwork={switchToSepolia}
      error={walletError || error}
      title="Lender Dashboard"
      subtitle="Discover borrower requests and fund decentralized micro-loans"
    >
      <StatGrid>
        <StatCard label="Wallet Balance" value={toEth(balance)} decimals={4} unit="ETH" badge={account ? "Connected" : "Not connected"} accent="blue" />
        <StatCard label="Total Invested" value={toEth(sum(active, (l) => l.principalWei))} decimals={4} unit="ETH" badge={`${active.length} active ${active.length === 1 ? "loan" : "loans"}`} accent="indigo" />
        <StatCard label="Expected Earnings" prefix="+" value={toEth(sum(active, (l) => l.repaymentWei - l.principalWei))} decimals={4} unit="ETH" badge="Rewards on active loans" accent="emerald" valueClass="text-emerald-400" />
        <StatCard label="Ready to Claim" value={toEth(claimableWei)} decimals={4} unit="ETH" accent="amber" badge={claimableWei ? null : "Repayments land here"}>
          {claimableWei > 0n && (
            <ActionButton variant="success" className="mt-3" busy={busy === "claim"} busyText="Withdrawing..." onClick={claim}>
              Withdraw to wallet
            </ActionButton>
          )}
        </StatCard>
      </StatGrid>

      <Tabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: "dashboard", label: "Overview" },
          { id: "available", label: "Available Requests" },
          { id: "investments", label: "My Investments" },
        ]}
      />

      {(activeTab === "dashboard" || activeTab === "available") && (
        <Panel title="Available Loan Requests" subtitle="Fund a request to earn its fixed reward. The term starts when you fund it.">
          {availableBody()}
        </Panel>
      )}

      {(activeTab === "dashboard" || activeTab === "investments") && (
        <Panel title="My Investments" subtitle="Loans you funded. Repayments are credited to Ready to Claim.">
          {investmentsBody()}
        </Panel>
      )}

      <Modal open={Boolean(funding)} title={funding ? `Fund Loan #${funding.id}` : "Fund Loan"} onClose={() => setFunding(null)}>
        {funding && (
          <>
            <div className="rounded-2xl bg-slate-900/60 p-5 border border-white/5 space-y-2 mb-6">
              <SummaryRow label="Principal Amount">{fmtEth(funding.principalWei)} ETH</SummaryRow>
              <SummaryRow label="Reward">+{fmtEth(funding.repaymentWei - funding.principalWei)} ETH</SummaryRow>
              <SummaryRow label="Term">{durationLabel(funding.duration)} from funding</SummaryRow>
              <SummaryRow label="Total Return" strong>{fmtEth(funding.repaymentWei)} ETH</SummaryRow>
            </div>
            <p className="text-xs text-slate-400 mb-6 text-center">
              You are sending <strong className="text-white font-mono">{fmtEth(funding.principalWei)} ETH</strong> to the escrow contract.
              Loans are not collateralised: if the borrower defaults, the principal is lost.
            </p>
            <div className="flex gap-3">
              <ActionButton variant="ghost" className="flex-1 py-3 rounded-2xl" onClick={() => setFunding(null)}>Cancel</ActionButton>
              <ActionButton className="flex-1 py-3 rounded-2xl" busy={busy === `fund-${funding.id}`} busyText="Processing..." onClick={fund}>
                Confirm & Fund
              </ActionButton>
            </div>
          </>
        )}
      </Modal>
    </SharedLayout>
  );
}

function BorrowerLink({ address }) {
  return (
    <a href={addressUrl(address)} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-400 hover:underline">
      {shortAddress(address)}
    </a>
  );
}
