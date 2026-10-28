"use client";
import { Clock } from "lucide-react";
import { STATUS, dueInfo, durationLabel, isActive } from "@/components/ui/format";
import { useNow } from "@/hooks/useNow";

// Shows how far through its term a loan is. dueTs is the on-chain due date in
// seconds; the term started at dueTs - duration, when the lender funded it.
export default function LoanProgressBar({ dueTs, duration, status }) {
  const now = useNow(60000);

  if (status === STATUS.Requested) {
    return <span className="text-[10px] text-slate-400 font-mono tracking-wider">{durationLabel(duration)} term, starts when funded</span>;
  }

  const info = dueInfo(dueTs, status, now);
  if (!isActive(status)) {
    return <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">{info.rel}</span>;
  }

  const start = dueTs - duration;
  const progress = Math.max(0, Math.min(100, ((now - start) / duration) * 100));
  const barColor = info.tone === "late" ? "bg-rose-500" : info.tone === "soon" ? "bg-amber-500" : "bg-blue-500";
  const textColor = info.tone === "late" ? "text-rose-400" : info.tone === "soon" ? "text-amber-400" : "text-blue-400";

  return (
    <div className="w-full min-w-[120px] max-w-[170px] flex flex-col gap-1.5 mt-1">
      <div className="w-full bg-slate-800/80 rounded-full h-1.5 border border-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-400 font-medium">{info.date}</span>
        <span className={`text-[10px] font-bold flex items-center gap-1 ${textColor}`}>
          <Clock className="w-3 h-3" /> {info.rel}
        </span>
      </div>
    </div>
  );
}
