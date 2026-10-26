"use client";
import AdminDashboard from "@/components/admin/AdminDashboard";
import SharedLayout from "@/components/SharedLayout";

export default function AdminPage() {
  return (
    <SharedLayout 
      title="Admin Dashboard" 
      subtitle="Manage protocol parameters, pause operations, and emergency controls"
    >
      {/* 
        Note: If AdminDashboard.jsx has its own hardcoded sidebar, 
        you will need to remove it inside that component so it doesn't double-render.
      */}
      <AdminDashboard />
    </SharedLayout>
  );
}