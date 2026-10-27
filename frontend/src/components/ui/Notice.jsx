import { txUrl } from "@/utils/web3Helpers";
import { btn, linkClass } from "./styles";

const TONES = {
  success: "border-lagoon/30 bg-lagoon-wash text-lagoon-deep",
  error: "border-coral/30 bg-coral-wash text-coral-deep",
  warning: "border-sun/50 bg-sun-wash text-sun-ink",
  info: "border-tide/25 bg-tide-wash text-tide",
};

// tone: success | error | warning | info. Optional tx hash, action button and dismiss.
export default function Notice({ tone = "info", children, hash, busy, action, onDismiss }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border px-4 py-3 text-sm font-medium ${TONES[tone]}`}
    >
      <span className="flex items-center gap-2.5">
        {busy && (
          <span
            aria-hidden
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-tide/25 border-t-tide motion-reduce:animate-none"
          />
        )}
        <span>{children}</span>
      </span>
      <span className="flex items-center gap-3">
        {hash && (
          <a className={linkClass} style={{ color: "inherit" }} href={txUrl(hash)} target="_blank" rel="noreferrer">
            View on Etherscan
          </a>
        )}
        {action && (
          <button type="button" onClick={action.onClick} className={btn("ink", "sm")}>
            {action.label}
          </button>
        )}
        {onDismiss && (
          <button type="button" onClick={onDismiss} className="cursor-pointer font-semibold hover:opacity-70">
            Dismiss
          </button>
        )}
      </span>
    </div>
  );
}
