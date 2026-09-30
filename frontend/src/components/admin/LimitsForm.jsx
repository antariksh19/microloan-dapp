import { useState } from "react";
import { ethers } from "ethers";
import styles from "./AdminPanel.module.css";

const DAY = 86400;

function toDays(seconds) {
  const d = Number(seconds) / DAY;
  return Number.isInteger(d) ? String(d) : d.toFixed(2).replace(/\.?0+$/, "");
}

function describeLimit(value, format) {
  if (value === null) return "Unknown";
  return value === 0n ? "No limit" : format(value);
}

function parsePrincipal(text) {
  if (text.trim() === "") return { value: 0n };
  try {
    const wei = ethers.parseEther(text.trim());
    return wei < 0n ? { error: "Enter an amount of zero or more." } : { value: wei };
  } catch {
    return { error: "Enter an amount in ETH, like 0.5" };
  }
}

function parseDays(text) {
  if (text.trim() === "") return { value: 0n };
  const days = Number(text);
  if (!Number.isFinite(days) || days < 0) return { error: "Enter a number of days, like 30" };
  return { value: BigInt(Math.round(days * DAY)) };
}

export default function LimitsForm({
  maxPrincipal,
  maxDuration,
  supported,
  canAct,
  pendingAction,
  savedHash,
  onSave,
}) {
  // What the admin has typed, or null to show the on-chain values.
  const [draft, setDraft] = useState(null);
  const [seenHash, setSeenHash] = useState(savedHash);

  // After a successful save, go back to showing on-chain values.
  // A failed save keeps what the admin typed so they can fix it and retry.
  if (savedHash !== seenHash) {
    setSeenHash(savedHash);
    if (savedHash) setDraft(null);
  }

  const dirty = draft !== null;
  const principal = dirty
    ? draft.principal
    : maxPrincipal === null || maxPrincipal === 0n
      ? ""
      : ethers.formatEther(maxPrincipal);
  const days = dirty
    ? draft.days
    : maxDuration === null || maxDuration === 0n
      ? ""
      : toDays(maxDuration);

  if (!supported) {
    return (
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Loan limits</h2>
        <p className={styles.missing}>
          The contract ABI has no maxPrincipal, maxDuration or setLimits function yet.
        </p>
      </section>
    );
  }

  const p = parsePrincipal(principal);
  const d = parseDays(days);
  const unchanged = p.value === maxPrincipal && d.value === maxDuration;
  const saving = pendingAction === "limits";
  const disabled = !canAct || saving || Boolean(p.error || d.error) || unchanged;

  const submit = (e) => {
    e.preventDefault();
    if (!disabled) onSave(p.value, d.value);
  };

  const reset = () => {
    setDraft(null);
  };

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Loan limits</h2>
      <p className={styles.panelIntro}>Checked when a borrower submits a request.</p>

      <dl className={styles.current}>
        <dt>Largest loan</dt>
        <dd>{describeLimit(maxPrincipal, (v) => `${ethers.formatEther(v)} ETH`)}</dd>
        <dt>Longest term</dt>
        <dd>{describeLimit(maxDuration, (v) => `${toDays(v)} days`)}</dd>
      </dl>

      <form onSubmit={submit} noValidate>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Largest loan</span>
          <span className={styles.inputRow}>
            <input
              className={styles.input}
              inputMode="decimal"
              placeholder="No limit"
              value={principal}
              disabled={!canAct || saving}
              aria-invalid={Boolean(p.error)}
              onChange={(e) => setDraft({ principal: e.target.value, days })}
            />
            <span className={styles.unit}>ETH</span>
          </span>
          {p.error ? (
            <span className={styles.fieldError}>{p.error}</span>
          ) : (
            <span className={styles.fieldHelp}>Leave empty for no limit.</span>
          )}
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Longest term</span>
          <span className={styles.inputRow}>
            <input
              className={styles.input}
              inputMode="decimal"
              placeholder="No limit"
              value={days}
              disabled={!canAct || saving}
              aria-invalid={Boolean(d.error)}
              onChange={(e) => setDraft({ principal, days: e.target.value })}
            />
            <span className={styles.unit}>days</span>
          </span>
          {d.error ? (
            <span className={styles.fieldError}>{d.error}</span>
          ) : (
            <span className={styles.fieldHelp}>Counted from the moment the loan is requested.</span>
          )}
        </label>

        <div className={styles.formActions}>
          <button type="submit" className={styles.button} disabled={disabled}>
            {saving ? "Saving…" : "Save limits"}
          </button>
          {dirty && !saving && (
            <button type="button" className={styles.buttonQuiet} onClick={reset}>
              Discard changes
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
