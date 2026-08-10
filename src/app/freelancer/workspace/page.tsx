import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function FreelancerWorkspacePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const latestHiredApp = await db.application.findFirst({
    where: {
      freelancer: { userId: session.user.id },
      status: "HIRED",
    },
    orderBy: { updatedAt: "desc" },
  });

  if (latestHiredApp) {
    redirect(`/workspace/${latestHiredApp.id}`);
  } else {
    redirect("/freelancer/applications");
  }
}
