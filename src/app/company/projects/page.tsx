import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { ProjectsList } from "./ProjectsList";

export default async function CompanyProjectsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    redirect("/login");
  }

  const userId = session.user.id;

  const company = await db.company.findUnique({
    where: { userId },
  });

  if (!company) {
    return (
      <div className="p-8 text-center bg-white border border-slate-100 shadow-sm rounded-2xl text-slate-500 text-xs">
        Please complete your profile to manage listings.
      </div>
    );
  }

  const projects = await db.project.findMany({
    where: { companyId: company.id },
    include: {
      applications: {
        where: { status: "HIRED" },
        select: {
          id: true,
          freelancer: {
            select: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
      _count: {
        select: { applications: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <ProjectsList initialProjects={projects} />
    </div>
  );
}
