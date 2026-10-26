import Link from "next/link";

export default function HomePage() {
  return (
    <div style={{ textAlign: "center", marginTop: "4rem" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
        Welcome to MicroLoan dApp
      </h1>
      <p style={{ color: "#aaa", marginBottom: "2.5rem", fontSize: "1.1rem" }}>
        A decentralized peer-to-peer micro-lending platform powered by Ethereum Sepolia.
      </p>

      <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem" }}>
        <Link
          href="/borrower"
          style={{
            padding: "0.8rem 1.6rem",
            backgroundColor: "#2563eb",
            color: "white",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          Borrower Dashboard
        </Link>
        <Link
          href="/lender"
          style={{
            padding: "0.8rem 1.6rem",
            backgroundColor: "#059669",
            color: "white",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          Lender Dashboard
        </Link>
      </div>
    </div>
  );
}