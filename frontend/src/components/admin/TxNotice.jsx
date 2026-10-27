import { txUrl } from "@/utils/web3Helpers";
import { link } from "./ui";

const WORDS = {
  pause: { doing: "Pausing the platform", done: "Platform paused.", verb: "pause the platform" },
  unpause: { doing: "Resuming the platform", done: "Platform resumed.", verb: "resume the platform" },
  limit: { doing: "Updating the limit", done: "Maximum loan amount updated.", verb: "update the limit" },
};

const box = "rounded-xl border p-4 text-sm font-medium flex flex-wrap items-center justify-between gap-3";

function EtherscanLink({ hash }) {
  return (
    <a className={link} href={txUrl(hash)} target="_blank" rel="noreferrer">
      View on Etherscan
    </a>
  );
}

export default function TxNotice({ pending, lastTx, onDismiss }) {
  if (pending) {
    const w = WORDS[pending.action];
    return (
      <div className={`${box} border-tide/25 bg-tide-wash text-tide`} role="status">
        <span className="flex items-center gap-3">
          <span
            className="inline-block h-4 w-4 rounded-full border-2 border-tide/25 border-t-tide animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          {pending.stage === "wallet"
            ? `Confirm in MetaMask to ${w.verb}.`
            : `${w.doing} on Sepolia. This usually takes under a minute.`}
        </span>
        {pending.hash && <EtherscanLink hash={pending.hash} />}
      </div>
    );
  }

  if (!lastTx) return null;
  const w = WORDS[lastTx.action];
  const ok = lastTx.ok;

  return (
    <div
      className={`${box} ${ok ? "border-lagoon/30 bg-lagoon-wash text-lagoon-deep" : "border-coral/30 bg-coral-wash text-coral-deep"}`}
      role={ok ? "status" : "alert"}
    >
      <span>{ok ? w.done : `Couldn't ${w.verb}. ${lastTx.message}`}</span>
      <span className="flex items-center gap-4">
        {lastTx.hash && <EtherscanLink hash={lastTx.hash} />}
        <button type="button" onClick={onDismiss} className="font-semibold cursor-pointer hover:opacity-70">
          Dismiss
        </button>
      </span>
    </div>
  );
}
