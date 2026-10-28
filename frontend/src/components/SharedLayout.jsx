"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Wallet, LayoutDashboard, Landmark, ShieldCheck, Cpu } from "lucide-react";
import { Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useContractPaused } from "@/hooks/useContractPaused";
import { addressUrl, getContractAddress, shortAddress } from "@/utils/web3Helpers";

const CONTRACT_ADDRESS = getContractAddress();

const navItems = [
  { name: "Borrower Portal", href: "/borrower", icon: LayoutDashboard },
  { name: "Lender Portal", href: "/lender", icon: Landmark },
  { name: "Admin Panel", href: "/admin", icon: ShieldCheck },
];

function Banner({ tone, children }) {
  const styles = {
    error: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    warn: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  };
  return (
    <div role="status" className={`mb-6 rounded-2xl p-4 text-sm border backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 ${styles[tone]}`}>
      {children}
    </div>
  );
}

export default function SharedLayout({ account, onConnect, wrongNetwork, onSwitchNetwork, error, title, subtitle, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const paused = useContractPaused();

  // Fluid transition variants
  const pageVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 28, staggerChildren: 0.1 } }
  };

  const headerVariants = {
    initial: { opacity: 0, y: -15 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  return (
    <>
      <div className="min-h-screen w-full flex text-slate-100 relative selection:bg-blue-500 selection:text-white overflow-x-hidden">
        
        {/* Ambient Mesh Background */}
        <div className="mesh-bg">
          <div className="mesh-blob-1" />
          <div className="mesh-blob-2" />
        </div>

        {/* Sidebar Navigation */}
        <aside className="w-72 shrink-0 glass-card border-r border-white/10 hidden lg:flex flex-col justify-between p-6 z-20">
          <div>
            {/* Logo Brand */}
            <div className="flex items-center gap-3 px-2 mb-10 cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => router.push("/borrower")}>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Cpu className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  AegisLend
                </h1>
                <p className="text-xs font-medium text-emerald-400 flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Sepolia Testnet
                </p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-2">
              <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-3">Protocol Portals</p>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl font-medium text-sm transition-all duration-300 ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600/20 to-blue-500/10 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-900/20"
                        : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Footer Sidebar info */}
          <div className="glass-card p-4 rounded-2xl border border-white/5 bg-slate-900/40 transition-colors hover:border-white/10">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Smart Contract</span>
              <span className={`font-mono font-bold ${paused ? "text-amber-400" : "text-emerald-400"}`}>{paused ? "Paused" : "Live"}</span>
            </div>
            {CONTRACT_ADDRESS ? (
              <a href={addressUrl(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer" className="text-[11px] text-slate-500 hover:text-blue-400 font-mono truncate block">
                {shortAddress(CONTRACT_ADDRESS)}
              </a>
            ) : (
              <p className="text-[11px] text-rose-400">No contract address set</p>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 z-10">
          
          {/* Top Header Navbar */}
          <motion.header 
            variants={headerVariants}
            initial="initial"
            animate="animate"
            className="glass-card border-b border-white/10 px-8 py-5 flex items-center justify-between sticky top-0 z-30 backdrop-blur-xl"
          >
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">{title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            </div>

            <div className="flex items-center gap-4">
              {account ? (
                <div className="flex items-center gap-3 bg-slate-900/80 border border-white/10 px-4 py-2.5 rounded-2xl shadow-inner">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-xs font-bold text-slate-200">{shortAddress(account)}</span>
                </div>
              ) : (
                <button
                  onClick={onConnect}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all active:scale-95"
                >
                  <Wallet className="h-4 w-4" /> Connect Wallet
                </button>
              )}
            </div>
          </motion.header>

          {/* Mobile Tab Navigation */}
          <div className="flex lg:hidden bg-slate-900/80 border-b border-white/10 px-4 py-3 gap-2 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    isActive ? "bg-blue-600 text-white shadow-md" : "bg-white/5 text-slate-400"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Dynamic Page Children with Framer Motion */}
          <main className="flex-1 p-6 lg:p-10 w-full mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                className="w-full"
              >
                {wrongNetwork && (
                  <Banner tone="warn">
                    <span>MetaMask is on another network. Switch to Sepolia to use the platform.</span>
                    {onSwitchNetwork && (
                      <button onClick={onSwitchNetwork} className="rounded-xl bg-amber-500/20 px-4 py-2 text-xs font-bold hover:bg-amber-500/30">
                        Switch to Sepolia
                      </button>
                    )}
                  </Banner>
                )}
                {paused && (
                  <Banner tone="warn">
                    The platform is paused by the admin. New requests and funding are on hold. Withdrawals, repayments,
                    cancellations and refunds still work.
                  </Banner>
                )}
                {error && <Banner tone="error">{error}</Banner>}
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <Toaster 
        theme="dark" 
        position="bottom-right" 
        toastOptions={{
          className: "glass-card border-white/10 text-slate-200 font-medium backdrop-blur-2xl",
          style: { background: "rgba(15, 23, 42, 0.8)" }
        }} 
      />
    </>
  );
}