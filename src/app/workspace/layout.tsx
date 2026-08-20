"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role={["COMPANY", "FREELANCER"]} searchPlaceholder="Search this workspace…">
      {children}
    </DashboardLayout>
  );
}
