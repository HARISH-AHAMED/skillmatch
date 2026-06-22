import React from "react";
import { db } from "@/lib/db";
import { AddUserModal } from "./AddUserModal";
import { UsersDirectoryTable } from "./UsersDirectoryTable";

export default async function AdminUsersPage() {
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#002d59]">
            User Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review, promote, or remove accounts registered on the Talentra platform
          </p>
        </div>
        <AddUserModal />
      </div>

      <UsersDirectoryTable initialUsers={users} />
    </div>
  );
}
