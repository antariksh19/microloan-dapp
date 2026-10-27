
import "./globals.css";

export const metadata = {
  title: "MicroLoan | Decentralized Lending",
  description:
    "A peer-to-peer micro-lending dApp powered by Ethereum smart contracts.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
