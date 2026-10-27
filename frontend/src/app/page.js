
import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Borrow with clarity",
    description:
      "Create a loan request, review repayment terms, and track your loan activity on-chain.",
  },
  {
    number: "02",
    title: "Lend with purpose",
    description:
      "Explore open requests, choose a loan to fund, and monitor your lending activity.",
  },
  {
    number: "03",
    title: "Transparent by design",
    description:
      "Wallet-based access and blockchain transactions keep the lending process verifiable.",
  },
];

export default function HomePage() {
  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <Link href="/" className="brand landing-brand">
          <span className="brand-mark">M</span>
          <strong>MicroLoan</strong>
        </Link>
        <span className="landing-network">
          <span className="status-dot" />
          Built on Ethereum Sepolia
        </span>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <div className="hero-badge">
            <span className="status-dot" />
            DECENTRALIZED PEER-TO-PEER LENDING
          </div>

          <h1>
            Finance that moves
            <span className="hero-gradient"> with trust.</span>
          </h1>

          <p className="hero-description">
            A simpler way to connect borrowers and lenders. Create requests,
            fund loans, and manage repayments through smart contracts.
          </p>

          <div className="hero-actions">
            <Link href="/borrower" className="primary-cta">
              Borrow funds <span>↗</span>
            </Link>
            <Link href="/lender" className="secondary-cta">
              Explore lending
            </Link>
          </div>

          <div className="hero-note">
            <span className="status-dot" />
            Testnet experience · MetaMask required
          </div>
        </div>

        <div className="hero-visual">
          <div className="glow-orb" />
          <div className="preview-card">
            <div className="preview-top">
              <span>PROTOCOL OVERVIEW</span>
              <span className="preview-live">
                <span className="status-dot" /> LIVE UI
              </span>
            </div>

            <div className="preview-icon">↗</div>
            <p className="preview-label">Peer-to-peer lending</p>
            <h2>Built around transparency.</h2>
            <p className="preview-description">
              Borrower requests, lender funding, and repayments managed through
              smart-contract transactions.
            </p>

            <div className="preview-divider" />
            <div className="preview-bottom">
              <div>
                <span>NETWORK</span>
                <strong>Sepolia</strong>
              </div>
              <div>
                <span>ACCESS</span>
                <strong>Wallet-based</strong>
              </div>
            </div>
          </div>
          <div className="floating-tag">On-chain transactions ◈</div>
        </div>
      </section>

      <section className="features-section">
        <div className="section-heading">
          <p className="eyebrow">THE PLATFORM</p>
          <h2>One protocol. Two sides. Clear terms.</h2>
          <p>Tools for both sides of the lending experience.</p>
        </div>

        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.number}>
              <span className="feature-number">{feature.number}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <span>MicroLoan Protocol</span>
        <span>Experimental dApp · Sepolia Testnet</span>
      </footer>
    </main>
  );
}
