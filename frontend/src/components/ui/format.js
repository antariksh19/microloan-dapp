import { ethers } from "ethers";

// Wei to a short ETH string: "1.1", "0.0005", never "1.100000000000000000".
export function fmtEth(wei, maxDecimals = 6) {
  if (wei === null || wei === undefined) return "–";
  const [whole, frac = ""] = ethers.formatEther(wei).split(".");
  const trimmed = frac.slice(0, maxDecimals).replace(/0+$/, "");
  if (!trimmed && wei > 0n && whole === "0") return `<0.${"0".repeat(maxDecimals - 1)}1`;
  return trimmed ? `${whole}.${trimmed}` : whole;
}

// Parses what a person typed into wei. Returns null if it isn't a plain decimal number.
export function parseEthInput(text) {
  const t = String(text ?? "").trim();
  if (!/^(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  try {
    return ethers.parseEther(t.startsWith(".") ? `0${t}` : t);
  } catch {
    return null; // more than 18 decimals
  }
}

export function formatDate(ts) {
  return new Date(ts * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function span(seconds) {
  const s = Math.abs(seconds);
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min`;
  if (s < 48 * 3600) {
    const h = Math.round(s / 3600);
    return `${h} ${h === 1 ? "hour" : "hours"}`;
  }
  const d = Math.round(s / 86400);
  return `${d} days`;
}

// A loan term in seconds as words: "30 days", "12 hours".
export function durationLabel(seconds) {
  return span(seconds);
}

// Plain-language due status. tone drives the colour: ok, soon, late, done.
// rel is the short form ("in 7 days", "2 days overdue") for compact spots.
// nowTs lets a caller that re-renders on a timer pass its own clock.
export function dueInfo(dueTs, status, nowTs = Math.floor(Date.now() / 1000)) {
  const date = dueTs ? formatDate(dueTs) : "";
  if (status === STATUS.Requested) return { text: "Clock starts when funded", rel: "Not funded", date, tone: "done", overdue: false };
  if (status === STATUS.Repaid) return { text: `Repaid. Was due ${date}`, rel: "Repaid", date, tone: "done", overdue: false };
  if (status === STATUS.Defaulted) return { text: `Defaulted. Was due ${date}`, rel: "Defaulted", date, tone: "late", overdue: true };
  if (status === STATUS.Cancelled) return { text: "Cancelled before funding", rel: "Cancelled", date, tone: "done", overdue: false };
  if (status === STATUS.Refunded) return { text: `Never withdrawn. Refunded to lender`, rel: "Refunded", date, tone: "done", overdue: false };
  const diff = dueTs - nowTs;
  if (diff < 0) {
    return { text: `Overdue by ${span(diff)}. Was due ${date}`, rel: `${span(diff)} overdue`, date, tone: "late", overdue: true };
  }
  return {
    text: `Due ${date}, in ${span(diff)}`,
    rel: `in ${span(diff)}`,
    date,
    tone: diff < 48 * 3600 ? "soon" : "ok",
    overdue: false,
  };
}

// "10%" style return for a loan, from wei amounts.
export function rewardPercent(principalWei, repaymentWei) {
  if (!principalWei || principalWei === 0n || repaymentWei < principalWei) return null;
  const bps = ((repaymentWei - principalWei) * 10000n) / principalWei;
  const pct = Number(bps) / 100;
  return `${pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2).replace(/0$/, "")}%`;
}

// Matches the Status enum in backend/contracts/MicroLoan.sol.
export const STATUS = { Requested: 0, Funded: 1, Withdrawn: 2, Repaid: 3, Defaulted: 4, Cancelled: 5, Refunded: 6 };

export const STATUS_LABEL = ["Requested", "Funded", "Withdrawn", "Repaid", "Defaulted", "Cancelled", "Refunded"];

export const STATUS_STYLE = [
  "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  "bg-slate-800 text-slate-400 border border-slate-700",
  "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  "bg-slate-800 text-slate-500 border border-slate-700",
  "bg-slate-800 text-slate-400 border border-slate-700",
];

export const isActive = (status) => status === STATUS.Funded || status === STATUS.Withdrawn;
