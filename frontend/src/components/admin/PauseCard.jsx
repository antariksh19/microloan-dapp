
"use client";

import { card, cardTitle, cardSub, bigButton } from "./ui";

export default function PauseCard({
  paused,
  supported,
  canAct,
  pendingAction,
  onPause,
  onUnpause,
}) {
  if (!supported) {
    return (
      <section className={card}>
        <h3 className={cardTitle}>Platform Pause</h3>
        <p className={cardSub}>
          The ABI in constants/MicroLoanABI.json has no paused() or
          togglePause(). Regenerate it from the compiled contract.
        </p>
      </section>
    );
  }

  const unknown = paused === null;
  const working =
    pendingAction === "pause" || pendingAction === "unpause";

  let buttonText = paused ? "Resume Platform" : "Pause Platform";

  if (working) {
    buttonText =
      pendingAction === "pause" ? "Pausing…" : "Resuming…";
  }

  return (
    <section className={`${card} space-y-5`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className={cardTitle}>Platform Pause</h3>
          <p className={cardSub}>
            Stops all loan activity on the contract.
          </p>
        </div>

        {unknown ? (
          <span className="shrink-0 rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
            Checking…
          </span>
        ) : (
          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
              paused
                ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
            }`}
          >
            {paused ? "Paused" : "Running"}
          </span>
        )}
      </div>

      <p className="text-sm leading-relaxed text-slate-300">
        {unknown
          ? "Connect to Sepolia to read the current status."
          : paused
            ? "Every loan action is blocked right now, including repayments."
            : "Borrowers can request, withdraw and repay. Lenders can fund."}
      </p>

      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200">
        <p className="mb-1 font-semibold text-amber-300">
          Important warning
        </p>
        Pausing also blocks repay(). Due dates keep running while paused,
        so a long pause can push active loans past their due date. Keep
        pauses short.
      </div>

      {!unknown && (
        <button
          type="button"
          onClick={paused ? onUnpause : onPause}
          disabled={!canAct || working}
          className={`${bigButton} ${
            paused
              ? "bg-emerald-600 text-white hover:bg-emerald-500"
              : "bg-violet-600 text-white hover:bg-violet-500"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {buttonText}
        </button>
      )}
    </section>
  );
}
