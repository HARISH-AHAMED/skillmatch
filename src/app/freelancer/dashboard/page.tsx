import { requireFreelancer } from "@/data/server/context";
import {
  applicationsForFreelancer,
  getFreelancer,
  leaderboard,
  recommendedProjectsFor,
} from "@/data/server/entities";
import { certificatesFor } from "@/data/server/records";
import { freelancerDashboardStats } from "@/data/server/stats";
import { financialsByApplication, workspacesForUser } from "@/data/server/workspace";
import { PUBLICLY_BROWSEABLE } from "@/lib/domain";
import { DashboardClient } from "./DashboardClient";

export default async function FreelancerDashboardPage() {
  const { viewer, freelancer } = await requireFreelancer("/freelancer/dashboard");

  const [profile, stats, apps, recommended, workspaces, certificates, board] = await Promise.all([
    getFreelancer(freelancer.id),
    freelancerDashboardStats(freelancer.id),
    applicationsForFreelancer(freelancer.id),
    recommendedProjectsFor(freelancer.id, 4),
    workspacesForUser(viewer.userId, "FREELANCER"),
    certificatesFor(freelancer.id),
    leaderboard(6),
  ]);

  if (!profile) return null;

  const active = apps.filter(
    (a) => a.status === "HIRED" && PUBLICLY_BROWSEABLE.includes(a.project.status),
  );
  const needsAction = apps.filter(
    (a) =>
      (a.status === "HIRED" && !a.teamConfirmedAt) ||
      a.offer?.status === "PENDING" ||
      a.interview?.status === "SCHEDULED",
  );

  const financials = Object.fromEntries(await financialsByApplication(active.map((a) => a.id)));

  return (
    <DashboardClient
      freelancer={profile}
      data={{
        stats,
        apps,
        active,
        needsAction,
        recommended,
        workspaces,
        certificates,
        board,
        financials,
      }}
    />
  );
}
