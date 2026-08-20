import { requireViewer } from "@/data/server/context";
import { adminUsers } from "@/data/server/admin";
import { UsersClient } from "./UsersClient";

export default async function AdminUsersPage() {
  await requireViewer("ADMIN", "/admin/users");
  const users = await adminUsers();

  return <UsersClient users={users} />;
}
