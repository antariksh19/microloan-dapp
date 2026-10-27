import { useState } from "react";
import { ethers } from "ethers";
import { card, cardTitle, cardSub, label, input, bigButton, chip } from "./ui";

const QUICK_PICKS = ["1", "5", "10"];

function parseAmount(text) {
  const t = text.trim();
  if (t === "") return { error: "Enter an amount in ETH." };
  try {
    const wei = ethers.parseEther(t);
    // 0 would block every request. Use the pause switch for that instead.
    return wei > 0n ? { value: wei } : { error: "Enter an amount above 0." };
  } catch {
    return { error: "Enter an amount in ETH, like 5 or 0.5" };
  }
}

// The parent remounts this card (via key) after a successful save,
// which resets the draft to the on-chain value.
export default function LimitCard({ maxLoanAmount, supported, canAct, pendingAction, onSave }) {
  const [draft, setDraft] = useState(null);

  if (!supported) {
    return (
      <section className={card}>
        <h3 className={cardTitle}>Maximum Loan Amount</h3>
        <p className={cardSub}>
          The ABI in constants/MicroLoanABI.json has no maxLoanAmount() or setMaxLoanAmount().
          Regenerate it from the compiled contract.
        </p>
      </section>
    );
  }

  const current = maxLoanAmount === null ? "" : ethers.formatEther(maxLoanAmount);
  const value = draft ?? current;
  const parsed = parseAmount(value);
  const saving = pendingAction === "limit";
  const unchanged = parsed.value !== undefined && parsed.value === maxLoanAmount;
  const disabled = !canAct || saving || Boolean(parsed.error) || unchanged;
  const showError = draft !== null && parsed.error;

  const submit = (e) => {
    e.preventDefault();
    if (!disabled) onSave(parsed.value);
  };

  return (
    <section className={`${card} space-y-5`}>
      <div>
        <h3 className={cardTitle}>Maximum Loan Amount</h3>
        <p className={cardSub}>Borrowers can&apos;t request more than this in one loan.</p>
      </div>

      <div className="space-y-2.5 bg-fog p-4 rounded-xl border border-line text-sm">
        <div className="flex justify-between text-mute">
          <span>Current limit</span>
          <span className="font-mono font-bold text-ink">
            {maxLoanAmount === null ? "Unknown" : `${current} ETH`}
          </span>
        </div>
      </div>

      <form onSubmit={submit} noValidate className="space-y-5">
        <div>
          <div className="flex justify-between items-center mb-2">
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
            className={`${input} ${showError ? "border-coral" : ""}`}
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
            className={`text-xs mt-2 ${showError ? "text-coral-deep font-medium" : "text-mute"}`}
          >
            {showError || "Applies to new requests only. Existing loans aren't affected."}
          </p>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={disabled} className={`${bigButton} bg-lagoon hover:bg-lagoon-deep`}>
            {saving ? "Updating…" : "Update limit"}
          </button>
          {draft !== null && !saving && (
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="px-5 py-2.5 border border-line font-semibold text-sm rounded-xl hover:bg-fog transition-all text-ink cursor-pointer whitespace-nowrap"
            >
              Discard
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
