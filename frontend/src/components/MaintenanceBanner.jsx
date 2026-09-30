import { useContractPaused } from "../hooks/useContractPaused";

// Drop into the borrower and lender pages: <MaintenanceBanner />
// Shows only while the contract is paused.
export default function MaintenanceBanner() {
  const paused = useContractPaused();
  if (!paused) return null;

  return (
    <div
      role="status"
      style={{
        background: "#f5e2b5",
        color: "#17212c",
        borderBottom: "2px solid #8a5200",
        padding: "0.75rem 1.25rem",
        fontWeight: 500,
        lineHeight: 1.5,
      }}
    >
      <strong>System maintenance.</strong> New loan requests and funding are paused for now.
      You can still repay an existing loan.
    </div>
  );
}
