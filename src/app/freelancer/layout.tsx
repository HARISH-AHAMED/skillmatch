"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function FreelancerLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="FREELANCER" searchPlaceholder="Search projects, companies or skills…">
      {children}
    </DashboardLayout>
  );
}
