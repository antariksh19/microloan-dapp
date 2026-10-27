import LoanTrack from "@/components/ui/LoanTrack";
import { dueInfo, fmtEth, rewardPercent } from "@/components/ui/format";
import { shortAddress, addressUrl } from "@/utils/web3Helpers";

const DUE_TONE = { ok: "text-mute", soon: "text-sun-ink font-semibold", late: "text-coral-deep font-semibold", done: "text-mute" };

// One loan: amounts on the left, its progress rail in the middle, actions on the right.
// counterparty: { label, address } shown under the amount, or null.
export default function LoanRow({ loan, counterparty, note, children }) {
  const due = dueInfo(loan.dueTs, loan.status);
  const pct = rewardPercent(loan.principalWei, loan.repaymentWei);

  return (
    <li className="grid gap-4 px-5 py-5 md:grid-cols-[12rem_1fr_auto] md:items-center md:gap-6">
      <div>
        <p className="text-sm text-mute">Loan #{loan.id}</p>
        <p className="font-display text-2xl font-semibold tabular-nums">{fmtEth(loan.principalWei)} ETH</p>
        <p className="text-sm tabular-nums text-mute">
          Repays {fmtEth(loan.repaymentWei)} ETH{pct ? `, ${pct} more` : ""}
        </p>
        {counterparty && (
          <p className="mt-1 text-xs text-mute">
            {counterparty.address ? (
              <>
                {counterparty.label}{" "}
                <a
                  className="font-mono underline underline-offset-2 hover:text-ink"
                  href={addressUrl(counterparty.address)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shortAddress(counterparty.address)}
                </a>
              </>
            ) : (
              counterparty.empty
            )}
          </p>
        )}
      </div>

      <div>
        <LoanTrack status={loan.status} />
        <p className={`mt-3 text-center text-sm ${DUE_TONE[due.tone]}`}>{due.text}</p>
        {note && <p className="mt-1 text-center text-xs text-mute">{note}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2 md:justify-end">{children}</div>
    </li>
  );
}
