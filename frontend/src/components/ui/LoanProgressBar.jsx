import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export default function LoanProgressBar({ dueDate, status }) {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState("");
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    // We only show progress for Funded/Withdrawn loans.
    // If it's Repaid (3) or Defaulted (4), we don't need a ticking clock.
    if (status > 2) return; 

    const calculateProgress = () => {
      const now = new Date().getTime();
      const due = new Date(dueDate).getTime();
      
      // Assuming a standard 30-day loan for the visual baseline if we don't have the exact start date.
      // If your contract tracks the exact 'fundedAt' timestamp, you'd use that instead of this 30-day assumption.
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      const start = due - thirtyDaysInMs; 
      
      const totalDuration = due - start;
      const elapsed = now - start;

      if (now >= due) {
        setProgress(100);
        setTimeLeft("Overdue");
        setIsOverdue(true);
      } else {
        const percent = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
        setProgress(percent);
        setIsOverdue(false);

        // Calculate friendly time left
        const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
        if (diffDays > 1) {
          setTimeLeft(`${diffDays} days left`);
        } else {
          const diffHours = Math.ceil((due - now) / (1000 * 60 * 60));
          setTimeLeft(`${diffHours} hours left`);
        }
      }
    };

    calculateProgress();
    const interval = setInterval(calculateProgress, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [dueDate, status]);

  if (status > 2) {
    return <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">Resolved</span>;
  }

  // Determine colors based on risk
  const barColor = isOverdue ? "bg-rose-500 shadow-rose-500/50" : progress > 80 ? "bg-amber-500 shadow-amber-500/50" : "bg-blue-500 shadow-blue-500/50";
  const textColor = isOverdue ? "text-rose-400" : progress > 80 ? "text-amber-400" : "text-blue-400";

  return (
    <div className="w-full min-w-[120px] max-w-[150px] flex flex-col gap-1.5 mt-1">
      <div className="w-full bg-slate-800/80 rounded-full h-1.5 border border-white/5 overflow-hidden">
        <div 
          className={`h-full rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] transition-all duration-1000 ease-out ${barColor}`} 
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400 font-medium">{dueDate}</span>
        <span className={`text-[10px] font-bold flex items-center gap-1 ${textColor}`}>
          <Clock className="w-3 h-3" /> {timeLeft}
        </span>
      </div>
    </div>
  );
}