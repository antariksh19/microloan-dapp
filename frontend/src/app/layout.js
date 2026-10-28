import "./globals.css";
import { Space_Mono } from "next/font/google";

// Initialize the monospace font
const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
});

export const metadata = {
  title: "AegisLend | MicroLoan DApp",
  description: "Enterprise-grade decentralized peer-to-peer micro-lending protocol.",
};

export default function RootLayout({ children }) {
  return (
    // Inject the font variable into the HTML tag
    <html lang="en" className={spaceMono.variable}>
      <body className="w-full min-h-screen m-0 p-0 bg-[#07090e] text-slate-100 overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}