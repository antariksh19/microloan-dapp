"use client";
import AdminDashboard from "@/components/admin/AdminDashboard";
import SharedLayout from "@/components/SharedLayout";
import { useWallet } from "@/hooks/useWallet";

export default function AdminPage() {
  const wallet = useWallet();
  return (
    <SharedLayout
      account={wallet.account}
      onConnect={wallet.connect}
      title="Admin Dashboard"
      subtitle="Pause the platform and set the maximum loan amount"
    >
      <AdminDashboard wallet={wallet} />
    </SharedLayout>
  );
}