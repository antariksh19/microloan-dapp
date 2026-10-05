"use client";

import { useContractPaused } from "@/hooks/useContractPaused";

// Drop into the Borrower and Lender pages: <MaintenanceBanner />
// Shows only while the admin has paused the contract.
export default function MaintenanceBanner() {
  const paused = useContractPaused();
  if (!paused) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 font-medium" role="status">
      The platform is paused for maintenance. Requests, funding, withdrawals and repayments are on
      hold until it&apos;s resumed.
    </div>
  );
}
