
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SharedLayout({
  children,
  account,
  onConnect,
  title,
  subtitle,
}) {
  const pathname = usePathname();

  const navItems = [
    { name: "Borrower Portal", path: "/borrower", icon: "↗" },
    { name: "Lender Portal", path: "/lender", icon: "◈" },
    { name: "Admin Panel", path: "/admin", icon: "⚙" },
  ];

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">M</span>
          <span>
            <strong>MicroLoan</strong>
            <small>DECENTRALIZED FINANCE</small>
          </span>
        </Link>

        <p className="nav-label">WORKSPACE</p>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const active = pathname === item.path;

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`nav-link ${active ? "active" : ""}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.name}</span>
                {active && <span className="nav-indicator" />}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="network-card">
            <span className="status-dot" />
            <span>
              <strong>Sepolia Testnet</strong>
              <small>Ethereum network</small>
            </span>
          </div>
          <p className="sidebar-caption">Secure lending. On-chain trust.</p>
        </div>
      </aside>

      <main className="app-main">
        <header className="topbar">
          <div className="page-heading">
            <p className="eyebrow">MICROLOAN PROTOCOL</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>

          <button className="wallet-button" onClick={onConnect}>
            <span className="wallet-dot" />
            {account
              ? `${account.slice(0, 6)}…${account.slice(-4)}`
              : "Connect Wallet"}
          </button>
        </header>

        <div className="page-content">{children}</div>

        <footer className="app-footer">
          <span>MicroLoan Protocol</span>
          <span>Powered by Ethereum Sepolia</span>
        </footer>
      </main>
    </div>
  );
}
