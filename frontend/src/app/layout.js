import Link from "next/link";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });

export const metadata = {
  title: "MicroLoan: small loans between people",
  description: "Borrow and lend small amounts of ETH directly, with terms enforced by a smart contract on Sepolia.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        {children}

        {process.env.NODE_ENV === "development" && (
          <nav
            aria-label="Developer shortcuts"
            className="fixed bottom-4 right-4 z-50 flex gap-4 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white shadow-lg"
          >
            <Link href="/borrower">Borrower</Link>
            <Link href="/lender">Lender</Link>
            <Link href="/admin">Admin</Link>
          </nav>
        )}
      </body>
    </html>
  );
}
