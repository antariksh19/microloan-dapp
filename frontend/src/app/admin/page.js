"use client";
import AdminDashboard from "@/components/admin/AdminDashboard";
import SharedLayout from "@/components/SharedLayout";
import { useWallet } from "@/hooks/useWallet";

export default function AdminPage() {
  const wallet = useWallet();
  return (
    <SharedLayout
      wallet={wallet}
      title="Admin"
      subtitle="Pause the platform in an emergency and set the largest loan a borrower can request."
    >
      <AdminDashboard wallet={wallet} />
    </SharedLayout>
  );
}
