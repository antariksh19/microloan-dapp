"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Wallet, LayoutDashboard, Landmark, ShieldCheck, Cpu } from "lucide-react";
import { Toaster } from "sonner";

export default function SharedLayout({ account, onConnect, title, subtitle, children }) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { name: "Borrower Portal", href: "/borrower", icon: LayoutDashboard },
    { name: "Lender Portal", href: "/lender", icon: Landmark },
    { name: "Admin Panel", href: "/admin", icon: ShieldCheck },
  ];

  const shortenAddress = (addr) => (addr ? `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}` : "");

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
            <div className="flex items-center gap-3 px-2 mb-10 cursor-pointer" onClick={() => router.push("/borrower")}>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Cpu className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  AegisLend
                </h1>
                <p className="text-xs font-medium text-emerald-400 flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Sepolia Mainnet
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
          <div className="glass-card p-4 rounded-2xl border border-white/5 bg-slate-900/40">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Smart Contract</span>
              <span className="text-emerald-400 font-mono font-bold">Secure</span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono truncate">0x3a0A...8BACf</p>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 z-10">
          
          {/* Top Header Navbar */}
          <header className="glass-card border-b border-white/10 px-8 py-5 flex items-center justify-between sticky top-0 z-30 backdrop-blur-xl">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">{title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            </div>

            <div className="flex items-center gap-4">
              {account ? (
                <div className="flex items-center gap-3 bg-slate-900/80 border border-white/10 px-4 py-2.5 rounded-2xl shadow-inner">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-xs font-bold text-slate-200">{shortenAddress(account)}</span>
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
          </header>

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

          {/* Dynamic Page Children */}
          <main className="flex-1 p-6 lg:p-10 w-full mx-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Glassmorphism Toaster (Now safely outside the flexbox layout) */}
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