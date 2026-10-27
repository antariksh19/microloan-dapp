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
import { btn, panel } from "@/components/ui/styles";
import { dueInfo, fmtEth, formatDate, rewardPercent } from "@/components/ui/format";
import { useWallet } from "@/hooks/useWallet";
import { useLoans } from "@/hooks/useLoans";
import { useTxRunner } from "@/hooks/useTxRunner";
import { sameAddress } from "@/utils/web3Helpers";

export default function LenderPage() {
  const wallet = useWallet();
  const { account, chainId, onSepolia } = wallet;
  const { loans, balance, loaded, error, reload } = useLoans(account, chainId);
  const tx = useTxRunner({ getSigner: wallet.getSigner, onSepolia, reload });

  const [tab, setTab] = useState("market");
  const [modal, setModal] = useState(null); // { type: "fund" | "default", loan }

  const market = useMemo(() => loans.filter((l) => l.status === 0).sort((a, b) => b.id - a.id), [loans]);
  const mine = useMemo(
    () => loans.filter((l) => sameAddress(l.lender, account)).sort((a, b) => b.id - a.id),
    [loans, account]
  );
  const portfolio = mine.filter((l) => l.status === 1 || l.status === 2);
  const history = mine.filter((l) => l.status >= 3);

  const lentWei = portfolio.reduce((sum, l) => sum + l.principalWei, 0n);
  const expectedWei = portfolio.reduce((sum, l) => sum + l.repaymentWei, 0n);
  const earnedWei = history.filter((l) => l.status === 3).reduce((sum, l) => sum + (l.repaymentWei - l.principalWei), 0n);

  const open = (type, loan) => {
    tx.clear();
    setModal({ type, loan });
  };

  const confirm = async () => {
    const { type, loan } = modal;
    const ok =
      type === "fund"
        ? await tx.run(`fund-${loan.id}`, `You funded loan #${loan.id}. It's in your portfolio now.`, (c) =>
            c.fund(loan.id, { value: loan.principalWei })
          )
        : await tx.run(`default-${loan.id}`, `Loan #${loan.id} marked as defaulted.`, (c) => c.markDefault(loan.id));
    if (ok) {
      setModal(null);
      if (type === "fund") setTab("portfolio");
    }
  };

  const shown = tab === "market" ? market : tab === "portfolio" ? portfolio : history;
  const emptyCopy = {
    market: ["No requests to fund right now", "New borrower requests appear here as soon as they're posted."],
    portfolio: ["No active loans", "Fund a request from the Requests tab and track it here until it's repaid."],
    history: ["Nothing here yet", "Repaid and defaulted loans you funded are kept here."],
  }[tab];

  const loan = modal?.loan;
  const short = modal?.type === "fund" && balance !== null && loan && balance < loan.principalWei;

  return (
    <SharedLayout
      wallet={wallet}
      title="Lend"
      subtitle="Fund a small loan and earn the reward the borrower offers when they repay."
    >
      <MaintenanceBanner />
      {account && !onSepolia && (
        <Notice tone="warning" action={{ label: "Switch to Sepolia", onClick: wallet.switchToSepolia }}>
          MetaMask is on a different network. Switch to Sepolia to fund loans.
        </Notice>
      )}
      {wallet.error && <Notice tone="error">{wallet.error}</Notice>}
      {error && <Notice tone="error" action={{ label: "Try again", onClick: reload }}>{error}</Notice>}
      {tx.notice && !modal && (
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
          { label: "Lent out", value: account ? `${fmtEth(lentWei)} ETH` : "–", note: `${portfolio.length} active ${portfolio.length === 1 ? "loan" : "loans"}` },
          { label: "Expected back", value: account ? `${fmtEth(expectedWei)} ETH` : "–", note: "If every loan is repaid" },
          { label: "Earned so far", value: account ? `${fmtEth(earnedWei)} ETH` : "–", note: "From repaid loans", tone: earnedWei > 0n ? "text-lagoon" : undefined },
        ]}
      />

      <section className={`${panel} overflow-hidden`}>
        <div className="px-2">
          <Tabs
            label="Lending"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "market", label: "Requests", count: market.length },
              { id: "portfolio", label: "Your loans", count: account ? portfolio.length : 0 },
              { id: "history", label: "History", count: account ? history.length : 0 },
            ]}
          />
        </div>

        {tab !== "market" && !account ? (
          <EmptyState title="Connect your wallet" action={{ label: "Connect wallet", onClick: wallet.connect }}>
            The loans you fund are tied to your wallet address. Connect to see them.
          </EmptyState>
        ) : !loaded && !error ? (
          <p className="px-6 py-14 text-center text-sm text-mute" role="status">Loading loans…</p>
        ) : shown.length === 0 ? (
          <EmptyState title={emptyCopy[0]}>{emptyCopy[1]}</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((l) => {
              const due = dueInfo(l.dueTs, l.status);
              const own = sameAddress(l.borrower, account);
              return (
                <LoanRow
                  key={l.id}
                  loan={l}
                  counterparty={{ label: "Borrower", address: l.borrower }}
                  note={
                    l.status === 1
                      ? "Waiting for the borrower to withdraw."
                      : l.status === 2 && due.overdue
                        ? "Past due and not repaid. You can mark it as defaulted."
                        : undefined
                  }
                >
                  {l.status === 0 &&
                    (own ? (
                      <span className="text-sm font-medium text-mute">Your request</span>
                    ) : (
                      <button
                        type="button"
                        className={btn("primary", "sm")}
                        disabled={tx.busy !== null}
                        onClick={() => (account ? open("fund", l) : wallet.connect())}
                      >
                        {account ? "Fund this loan" : "Connect to fund"}
                      </button>
                    ))}
                  {l.status === 2 && due.overdue && sameAddress(l.lender, account) && (
                    <button type="button" className={btn("danger", "sm")} disabled={tx.busy !== null} onClick={() => open("default", l)}>
                      Mark as defaulted
                    </button>
                  )}
                </LoanRow>
              );
            })}
          </ul>
        )}
      </section>

      {modal && loan && (
        <Modal
          title={modal.type === "fund" ? `Fund loan #${loan.id}` : `Mark loan #${loan.id} as defaulted`}
          onClose={() => !tx.busy && setModal(null)}
        >
          {modal.type === "fund" ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-fog px-4 py-3 text-sm">
                <div className="flex justify-between"><span className="text-mute">You send</span><span className="font-semibold tabular-nums">{fmtEth(loan.principalWei)} ETH</span></div>
                <div className="mt-1 flex justify-between"><span className="text-mute">Reward{rewardPercent(loan.principalWei, loan.repaymentWei) ? ` (${rewardPercent(loan.principalWei, loan.repaymentWei)})` : ""}</span><span className="font-semibold tabular-nums text-lagoon">+{fmtEth(loan.repaymentWei - loan.principalWei)} ETH</span></div>
                <div className="mt-2 flex items-center justify-between border-t border-line pt-2"><span className="text-mute">You get back by {formatDate(loan.dueTs)}</span><span className="font-display text-lg font-semibold tabular-nums">{fmtEth(loan.repaymentWei)} ETH</span></div>
              </div>
              <p className="text-sm text-mute">
                The contract holds your ETH until the borrower withdraws it. Borrowers are anonymous wallets. If this one doesn&apos;t repay by the due date, you can mark the loan as defaulted, but the ETH isn&apos;t returned.
              </p>
              {short && <Notice tone="warning">Your wallet has {fmtEth(balance, 4)} ETH, which is less than the loan plus gas.</Notice>}
            </div>
          ) : (
            <p className="text-sm text-mute">
              This closes the loan as defaulted. It can&apos;t be repaid afterwards, and the {fmtEth(loan.principalWei)} ETH you lent isn&apos;t returned by the contract. This can&apos;t be undone.
            </p>
          )}

          {tx.notice && tx.notice.tone !== "success" && (
            <div className="mt-4"><Notice tone={tx.notice.tone} hash={tx.notice.hash} busy={tx.notice.tone === "info"}>{tx.notice.text}</Notice></div>
          )}

          <div className="mt-6 flex gap-3">
            <button type="button" className={`${btn("quiet")} flex-1`} disabled={tx.busy !== null} onClick={() => setModal(null)}>Not now</button>
            <button
              type="button"
              className={`${btn(modal.type === "fund" ? "primary" : "danger")} flex-1`}
              disabled={tx.busy !== null || short}
              onClick={confirm}
            >
              {tx.busy ? "Working…" : modal.type === "fund" ? `Fund ${fmtEth(loan.principalWei)} ETH` : "Mark as defaulted"}
            </button>
          </div>
        </Modal>
      )}
    </SharedLayout>
  );
}
