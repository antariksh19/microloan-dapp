import styles from "./AdminPanel.module.css";

export default function PauseSwitch({ paused, supported, canAct, pendingAction, onPause, onUnpause }) {
  if (!supported) {
    return (
      <section className={`${styles.breaker} ${styles.breakerUnknown}`}>
        <div>
          <h2 className={styles.breakerState}>No pause switch</h2>
          <p className={styles.breakerHint}>
            The contract ABI has no pause, unpause or paused function yet. Once MicroLoan
            inherits MicroLoanAdmin and is redeployed, this control turns on.
          </p>
        </div>
      </section>
    );
  }

  const unknown = paused === null;
  const tone = unknown ? styles.breakerUnknown : paused ? styles.breakerPaused : styles.breakerOpen;
  const working = pendingAction === "pause" || pendingAction === "unpause";

  let label = paused ? "Resume lending" : "Pause lending";
  if (pendingAction === "pause") label = "Pausing…";
  if (pendingAction === "unpause") label = "Resuming…";

  return (
    <section className={`${styles.breaker} ${tone}`} aria-live="polite">
      <div>
        <h2 className={styles.breakerState}>
          {unknown ? "Status unknown" : paused ? "Lending paused" : "Lending open"}
        </h2>
        <p className={styles.breakerHint}>
          {unknown
            ? "Connect to Sepolia to read the contract."
            : paused
              ? "New requests, funding and withdrawals are blocked. Borrowers can still repay."
              : "Borrowers can request loans and lenders can fund them."}
        </p>
      </div>

      {!unknown && (
        <button
          type="button"
          className={styles.switch}
          onClick={paused ? onUnpause : onPause}
          disabled={!canAct || working}
        >
          <span className={`${styles.track} ${paused ? styles.trackOff : ""}`} aria-hidden="true">
            <span className={styles.thumb} />
          </span>
          {label}
        </button>
      )}
    </section>
  );
}
