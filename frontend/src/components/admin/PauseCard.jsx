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

  let buttonText = paused ? "Resume platform" : "Pause platform";
  if (working) buttonText = pendingAction === "pause" ? "Pausing…" : "Resuming…";

  return (
    <section className={`${card} space-y-5`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className={cardTitle}>Platform Pause</h3>
          <p className={cardSub}>Holds new loan activity while you investigate a problem.</p>
        </div>
        {!unknown && (
          <span
            className={`shrink-0 px-3 py-1 text-xs font-semibold rounded-full border ${
              paused
                ? "bg-sun-wash text-sun-ink border-sun/50"
                : "bg-lagoon-wash text-lagoon-deep border-lagoon/30"
            }`}
          >
            {paused ? "Paused" : "Running"}
          </span>
        )}
      </div>

      <p className="text-sm text-mute leading-relaxed">
        {unknown
          ? "Connect to Sepolia to read the current status."
          : paused
            ? "New requests, funding and withdrawals are blocked. Borrowers can still repay and cancel."
            : "Borrowers can request, withdraw, repay and cancel. Lenders can fund."}
      </p>

      <div className="rounded-xl border border-sun/50 bg-sun-wash p-4 text-xs text-sun-ink leading-relaxed">
        Repayments, cancellations and default marking keep working while paused, so a pause never makes a
        borrower miss a due date.
      </div>

      {!unknown && (
        <button
          type="button"
          onClick={paused ? onUnpause : onPause}
          disabled={!canAct || working}
          className={`${bigButton} ${
            paused ? "bg-lagoon hover:bg-lagoon-deep" : "bg-coral hover:bg-coral-deep"
          }`}
        >
          {buttonText}
        </button>
      )}
    </section>
  );
}
