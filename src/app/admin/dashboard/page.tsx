import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Award,
  Briefcase,
  Building,
  ClipboardList,
  ShieldCheck,
  Star,
  UserCircle,
  Users,
  Wallet,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, StatusIndicator } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { KpiTile } from "@/components/ui/Table";
import { Progress, Rating } from "@/components/ui/Feedback";
import { Stagger, StaggerItem } from "@/components/motion/Motion";
import { recentApplications } from "@/data/server/entities";
import { allReviews } from "@/data/server/records";
import { adminOverview, platformStats } from "@/data/server/stats";
import { formatMoney, relativeTime } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const [stats, overview, applications, reviews] = await Promise.all([
    platformStats(),
    adminOverview(),
    recentApplications(6),
    allReviews(),
  ]);

  const data = {
    byStatus: overview.byStatus,
    byDomain: overview.byDomain,
    recentApplications: applications,
    recentReviews: reviews.slice(0, 4),
    lowRated: reviews.filter((r) => r.rating <= 3),
  };

  return (
    <div>
      <PageHeader
        title="Platform overview"
        description="Counts across every account, listing and engagement on FRIVVO. Every action from here re-checks admin permission server-side."
      />

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <KpiTile
            label="Freelancers"
            value={stats.freelancers}
            icon={<UserCircle />}
            tone="brand"
            href="/admin/freelancers"
          />
        </StaggerItem>
        <StaggerItem>
          <KpiTile
            label="Companies"
            value={stats.companies}
            icon={<Building />}
            tone="info"
            href="/admin/companies"
          />
        </StaggerItem>
        <StaggerItem>
          <KpiTile
            label="Projects"
            value={stats.projects}
            icon={<Briefcase />}
            tone="warning"
            deltaLabel={`${stats.openProjects} currently open`}
            href="/admin/projects"
          />
        </StaggerItem>
        <StaggerItem>
          <KpiTile
            label="Released on ledger"
            value={formatMoney(stats.totalReleased, "USD", true)}
            icon={<Wallet />}
            tone="brand"
            deltaLabel="across every engagement"
          />
        </StaggerItem>
      </Stagger>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Applications" value={stats.applications} icon={<ClipboardList />} tone="neutral" />
        <KpiTile label="Hires" value={stats.hires} icon={<Users />} tone="brand" />
        <KpiTile
          label="Certificates issued"
          value={stats.certificates}
          icon={<Award />}
          tone="info"
        />
        <KpiTile
          label="Reviews"
          value={stats.reviews}
          icon={<Star />}
          tone="warning"
          href="/admin/reviews"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* ---- Projects by status ---- */}
          <Card padding="md">
            <CardHeader
              title="Projects by status"
              description="Only OPEN and IN_PROGRESS are publicly browseable. Terminal statuses are read-only."
              icon={<Activity />}
              action={
                <Button href="/admin/projects" variant="link" size="sm">
                  Monitor projects
                </Button>
              }
            />
            <div className="flex flex-col gap-3">
              {data.byStatus.map((s) => (
                <div key={s.status}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <StatusIndicator status={s.status} kind="project" size="sm" />
                    <span className="text-[13px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                      {s.count}
                    </span>
                  </div>
                  <Progress
                    value={overview.totalProjects ? (s.count / overview.totalProjects) * 100 : 0}
                    size="sm"
                    tone={
                      s.status === "OPEN"
                        ? "brand"
                        : s.status === "IN_PROGRESS"
                          ? "info"
                          : "neutral"
                    }
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* ---- Recent applications ---- */}
          <Card padding="md">
            <CardHeader
              title="Recent applications"
              description="Platform-wide activity, newest first."
              icon={<ClipboardList />}
            />
            <ul className="flex flex-col gap-2.5">
              {data.recentApplications.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"
                >
                  <Avatar src={a.freelancer.avatarUrl} name={a.freelancer.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">
                      {a.freelancer.name}
                      <span className="font-normal text-[var(--color-text-muted)]"> applied to </span>
                      {a.project.title}
                    </p>
                    <p className="text-[11.5px] text-[var(--color-text-muted)]">
                      {a.project.company.companyName} · {relativeTime(a.createdAt)}
                    </p>
                  </div>
                  <StatusIndicator status={a.status} kind="application" size="sm" />
                </li>
              ))}
            </ul>
          </Card>

          {/* ---- Domains ---- */}
          <Card padding="md">
            <CardHeader title="Listings by discipline" icon={<Briefcase />} />
            <div className="flex flex-col gap-3">
              {data.byDomain.map((d) => (
                <div key={d.domain}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-[12.5px] text-[var(--color-text-secondary)]">
                      {d.domain}
                    </span>
                    <span className="text-[13px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                      {d.count}
                    </span>
                  </div>
                  <Progress
                    value={overview.totalProjects ? (d.count / overview.totalProjects) * 100 : 0}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ---- Sidebar ---- */}
        <aside className="flex min-w-0 flex-col gap-4">
          <Card padding="md">
            <CardHeader
              title="Moderation queue"
              icon={<AlertTriangle />}
              divided={false}
              className="mb-3"
            />
            {data.lowRated.length === 0 ? (
              <p className="text-[12.5px] leading-[1.5] text-[var(--color-text-muted)]">
                No reviews are currently flagged for moderation.
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {data.lowRated.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-[var(--radius-md)] border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[12.5px] font-medium text-[var(--color-warning-fg)]">
                        {r.reviewerName} → {r.revieweeName}
                      </p>
                      <Rating value={r.rating} size="sm" showValue={false} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-[12px] leading-[1.5] text-[var(--color-warning-fg)] opacity-90">
                      {r.comment}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Button href="/admin/reviews" variant="secondary" block size="sm" className="mt-3">
              Moderate reviews
            </Button>
          </Card>

          <Card padding="md">
            <CardHeader
              title="Recent reviews"
              icon={<Star />}
              divided={false}
              className="mb-3"
            />
            <ul className="flex flex-col gap-3">
              {data.recentReviews.map((r) => (
                <li key={r.id} className="flex gap-2.5">
                  <Avatar src={r.reviewerAvatar} name={r.reviewerName} size="xs" />
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-[var(--color-text-primary)]">
                      {r.reviewerName} → {r.revieweeName}
                    </p>
                    <Rating value={r.rating} size="sm" showValue={false} className="mt-0.5" />
                    <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                      {relativeTime(r.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card padding="md">
            <CardHeader
              title="Directory"
              icon={<ShieldCheck />}
              divided={false}
              className="mb-3"
            />
            <ul className="flex flex-col gap-1.5">
              {[
                { label: "Users management", href: "/admin/users", count: stats.freelancers + stats.companies },
                { label: "Freelancer profiles", href: "/admin/freelancers", count: stats.freelancers },
                { label: "Companies", href: "/admin/companies", count: stats.companies },
                { label: "Projects", href: "/admin/projects", count: stats.projects },
                { label: "Certificates", href: "/admin/projects", count: stats.certificates },
                { label: "System settings", href: "/admin/settings" },
              ].map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-hover)] hover:text-[var(--color-text-primary)]"
                  >
                    {l.label}
                    {l.count !== undefined && (
                      <Badge tone="neutral" size="sm">
                        {l.count}
                      </Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
