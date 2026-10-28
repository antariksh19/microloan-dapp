"use client";
// Building blocks shared by the borrower, lender and admin dashboards.
import CountUp from "react-countup";
import { motion, AnimatePresence } from "framer-motion";
import { STATUS_LABEL, STATUS_STYLE } from "@/components/ui/format";

// Full class names so Tailwind can see them.
const ACCENTS = {
  blue: { hover: "hover:border-blue-500/30", glow: "bg-blue-500/10 group-hover:bg-blue-500/20", badge: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  indigo: { hover: "hover:border-indigo-500/30", glow: "bg-indigo-500/10 group-hover:bg-indigo-500/20", badge: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  amber: { hover: "hover:border-amber-500/30", glow: "bg-amber-500/10 group-hover:bg-amber-500/20", badge: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  emerald: { hover: "hover:border-emerald-500/30", glow: "bg-emerald-500/10 group-hover:bg-emerald-500/20", badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  rose: { hover: "hover:border-rose-500/30", glow: "bg-rose-500/10 group-hover:bg-rose-500/20", badge: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
};

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };
const backdrop = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const pop = { hidden: { scale: 0.95, opacity: 0, y: 20 }, visible: { scale: 1, opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } } };

export function StatGrid({ columns = "lg:grid-cols-4", children }) {
  return (
    <motion.section variants={stagger} initial="hidden" animate="show" className={`grid gap-6 sm:grid-cols-2 ${columns} mb-10`}>
      {children}
    </motion.section>
  );
}

// value is a number for an animated count, or any node to show as-is.
export function StatCard({ label, icon, value, decimals = 0, prefix, unit, badge, accent = "blue", valueClass = "text-white", children }) {
  const a = ACCENTS[accent];
  return (
    <motion.div variants={rise} className={`glass-card p-6 rounded-3xl relative overflow-hidden group transition-all ${a.hover}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl transition-all ${a.glow}`} />
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">{icon}{label}</p>
      <div className="mt-3 flex items-baseline gap-1">
        {prefix && <span className={`text-3xl font-black font-mono tracking-tight ${valueClass}`}>{prefix}</span>}
        <h3 className={`text-3xl font-black font-mono tracking-tight ${valueClass}`}>
          {typeof value === "number" ? <CountUp end={value} decimals={decimals} duration={1.5} separator="," preserveValue /> : value}
        </h3>
        {unit && <span className="text-sm font-bold text-slate-500">{unit}</span>}
      </div>
      {badge && <span className={`inline-block mt-2 text-[11px] font-medium px-2.5 py-1 rounded-full border ${a.badge}`}>{badge}</span>}
      {children}
    </motion.div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex space-x-6 border-b border-white/10 mb-8 px-2 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`pb-3 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors ${
            active === tab.id ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function Panel({ title, subtitle, action, children }) {
  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-10 glass-card rounded-3xl overflow-hidden border border-white/10">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 p-6">
        <div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </motion.section>
  );
}

export function LoanTable({ columns, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-slate-900/40 text-[11px] uppercase text-slate-400 font-semibold border-b border-white/5">
          <tr>{columns.map((c) => <th key={c} className="px-6 py-4">{c}</th>)}</tr>
        </thead>
        <tbody className="text-sm divide-y divide-white/5">{children}</tbody>
      </table>
    </div>
  );
}

export function StatusPill({ status }) {
  return (
    <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${STATUS_STYLE[status] ?? STATUS_STYLE[4]}`}>
      {STATUS_LABEL[status] ?? "Unknown"}
    </span>
  );
}

export function Modal({ open, title, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={backdrop}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4"
        >
          <motion.div
            variants={pop}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md glass-card p-8 rounded-3xl border border-white/10 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">{title}</h3>
              <button onClick={onClose} aria-label="Close" className="text-2xl text-slate-400 hover:text-white transition-colors">&times;</button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// A label / value line inside a modal summary box.
export function SummaryRow({ label, children, strong }) {
  return (
    <div className={`flex justify-between items-center ${strong ? "pt-1" : "text-xs text-slate-400"}`}>
      <span className={strong ? "font-bold text-slate-200 text-xs uppercase" : ""}>{label}</span>
      <span className={strong ? "text-lg font-black text-blue-400 font-mono" : "font-semibold text-white font-mono"}>{children}</span>
    </div>
  );
}

const BUTTON = {
  primary: "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/30",
  success: "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20",
  danger: "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20",
  ghost: "bg-white/5 text-slate-300 hover:bg-white/10",
};

export function ActionButton({ variant = "primary", busy, busyText = "Working...", className = "", children, ...props }) {
  return (
    <button
      {...props}
      disabled={busy || props.disabled}
      className={`rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${BUTTON[variant]} ${className}`}
    >
      {busy ? busyText : children}
    </button>
  );
}

export function ConnectPrompt({ text, onConnect, connecting }) {
  return (
    <div className="flex flex-col items-center gap-4 p-12 text-center">
      <p className="text-sm text-slate-400 max-w-sm">{text}</p>
      {onConnect && (
        <ActionButton onClick={onConnect} busy={connecting} busyText="Connecting...">
          Connect Wallet
        </ActionButton>
      )}
    </div>
  );
}
