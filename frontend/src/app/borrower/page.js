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
import { STATUS, fmtEth, isActive, parseEthInput } from "@/components/ui/format";
import { useWallet } from "@/hooks/useWallet";
import { useLoans } from "@/hooks/useLoans";
import { useTxRunner } from "@/hooks/useTxRunner";
import { useNow } from "@/hooks/useNow";
import { sameAddress } from "@/utils/web3Helpers";

const DAY = 86400;
const MAX_TERM_DAYS = 3650;
const toEth = (wei) => Number(ethers.formatEther(wei ?? 0n));
const sum = (list, pick) => list.reduce((total, l) => total + pick(l), 0n);
const EMPTY_FORM = { principal: "", reward: "", days: "" };

// Checks the request form and returns { principalWei, repaymentWei, durationSec } or { error }.
function readRequestForm(form, maxLoanWei) {
  const principalWei = parseEthInput(form.principal);
  const rewardWei = form.reward.trim() === "" ? 0n : parseEthInput(form.reward);
  const days = Number(form.days);
  if (principalWei === null || principalWei === 0n) return { error: "Enter a principal above zero." };
  if (rewardWei === null) return { error: "Enter the lender reward as a number, or leave it empty." };
  if (maxLoanWei !== null && principalWei > maxLoanWei) return { error: `The most you can request is ${fmtEth(maxLoanWei)} ETH.` };
  if (!Number.isInteger(days) || days < 1 || days > MAX_TERM_DAYS) return { error: `The term must be a whole number of days from 1 to ${MAX_TERM_DAYS}.` };
  return { principalWei, repaymentWei: principalWei + rewardWei, durationSec: BigInt(days * DAY) };
}

export default function BorrowerDashboard() {
  const { account, chainId, onSepolia, connecting, connectWallet, switchToSepolia, getSigner, walletError } = useWallet();
  const { loans, maxLoanWei, balance, loaded, error, reload } = useLoans(account, chainId);
  const { busy, run } = useTxRunner({ getSigner, account, onSepolia, reload });
  const now = useNow();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [showRequest, setShowRequest] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [withdrawing, setWithdrawing] = useState(null);
  const [repaying, setRepaying] = useState(null);

  const mine = account ? loans.filter((l) => sameAddress(l.borrower, account)) : [];
  const pending = mine.filter((l) => l.status === STATUS.Requested);
  const active = mine.filter((l) => isActive(l.status));
  const history = mine.filter((l) => l.status !== STATUS.Requested && !isActive(l.status));

  const preview = readRequestForm(form, maxLoanWei);
  const setField = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setFormError("");
  };

  const openRequest = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setShowRequest(true);
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    if (preview.error) return setFormError(preview.error);
    const ok = await run("request", { pending: "Submitting your request...", success: "Loan request submitted." }, (c) =>
      c.requestLoan(preview.principalWei, preview.repaymentWei, preview.durationSec)
    );
    if (ok) setShowRequest(false);
  };

  const cancel = (loan) =>
    run(`cancel-${loan.id}`, { pending: "Cancelling request...", success: `Request #${loan.id} cancelled.` }, (c) => c.cancelLoan(loan.id));

  const withdraw = async () => {
    const loan = withdrawing;
    const ok = await run(`withdraw-${loan.id}`, { pending: "Processing withdrawal...", success: `Funds for loan #${loan.id} withdrawn.` }, (c) =>
      c.withdrawToBorrower(loan.id)
    );
    if (ok) setWithdrawing(null);
  };

  const repay = async () => {
    const loan = repaying;
    // Send the exact on-chain amount; the contract rejects anything else.
    const ok = await run(`repay-${loan.id}`, { pending: "Processing repayment...", success: `Loan #${loan.id} repaid.` }, (c) =>
      c.repay(loan.id, { value: loan.repaymentWei })
    );
    if (ok) setRepaying(null);
  };

  const showLoading = account && !loaded && !error;
  const table = (list, emptyProps, columns, renderAction) => {
    if (!account) return <ConnectPrompt text="Connect your wallet to see your loans." onConnect={connectWallet} connecting={connecting} />;
    if (showLoading) return <SkeletonTable />;
    if (list.length === 0) return <EmptyState {...emptyProps} />;
    return (
      <LoanTable columns={columns}>
        {list.map((loan) => (
          <tr key={loan.id} className="hover:bg-white/[0.02] transition-colors">
            <td className="px-6 py-4 font-mono font-bold text-slate-300">#{loan.id}</td>
            <td className="px-6 py-4 font-medium text-white font-mono">{fmtEth(loan.principalWei)} ETH</td>
            <td className="px-6 py-4 text-emerald-400 font-medium font-mono">{fmtEth(loan.repaymentWei)} ETH</td>
            <td className="px-6 py-4"><LoanProgressBar dueTs={loan.dueTs} duration={loan.duration} status={loan.status} /></td>
            <td className="px-6 py-4"><StatusPill status={loan.status} /></td>
            {renderAction && <td className="px-6 py-4">{renderAction(loan)}</td>}
          </tr>
        ))}
      </LoanTable>
    );
  };

  const COLUMNS = ["Loan ID", "Principal", "Repayment", "Due", "Status"];

  return (
    <SharedLayout
      account={account}
      onConnect={connectWallet}
      wrongNetwork={Boolean(account) && !onSepolia}
      onSwitchNetwork={switchToSepolia}
      error={walletError || error}
      title="Borrower Dashboard"
      subtitle="Manage your decentralized micro-loan requests and active repayments"
    >
      <StatGrid>
        <StatCard label="Wallet Balance" value={toEth(balance)} decimals={4} unit="ETH" badge={account ? "Connected" : "Not connected"} accent="blue" />
        <StatCard label="Total Borrowed" value={toEth(sum(active, (l) => l.principalWei))} decimals={4} unit="ETH" badge="Active principal" accent="indigo" />
        <StatCard label="Active Loans" value={active.length} badge="In progress" accent="amber" />
        <StatCard label="Total Repayment Due" value={toEth(sum(active, (l) => l.repaymentWei))} decimals={4} unit="ETH" badge="Owed to lenders" accent="emerald" valueClass="text-emerald-400" />
      </StatGrid>

      <Tabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: "dashboard", label: "Overview" },
          { id: "requests", label: "My Requests" },
          { id: "borrowings", label: "Active Loans" },
          { id: "history", label: "History" },
        ]}
      />

      {(activeTab === "dashboard" || activeTab === "requests") && (
        <Panel
          title="My Loan Requests"
          subtitle="Pending requests awaiting lender funding"
          action={<ActionButton variant="ghost" onClick={openRequest} disabled={!account}>+ New Request</ActionButton>}
        >
          {table(
            pending,
            { title: "No Pending Requests", description: "You have no open requests. Create one to get funded.", actionText: "Create New Request", onAction: openRequest },
            [...COLUMNS, "Action"],
            (loan) => (
              <ActionButton variant="danger" busy={busy === `cancel-${loan.id}`} busyText="Cancelling..." onClick={() => cancel(loan)}>
                Cancel
              </ActionButton>
            )
          )}
        </Panel>
      )}

      {(activeTab === "dashboard" || activeTab === "borrowings") && (
        <Panel title="My Active Loans" subtitle="Funded loans requiring withdrawal or repayment">
          {table(
            active,
            { title: "No Active Loans", description: "You do not have any funded loans right now." },
            [...COLUMNS, "Action"],
            (loan) => {
              const overdue = now > loan.dueTs;
              if (overdue) {
                return (
                  <span className="text-[11px] text-rose-400">
                    {loan.status === STATUS.Funded ? "Expired. The lender can reclaim it." : "Past due. Can no longer be repaid."}
                  </span>
                );
              }
              return loan.status === STATUS.Funded ? (
                <ActionButton variant="success" onClick={() => setWithdrawing(loan)}>Withdraw</ActionButton>
              ) : (
                <ActionButton onClick={() => setRepaying(loan)}>Repay</ActionButton>
              );
            }
          )}
        </Panel>
      )}

      {activeTab === "history" && (
        <Panel title="Loan History" subtitle="Repaid, defaulted, cancelled and refunded loans">
          {table(history, { title: "No History Yet", description: "Finished loans will show up here." }, COLUMNS)}
        </Panel>
      )}

      <Modal open={showRequest} title="Request a Loan" onClose={() => setShowRequest(false)}>
        <form onSubmit={submitRequest} className="space-y-5">
          <Field label="Principal Amount (ETH)" hint={maxLoanWei !== null ? `Maximum ${fmtEth(maxLoanWei)} ETH` : null}>
            <input inputMode="decimal" placeholder="e.g. 2.5" value={form.principal} onChange={setField("principal")} required className="w-full px-4 py-3 glass-input rounded-2xl text-sm font-mono" />
          </Field>
          <Field label="Lender Reward (ETH)">
            <input inputMode="decimal" placeholder="e.g. 0.15" value={form.reward} onChange={setField("reward")} className="w-full px-4 py-3 glass-input rounded-2xl text-sm font-mono" />
          </Field>
          <Field label="Loan Term (days)" hint="The clock starts when a lender funds the request.">
            <input type="number" min="1" max={MAX_TERM_DAYS} step="1" placeholder="e.g. 30" value={form.days} onChange={setField("days")} required className="w-full px-4 py-3 glass-input rounded-2xl text-sm font-mono" />
          </Field>
          <div className="rounded-2xl bg-slate-900/60 p-5 border border-white/5 space-y-2">
            <SummaryRow label="Principal">{preview.error ? "–" : `${fmtEth(preview.principalWei)} ETH`}</SummaryRow>
            <SummaryRow label="Lender Reward">{preview.error ? "–" : `+${fmtEth(preview.repaymentWei - preview.principalWei)} ETH`}</SummaryRow>
            <SummaryRow label="Total Repayment" strong>{preview.error ? "–" : `${fmtEth(preview.repaymentWei)} ETH`}</SummaryRow>
          </div>
          {formError && <p className="text-xs text-rose-400">{formError}</p>}
          <ActionButton type="submit" busy={busy === "request"} busyText="Processing..." className="w-full py-3.5 rounded-2xl uppercase tracking-wider">
            Submit Loan Request
          </ActionButton>
        </form>
      </Modal>

      <Modal open={Boolean(withdrawing)} title="Withdraw Funds" onClose={() => setWithdrawing(null)}>
        {withdrawing && (
          <>
            <p className="text-xs text-slate-400 mb-6">
              Transfer <strong className="text-white font-mono">{fmtEth(withdrawing.principalWei)} ETH</strong> from escrow to your wallet.
              You must repay <strong className="text-white font-mono">{fmtEth(withdrawing.repaymentWei)} ETH</strong> before the due date.
            </p>
            <div className="flex gap-3">
              <ActionButton variant="ghost" className="flex-1 py-3 rounded-2xl" onClick={() => setWithdrawing(null)}>Cancel</ActionButton>
              <ActionButton variant="success" className="flex-1 py-3 rounded-2xl" busy={busy === `withdraw-${withdrawing.id}`} onClick={withdraw}>Confirm</ActionButton>
            </div>
          </>
        )}
      </Modal>

      <Modal open={Boolean(repaying)} title={repaying ? `Repay Loan #${repaying.id}` : "Repay Loan"} onClose={() => setRepaying(null)}>
        {repaying && (
          <>
            <div className="rounded-2xl bg-slate-900/60 p-5 border border-white/5 space-y-2 mb-6">
              <SummaryRow label="Principal Received">{fmtEth(repaying.principalWei)} ETH</SummaryRow>
              <SummaryRow label="Amount Due" strong>{fmtEth(repaying.repaymentWei)} ETH</SummaryRow>
            </div>
            <ActionButton className="w-full py-3.5 rounded-2xl uppercase tracking-wider" busy={busy === `repay-${repaying.id}`} busyText="Processing..." onClick={repay}>
              Pay {fmtEth(repaying.repaymentWei)} ETH
            </ActionButton>
          </>
        )}
      </Modal>
    </SharedLayout>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-slate-500 mt-1.5">{hint}</p>}
    </div>
  );
}
