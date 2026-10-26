import { card, cardTitle, cardSub, bigButton } from "./ui";

export default function PauseCard({ paused, supported, canAct, pendingAction, onPause, onUnpause }) {
  if (!supported) {
    return (
      <section className={card}>
        <h3 className={cardTitle}>Platform Pause</h3>
        <p className={cardSub}>
          The ABI in constants/MicroLoanABI.json has no paused() or togglePause(). Regenerate it from
          the compiled contract.
        </p>
      </section>
    );
  }

  const unknown = paused === null;
  const working = pendingAction === "pause" || pendingAction === "unpause";

  let buttonText = paused ? "Resume Platform" : "Pause Platform";
  if (working) buttonText = pendingAction === "pause" ? "Pausing…" : "Resuming…";

  return (
    <section className={`${card} space-y-5`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className={cardTitle}>Platform Pause</h3>
          <p className={cardSub}>Stops all loan activity on the contract.</p>
        </div>
        {!unknown && (
          <span
            className={`shrink-0 px-3 py-1 text-xs font-semibold rounded-full border ${
              paused
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {paused ? "Paused" : "Running"}
          </span>
        )}
      </div>

      <p className="text-sm text-slate-600 leading-relaxed">
        {unknown
          ? "Connect to Sepolia to read the current status."
          : paused
            ? "Every loan action is blocked right now, including repayments."
            : "Borrowers can request, withdraw and repay. Lenders can fund."}
      </p>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 leading-relaxed">
        Pausing also blocks repay(). Due dates keep running while paused, so a long pause can push
        active loans past their due date. Keep pauses short.
      </div>

      {!unknown && (
        <button
          type="button"
          onClick={paused ? onUnpause : onPause}
          disabled={!canAct || working}
          className={`${bigButton} ${
            paused ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
          }`}
        >
          {buttonText}
        </button>
      )}
    </section>
  );
}
