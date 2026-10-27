"use client";

import Notice from "@/components/ui/Notice";
import { useContractPaused } from "@/hooks/useContractPaused";

// Shows only while the admin has paused the contract.
export default function MaintenanceBanner() {
  const paused = useContractPaused();
  if (!paused) return null;

  return (
    <Notice tone="warning">
      The platform is paused. New requests, funding and withdrawals are on hold until the admin resumes it. You can
      still repay and cancel.
    </Notice>
  );
}
