import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PasswordClient } from "./PasswordClient";
import type { Role } from "@/lib/types";

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/account/password");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { passwordChangeRequired: true },
  });

  return (
    <PasswordClient
      required={user?.passwordChangeRequired ?? false}
      role={session.user.role as Role}
    />
  );
}
