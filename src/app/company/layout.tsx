"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="COMPANY" searchPlaceholder="Search projects, applicants or talent…">
      {children}
    </DashboardLayout>
  );
}
