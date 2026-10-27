"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletButton from "@/components/ui/WalletButton";
import { addressUrl, getContractAddress, shortAddress } from "@/utils/web3Helpers";

const NAV = [
  { name: "Borrow", href: "/borrower" },
  { name: "Lend", href: "/lender" },
  { name: "Admin", href: "/admin" },
];

function Mark() {
  // A loan going out and coming back: one ring closing on another.
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="12" cy="14" r="9" stroke="#0b5d57" strokeWidth="3" />
      <circle cx="18" cy="14" r="9" stroke="#10202b" strokeWidth="3" />
    </svg>
  );
}

export default function SharedLayout({ wallet, title, subtitle, actions, children }) {
  const pathname = usePathname();
  const contract = getContractAddress();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-ink">
            <Mark />
            MicroLoan
          </Link>

          <nav aria-label="Main" className="order-3 flex w-full gap-1 sm:order-none sm:w-auto">
            {NAV.map((item) => {
              const active = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                    active ? "bg-ink text-white" : "text-mute hover:bg-fog hover:text-ink"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto">
            <WalletButton wallet={wallet} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {(title || actions) && (
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
              {subtitle && <p className="mt-1.5 max-w-xl text-mute">{subtitle}</p>}
            </div>
            {actions}
          </div>
        )}
        <div className="space-y-5">{children}</div>
      </main>

      <footer className="border-t border-line bg-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-sm text-mute sm:px-6">
          <span>This runs on the Sepolia test network. The ETH has no real value.</span>
          {contract && (
            <a
              href={addressUrl(contract)}
              target="_blank"
              rel="noreferrer"
              className="font-mono underline underline-offset-2 hover:text-ink"
            >
              Contract {shortAddress(contract)}
            </a>
          )}
        </div>
      </footer>
    </div>
  );
}
