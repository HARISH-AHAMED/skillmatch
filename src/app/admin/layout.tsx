import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { requireViewer } from "@/data/server/context";
import { getDashboardChrome } from "@/data/server/chrome";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The role guard runs on the server; DashboardLayout keeps the client-side
  // companion so the shell reacts if the session ends mid-visit.
  const viewer = await requireViewer("ADMIN", "/admin/dashboard");
  const chrome = await getDashboardChrome(viewer);

  return (
    <DashboardLayout
      role={"ADMIN"}
      chrome={chrome}
      searchPlaceholder="Search users, companies or projects…"
    >
      {children}
    </DashboardLayout>
  );
}
