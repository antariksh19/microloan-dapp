import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, Globe } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-slate-100 relative selection:bg-blue-500 selection:text-white overflow-hidden">
      {/* Ambient Mesh Background */}
      <div className="mesh-bg">
        <div className="mesh-blob-1" style={{ top: '20%', left: '30%', width: '800px', height: '800px' }} />
        <div className="mesh-blob-2" style={{ bottom: '10%', right: '20%', width: '600px', height: '600px' }} />
      </div>

      <main className="z-10 flex flex-col items-center text-center max-w-4xl px-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-slate-300">Live on Sepolia Testnet</span>
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 bg-gradient-to-br from-white via-slate-200 to-slate-500 bg-clip-text text-transparent">
          Decentralized.<br/>Borderless. Secure.
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl font-medium leading-relaxed">
          AegisLend is an enterprise-grade P2P micro-lending protocol. Borrow against your reputation or earn fixed yields by funding the future of Web3.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/borrower" className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-2">
            Enter App <ArrowRight className="w-4 h-4" />
          </Link>
          <a href="https://sepolia.etherscan.io/" target="_blank" rel="noreferrer" className="px-8 py-4 rounded-2xl glass-card hover:bg-white/5 text-white font-bold text-sm uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2">
            View Smart Contract
          </a>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 mt-20 w-full">
          <div className="glass-card p-6 rounded-3xl border border-white/10 text-left">
            <ShieldCheck className="w-6 h-6 text-emerald-400 mb-4" />
            <h3 className="text-white font-bold mb-2">Trustless Escrow</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Smart contracts handle all fund custody. No intermediaries, no hidden fees.</p>
          </div>
          <div className="glass-card p-6 rounded-3xl border border-white/10 text-left">
            <Zap className="w-6 h-6 text-blue-400 mb-4" />
            <h3 className="text-white font-bold mb-2">Instant Settlement</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Borrower withdrawals and lender repayments execute immediately on-chain.</p>
          </div>
          <div className="glass-card p-6 rounded-3xl border border-white/10 text-left">
            <Globe className="w-6 h-6 text-indigo-400 mb-4" />
            <h3 className="text-white font-bold mb-2">Global Access</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Connect your Web3 wallet and participate from anywhere in the world.</p>
          </div>
        </div>
      </main>
    </div>
  );
}