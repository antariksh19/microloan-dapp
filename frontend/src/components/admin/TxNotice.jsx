import styles from "./AdminPanel.module.css";
import { txUrl } from "../../lib/contract";

const WORDS = {
  pause: { doing: "Pausing lending", done: "Lending paused.", verb: "pause lending" },
  unpause: { doing: "Resuming lending", done: "Lending resumed.", verb: "resume lending" },
  limits: { doing: "Saving limits", done: "Limits saved.", verb: "save limits" },
};

export default function TxNotice({ pending, lastTx, onDismiss }) {
  if (pending) {
    const w = WORDS[pending.action];
    return (
      <div className={styles.notice} role="status">
        <p>
          <span className={styles.spinner} aria-hidden="true" />
          {pending.stage === "wallet"
            ? `Confirm in MetaMask to ${w.verb}.`
            : `${w.doing} on Sepolia. This usually takes under a minute.`}
        </p>
        {pending.hash && (
          <a className={styles.link} href={txUrl(pending.hash)} target="_blank" rel="noreferrer">
            View on Etherscan
          </a>
        )}
      </div>
    );
  }

  if (!lastTx) return null;
  const w = WORDS[lastTx.action];

  return (
    <div
      className={`${styles.notice} ${lastTx.ok ? styles.noticeOk : styles.noticeFail}`}
      role={lastTx.ok ? "status" : "alert"}
    >
      <p>{lastTx.ok ? w.done : `Couldn't ${w.verb}. ${lastTx.message}`}</p>
      <span className={styles.wallet}>
        {lastTx.hash && (
          <a className={styles.link} href={txUrl(lastTx.hash)} target="_blank" rel="noreferrer">
            View on Etherscan
          </a>
        )}
        <button type="button" className={styles.buttonQuiet} onClick={onDismiss}>
          Dismiss
        </button>
      </span>
    </div>
  );
}
