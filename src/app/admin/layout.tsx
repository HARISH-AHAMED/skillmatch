import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Role } from "@prisma/client";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Guard rails
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== Role.ADMIN) {
    redirect(`/${session.user.role.toLowerCase()}/dashboard`);
  }

  return (
    <DashboardLayout role={Role.ADMIN} userName={session.user.name}>
      {children}
    </DashboardLayout>
  );
}

