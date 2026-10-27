"use client";
import Link from "next/link";
import SharedLayout from "@/components/SharedLayout";
import MaintenanceBanner from "@/components/MaintenanceBanner";
import LoanTrack from "@/components/ui/LoanTrack";
import Ledger from "@/components/ui/Ledger";
import { btn, panel } from "@/components/ui/styles";
import { fmtEth } from "@/components/ui/format";
import { useWallet } from "@/hooks/useWallet";
import { useLoans } from "@/hooks/useLoans";
import { useContractPaused } from "@/hooks/useContractPaused";

const STEPS = [
  ["Borrower posts a request", "They choose the amount, the reward they'll pay, and a due date."],
  ["A lender funds it", "The lender sends the exact amount. The contract holds it."],
  ["Borrower withdraws", "The funds move to the borrower's wallet."],
  ["Borrower repays", "The contract sends the amount plus reward straight to the lender."],
];

export default function HomePage() {
  const wallet = useWallet();
  const { loans, maxLoanWei, loaded } = useLoans(wallet.account, wallet.chainId);
  const paused = useContractPaused();
  const open = loans.filter((l) => l.status === 0).length;
  const dash = (v) => (loaded ? v : "–");

  return (
    <SharedLayout wallet={wallet}>
      <MaintenanceBanner />

      <section className="grid items-center gap-10 py-6 lg:grid-cols-[1.15fr_1fr] lg:py-10">
        <div>
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl">
            Small loans, straight between people.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-mute">
            Borrow a little ETH for a few weeks, or lend some and earn the reward the borrower offers. A smart
            contract on Sepolia holds the money and enforces the terms. Nobody in the middle.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/borrower" className={btn("primary", "lg")}>Borrow</Link>
            <Link href="/lender" className={btn("quiet", "lg")}>Lend</Link>
          </div>
        </div>

        <div className={`${panel} p-6 shadow-sm`} aria-label="Example loan">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-mute">Example loan</p>
              <p className="font-display text-4xl font-semibold tabular-nums">0.5 ETH</p>
              <p className="text-sm text-mute">Repays 0.55 ETH, 10% more</p>
            </div>
          </div>
          <div className="mt-8">
            <LoanTrack status={2} />
          </div>
          <p className="mt-4 text-center text-sm text-mute">Every loan moves along this rail, from request to repayment.</p>
        </div>
      </section>

      <Ledger
        items={[
          { label: "Loans created", value: dash(loans.length.toString()), note: "On this contract" },
          { label: "Waiting for a lender", value: dash(open.toString()), note: "Open requests" },
          { label: "Largest loan", value: dash(maxLoanWei === null ? "–" : `${fmtEth(maxLoanWei)} ETH`), note: "Set by the admin" },
          { label: "Platform", value: dash(paused ? "Paused" : "Running"), tone: loaded && paused ? "text-sun-ink" : undefined },
        ]}
      />

      <section className="grid gap-8 pt-8 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight">How a loan works</h2>
          <p className="mt-3 max-w-sm text-mute">
            Lending to an anonymous wallet carries risk. If a borrower doesn&apos;t repay, the contract can mark the
            loan as defaulted, but it can&apos;t get the money back.
          </p>
        </div>
        <ol className={`${panel} divide-y divide-line`}>
          {STEPS.map(([title, text], i) => (
            <li key={title} className="flex gap-4 px-5 py-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lagoon-wash font-display text-sm font-semibold text-lagoon-deep">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold text-ink">{title}</h3>
                <p className="text-sm text-mute">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </SharedLayout>
  );
}
