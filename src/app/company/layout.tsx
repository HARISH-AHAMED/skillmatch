import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Role } from "@prisma/client";

export default async function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Route security
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== Role.COMPANY) {
    redirect(`/${session.user.role.toLowerCase()}/dashboard`);
  }

  return (
    <DashboardLayout role={Role.COMPANY} userName={session.user.name}>
      {children}
    </DashboardLayout>
  );
}
