import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const role = session.user.role;

  try {
    if (role === Role.FREELANCER) {
      const freelancer = await db.freelancer.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (freelancer) {
        return NextResponse.json({
          role,
          profileId: freelancer.id,
          href: `/freelancers/${freelancer.id}`,
        });
      }
    } else if (role === Role.COMPANY) {
      const company = await db.company.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (company) {
        return NextResponse.json({
          role,
          profileId: company.id,
          href: `/companies/${company.id}`,
        });
      }
    }

    return NextResponse.json({
      role,
      profileId: null,
      href: null,
    });
  } catch (error) {
    console.error("Failed to fetch profile info:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
