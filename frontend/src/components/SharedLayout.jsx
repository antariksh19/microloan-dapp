"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SharedLayout({ children, account, onConnect, title, subtitle }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Borrower Portal", path: "/borrower", icon: "👤" },
    { name: "Lender Portal", path: "/lender", icon: "🏦" },
    { name: "Admin Panel", path: "/admin", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 bg-[#0f172a] text-white md:flex flex-col shadow-xl z-20">
        <div className="border-b border-slate-800 p-6">
          <h1 className="text-2xl font-bold tracking-wide">MicroLoan</h1>
          <p className="mt-1 text-sm text-blue-400 font-medium">Enterprise dApp</p>
        </div>
        <nav className="flex-1 p-4 space-y-3 mt-4">
          {navItems.map((item) => {
            const isActive = pathname.toLowerCase().includes(item.path.toLowerCase());
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex items-center gap-3 w-full rounded-xl px-4 py-3.5 text-sm font-medium transition-all ${
                  isActive 
                    ? "bg-blue-600 text-white shadow-md" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-5 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-3 py-2 rounded-lg justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Sepolia Testnet
          </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 min-h-screen flex flex-col relative">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-8 py-5 sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          </div>
          <button
            onClick={onConnect}
            className="rounded-xl bg-slate-900 px-6 py-2.5 font-semibold text-white shadow-sm hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2"
          >
            {account ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                {`${account.slice(0, 6)}...${account.slice(-4)}`}
              </>
            ) : (
              "Connect Wallet"
            )}
          </button>
        </header>
        <div className="p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}