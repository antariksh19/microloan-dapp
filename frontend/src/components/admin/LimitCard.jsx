
"use client";

import { useState } from "react";
import { ethers } from "ethers";
import {
  card,
  cardTitle,
  cardSub,
  label,
  input,
  bigButton,
  chip,
} from "./ui";

const QUICK_PICKS = ["1", "5", "10"];

function parseAmount(text) {
  const t = text.trim();

  if (t === "") {
    return { error: "Enter an amount in ETH." };
  }

  try {
    const wei = ethers.parseEther(t);

    return wei > 0n
      ? { value: wei }
      : { error: "Enter an amount above 0." };
  } catch {
    return { error: "Enter an amount in ETH, like 5 or 0.5" };
  }
}

export default function LimitCard({
  maxLoanAmount,
  supported,
  canAct,
  pendingAction,
  onSave,
}) {
  const [draft, setDraft] = useState(null);

  if (!supported) {
    return (
      <section className={card}>
        <h3 className={cardTitle}>Maximum Loan Amount</h3>
        <p className={cardSub}>
          The ABI in constants/MicroLoanABI.json has no
          maxLoanAmount() or setMaxLoanAmount(). Regenerate it from
          the compiled contract.
        </p>
      </section>
    );
  }

  const current =
    maxLoanAmount === null ? "" : ethers.formatEther(maxLoanAmount);

  const value = draft ?? current;
  const parsed = parseAmount(value);
  const saving = pendingAction === "limit";

  const unchanged =
    parsed.value !== undefined &&
    maxLoanAmount !== null &&
    parsed.value === maxLoanAmount;

  const disabled =
    !canAct || saving || Boolean(parsed.error) || unchanged;

  const showError = draft !== null && parsed.error;

  const submit = (e) => {
    e.preventDefault();
    if (!disabled) onSave(parsed.value);
  };

  return (
    <section className={`${card} space-y-5`}>
      <div>
        <h3 className={cardTitle}>Maximum Loan Amount</h3>
        <p className={cardSub}>
          Borrowers can't request more than this in one loan.
        </p>
      </div>

      <div className="space-y-2.5 rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-300">Current limit</span>
          <span className="font-mono font-bold text-white">
            {maxLoanAmount === null ? "Unknown" : `${current} ETH`}
          </span>
        </div>
      </div>

      <form onSubmit={submit} noValidate className="space-y-5">
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <label htmlFor="max-loan" className={label}>
              New maximum (ETH)
            </label>

            <div className="flex gap-2">
              {QUICK_PICKS.map((pick) => (
                <button
                  key={pick}
                  type="button"
                  className={chip}
                  disabled={!canAct || saving}
                  onClick={() => setDraft(pick)}
                >
                  {pick} ETH
                </button>
              ))}
            </div>
          </div>

          <input
            id="max-loan"
            className={`${input} ${
              showError
                ? "border-rose-500 focus:ring-rose-500"
                : ""
            }`}
            inputMode="decimal"
            placeholder="5"
            value={value}
            disabled={!canAct || saving}
            aria-invalid={Boolean(showError)}
            aria-describedby="max-loan-help"
            onChange={(e) => setDraft(e.target.value)}
          />

          <p
            id="max-loan-help"
            className={`mt-2 text-xs ${
              showError
                ? "font-medium text-rose-300"
                : "text-slate-400"
            }`}
          >
            {showError ||
              "Applies to new requests only. Existing loans aren't affected."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={disabled}
            className={`${bigButton} flex-1 bg-violet-600 text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {saving ? "Updating…" : "Update Limit"}
          </button>

          {draft !== null && !saving && (
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="whitespace-nowrap rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800"
            >
              Discard
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
