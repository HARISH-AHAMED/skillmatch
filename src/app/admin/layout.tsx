"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="ADMIN" searchPlaceholder="Search users, companies or projects…">
      {children}
    </DashboardLayout>
  );
}
