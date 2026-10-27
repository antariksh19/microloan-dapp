"use client";

import { useMemo, useState } from "react";
import SharedLayout from "@/components/SharedLayout";
import MaintenanceBanner from "@/components/MaintenanceBanner";
import LoanRow from "@/components/LoanRow";
import Ledger from "@/components/ui/Ledger";
import Tabs from "@/components/ui/Tabs";
import Modal from "@/components/ui/Modal";
import Notice from "@/components/ui/Notice";
import EmptyState from "@/components/ui/EmptyState";
import { btn, field, fieldLabel, panel } from "@/components/ui/styles";
import { dueInfo, fmtEth, formatDate, parseEthInput, rewardPercent } from "@/components/ui/format";
import { useWallet } from "@/hooks/useWallet";
import { useLoans } from "@/hooks/useLoans";
import { useTxRunner } from "@/hooks/useTxRunner";
import { sameAddress } from "@/utils/web3Helpers";

const DURATION_CHIPS = [7, 14, 30];

function isoDateIn(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function BorrowerPage() {
  const wallet = useWallet();
  const { account, chainId, onSepolia } = wallet;
  const { loans, maxLoanWei, balance, loaded, error, reload } = useLoans(account, chainId);
  const tx = useTxRunner({ getSigner: wallet.getSigner, onSepolia, reload });

  const [tab, setTab] = useState("active");
  const [showRequest, setShowRequest] = useState(false);
  const [confirm, setConfirm] = useState(null); // { type: "withdraw" | "repay", loan }

  const [principal, setPrincipal] = useState("");
  const [reward, setReward] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [formError, setFormError] = useState("");

  const mine = useMemo(
    () => loans.filter((l) => sameAddress(l.borrower, account)).sort((a, b) => b.id - a.id),
    [loans, account]
  );
  const requests = mine.filter((l) => l.status === 0);
  const active = mine.filter((l) => l.status === 1 || l.status === 2);
  const history = mine.filter((l) => l.status >= 3);

  const borrowedWei = active.reduce((sum, l) => sum + l.principalWei, 0n);
  const toRepayWei = active.reduce((sum, l) => sum + l.repaymentWei, 0n);
  const nextDue = [...active].sort((a, b) => a.dueTs - b.dueTs)[0];
  const nextDueInfo = nextDue ? dueInfo(nextDue.dueTs, nextDue.status) : null;

  const principalWei = parseEthInput(principal);
  const rewardWei = parseEthInput(reward);
  const totalWei = principalWei !== null && rewardWei !== null ? principalWei + rewardWei : null;

  const openRequest = () => {
    if (!account) return wallet.connect();
    tx.clear();
    setFormError("");
    setShowRequest(true);
  };

  const closeRequest = () => setShowRequest(false);

  const submitRequest = async (e) => {
    e.preventDefault();
    setFormError("");
    if (principalWei === null || principalWei <= 0n) return setFormError("Enter the amount you want to borrow, like 0.5.");
    if (rewardWei === null) return setFormError("Enter the reward for the lender, like 0.02. Use 0 for none.");
    if (maxLoanWei !== null && principalWei > maxLoanWei) {
      return setFormError(`The most you can borrow per loan is ${fmtEth(maxLoanWei)} ETH.`);
    }
    if (!dueDate) return setFormError("Pick a due date.");
    const end = new Date(`${dueDate}T23:59:59`);
    const duration = Math.floor(end.getTime() / 1000) - Math.floor(Date.now() / 1000);
    if (!(duration > 0)) return setFormError("Pick a due date that is in the future.");

    const ok = await tx.run("request", "Request posted. Lenders can see it now.", (c) =>
      c.requestLoan(principalWei, principalWei + rewardWei, duration)
    );
    if (ok) {
      setPrincipal("");
      setReward("");
      setDueDate("");
      setShowRequest(false);
      setTab("requests");
    }
  };

  const doConfirm = async () => {
    const { type, loan } = confirm;
    const ok =
      type === "withdraw"
        ? await tx.run(`withdraw-${loan.id}`, `Loan #${loan.id}: ${fmtEth(loan.principalWei)} ETH is in your wallet.`, (c) =>
            c.withdrawToBorrower(loan.id)
          )
        : await tx.run(`repay-${loan.id}`, `Loan #${loan.id} repaid. The lender has been paid.`, (c) =>
            c.repay(loan.id, { value: loan.repaymentWei })
          );
    if (ok) setConfirm(null);
  };

  const cancelRequest = (loan) =>
    tx.run(`cancel-${loan.id}`, `Request #${loan.id} cancelled.`, (c) => c.cancelLoan(loan.id));

  const shown = tab === "active" ? active : tab === "requests" ? requests : history;
  const emptyCopy = {
    active: ["No active loans", "Once a lender funds one of your requests, it shows up here ready to withdraw."],
    requests: ["No open requests", "Post a request and lenders will be able to fund it."],
    history: ["Nothing here yet", "Repaid, defaulted and cancelled loans are kept here."],
  }[tab];

  const confirmLoan = confirm?.loan;
  const short = confirm?.type === "repay" && balance !== null && confirmLoan && balance < confirmLoan.repaymentWei;

  return (
    <SharedLayout
      wallet={wallet}
      title="Borrow"
      subtitle="Ask for a small loan, set the reward you'll pay, and repay by the due date."
      actions={
        <button type="button" onClick={openRequest} className={btn("primary", "lg")}>
          {account ? "New request" : "Connect to borrow"}
        </button>
      }
    >
      <MaintenanceBanner />
      {account && !onSepolia && (
        <Notice tone="warning" action={{ label: "Switch to Sepolia", onClick: wallet.switchToSepolia }}>
          MetaMask is on a different network. Switch to Sepolia to see and manage your loans.
        </Notice>
      )}
      {wallet.error && <Notice tone="error">{wallet.error}</Notice>}
      {error && <Notice tone="error" action={{ label: "Try again", onClick: reload }}>{error}</Notice>}
      {tx.notice && !showRequest && !confirm && (
        <Notice
          tone={tx.notice.tone}
          hash={tx.notice.hash}
          busy={tx.notice.tone === "info"}
          onDismiss={tx.busy ? undefined : tx.clear}
        >
          {tx.notice.text}
        </Notice>
      )}

      <Ledger
        items={[
          { label: "Wallet balance", value: account && balance !== null ? `${fmtEth(balance, 4)} ETH` : "–" },
          { label: "Borrowed now", value: account ? `${fmtEth(borrowedWei)} ETH` : "–", note: `${active.length} active ${active.length === 1 ? "loan" : "loans"}` },
          { label: "To repay", value: account ? `${fmtEth(toRepayWei)} ETH` : "–", note: "Principal plus rewards" },
          {
            label: "Next due",
            value: nextDueInfo ? nextDueInfo.rel : "–",
            note: nextDue ? `Loan #${nextDue.id}` : "Nothing due",
            tone: nextDueInfo?.tone === "late" ? "text-coral-deep" : nextDueInfo?.tone === "soon" ? "text-sun-ink" : undefined,
          },
        ]}
      />

      <section className={`${panel} overflow-hidden`}>
        <div className="px-2">
          <Tabs
            label="Your loans"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "active", label: "Active", count: active.length },
              { id: "requests", label: "Requests", count: requests.length },
              { id: "history", label: "History", count: history.length },
            ]}
          />
        </div>

        {!account ? (
          <EmptyState title="Connect your wallet" action={{ label: "Connect wallet", onClick: wallet.connect }}>
            Your loans are tied to your wallet address. Connect to see them.
          </EmptyState>
        ) : !loaded && !error ? (
          <p className="px-6 py-14 text-center text-sm text-mute" role="status">Loading your loans…</p>
        ) : shown.length === 0 ? (
          <EmptyState
            title={emptyCopy[0]}
            action={tab === "requests" || tab === "active" ? { label: "New request", onClick: openRequest } : undefined}
          >
            {emptyCopy[1]}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((loan) => {
              const due = dueInfo(loan.dueTs, loan.status);
              const lenderless = loan.status === 0;
              return (
                <LoanRow
                  key={loan.id}
                  loan={loan}
                  counterparty={{ label: "Lender", address: lenderless ? null : loan.lender, empty: "Waiting for a lender" }}
                  note={
                    loan.status === 1
                      ? "Funded. Withdraw it to start the clock on repayment."
                      : loan.status === 2 && due.overdue
                        ? "Past the due date. The contract no longer accepts repayment."
                        : undefined
                  }
                >
                  {loan.status === 0 && (
                    <button
                      type="button"
                      className={btn("quiet", "sm")}
                      disabled={tx.busy !== null}
                      onClick={() => cancelRequest(loan)}
                    >
                      {tx.busy === `cancel-${loan.id}` ? "Cancelling…" : "Cancel request"}
                    </button>
                  )}
                  {loan.status === 1 && (
                    <button type="button" className={btn("primary", "sm")} disabled={tx.busy !== null} onClick={() => { tx.clear(); setConfirm({ type: "withdraw", loan }); }}>
                      Withdraw
                    </button>
                  )}
                  {loan.status === 2 && (
                    <button
                      type="button"
                      className={btn("primary", "sm")}
                      disabled={tx.busy !== null || due.overdue}
                      onClick={() => { tx.clear(); setConfirm({ type: "repay", loan }); }}
                    >
                      Repay
                    </button>
                  )}
                </LoanRow>
              );
            })}
          </ul>
        )}
      </section>

      {showRequest && (
        <Modal title="New loan request" onClose={closeRequest}>
          <form onSubmit={submitRequest} noValidate className="space-y-4">
            <div>
              <label htmlFor="principal" className={fieldLabel}>Amount to borrow (ETH)</label>
              <input id="principal" className={field} inputMode="decimal" placeholder="0.5" value={principal} onChange={(e) => setPrincipal(e.target.value)} autoComplete="off" />
              {maxLoanWei !== null && <p className="mt-1.5 text-xs text-mute">The most you can borrow per loan is {fmtEth(maxLoanWei)} ETH.</p>}
            </div>
            <div>
              <label htmlFor="reward" className={fieldLabel}>Reward for the lender (ETH)</label>
              <input id="reward" className={field} inputMode="decimal" placeholder="0.02" value={reward} onChange={(e) => setReward(e.target.value)} autoComplete="off" />
            </div>
            <div>
              <label htmlFor="due" className={fieldLabel}>Repay by</label>
              <input id="due" type="date" className={field} min={isoDateIn(1)} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <div className="mt-2 flex gap-2">
                {DURATION_CHIPS.map((d) => (
                  <button key={d} type="button" className={btn("quiet", "sm")} onClick={() => setDueDate(isoDateIn(d))}>
                    {d} days
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-fog px-4 py-3 text-sm">
              <div className="flex justify-between"><span className="text-mute">You receive</span><span className="font-semibold tabular-nums">{principalWei !== null ? fmtEth(principalWei) : "0"} ETH</span></div>
              <div className="mt-1 flex justify-between">
                <span className="text-mute">You repay{principalWei && totalWei !== null && rewardPercent(principalWei, totalWei) ? ` (${rewardPercent(principalWei, totalWei)} more)` : ""}</span>
                <span className="font-display text-lg font-semibold tabular-nums">{totalWei !== null ? fmtEth(totalWei) : "0"} ETH</span>
              </div>
            </div>
            <p className="text-xs text-mute">If you don&apos;t repay by the end of the due date, the lender can mark the loan as defaulted.</p>

            {formError && <Notice tone="error">{formError}</Notice>}
            {tx.notice && tx.notice.tone !== "success" && (
              <Notice tone={tx.notice.tone} hash={tx.notice.hash} busy={tx.notice.tone === "info"}>{tx.notice.text}</Notice>
            )}

            <button type="submit" disabled={tx.busy !== null} className={`${btn("primary", "lg")} w-full`}>
              {tx.busy === "request" ? "Posting request…" : "Post request"}
            </button>
          </form>
        </Modal>
      )}

      {confirm && confirmLoan && (
        <Modal title={confirm.type === "withdraw" ? "Withdraw funds" : "Repay loan"} size="sm" onClose={() => !tx.busy && setConfirm(null)}>
          <div className="space-y-4">
            <p className="text-sm text-mute">
              {confirm.type === "withdraw"
                ? <>Move <strong className="text-ink">{fmtEth(confirmLoan.principalWei)} ETH</strong> from the contract to your wallet. You&apos;ll then owe <strong className="text-ink">{fmtEth(confirmLoan.repaymentWei)} ETH</strong> by {formatDate(confirmLoan.dueTs)}.</>
                : <>Send <strong className="text-ink">{fmtEth(confirmLoan.repaymentWei)} ETH</strong> to the lender. This is the exact amount the contract needs, and it closes loan #{confirmLoan.id}.</>}
            </p>
            {short && <Notice tone="warning">Your wallet has {fmtEth(balance, 4)} ETH, which is less than the repayment plus gas.</Notice>}
            {tx.notice && tx.notice.tone !== "success" && (
              <Notice tone={tx.notice.tone} hash={tx.notice.hash} busy={tx.notice.tone === "info"}>{tx.notice.text}</Notice>
            )}
            <div className="flex gap-3">
              <button type="button" className={`${btn("quiet")} flex-1`} disabled={tx.busy !== null} onClick={() => setConfirm(null)}>Not now</button>
              <button type="button" className={`${btn("primary")} flex-1`} disabled={tx.busy !== null || short} onClick={doConfirm}>
                {tx.busy ? "Working…" : confirm.type === "withdraw" ? "Withdraw" : `Repay ${fmtEth(confirmLoan.repaymentWei)} ETH`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </SharedLayout>
  );
}
