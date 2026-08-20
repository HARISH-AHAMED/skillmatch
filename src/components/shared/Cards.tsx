"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bookmark,
  Building2,
  CalendarDays,
  Clock,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, Chip, MatchScore, StatusIndicator } from "@/components/ui/Badge";
import { Rating } from "@/components/ui/Feedback";
import { COMPENSATION_META } from "@/lib/constants";
import type { Company, Freelancer, Project } from "@/lib/types";
import { cn, daysUntil, formatMoney, relativeTime } from "@/lib/utils";

/* ============================================================================
   PROJECT CARD
   ========================================================================= */

export function compensationLine(project: Project) {
  const c = project.compensation;
  switch (c.type) {
    case "HOURLY":
      return `${formatMoney(c.hourlyRate ?? 0, c.currency)}/hr · up to ${c.maxHours ?? 0} hrs`;
    case "STIPEND":
      return `${formatMoney(c.stipendAmount ?? 0, c.currency)} ${
        c.stipendFrequency === "MONTHLY"
          ? "per month"
          : c.stipendFrequency === "WEEKLY"
            ? "per week"
            : "one-time"
      } × ${c.stipendPeriods ?? 1}`;
    case "UNPAID":
      return "Non-monetary — certificate, mentorship & credit";
    case "MILESTONE":
      return `${formatMoney(c.totalBudget, c.currency)} across funded stages`;
    default:
      return `${formatMoney(c.totalBudget, c.currency)} fixed${c.budgetNegotiable ? " · negotiable" : ""}`;
  }
}

export function ProjectCard({
  project,
  href,
  showMatch = true,
  saved: savedInitial = false,
  onToggleSave,
  variant = "default",
}: {
  project: Project;
  href?: string;
  showMatch?: boolean;
  saved?: boolean;
  onToggleSave?: (id: string) => void;
  variant?: "default" | "compact" | "featured";
}) {
  const [saved, setSaved] = useState(savedInitial);
  const link = href ?? `/discover/projects/${project.id}`;
  const days = project.dueDate ? daysUntil(project.dueDate) : null;
  const meta = COMPENSATION_META[project.compensation.type];

  if (variant === "compact") {
    return (
      <Link
        href={link}
        className="glass-panel glass-panel-hover flex items-start gap-3.5 p-4"
      >
        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)]">
          <Image src={project.bannerUrl} alt="" fill sizes="44px" className="object-cover" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold text-[var(--color-text-primary)]">
            {project.title}
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-[var(--color-text-secondary)]">
            {project.company.companyName} · {compensationLine(project)}
          </span>
        </span>
        {showMatch && project.matchScore !== undefined && (
          <MatchScore score={project.matchScore} size={36} />
        )}
      </Link>
    );
  }

  return (
    <article
      className={cn(
        "group glass-panel overflow-hidden transition-[border-color,transform,box-shadow] duration-[var(--motion-base)] hover:border-[var(--color-border-emphasis)] hover:shadow-[var(--shadow-sm)]",
        variant === "featured" && "flex flex-col",
      )}
    >
      {/* Banner */}
      <Link href={link} className="relative block aspect-[16/7] overflow-hidden bg-[var(--color-surface-sunken)]">
        <Image
          src={project.bannerUrl}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 400px"
          className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.04]"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-[rgba(12,20,17,0.62)] via-transparent to-transparent" />
        <span className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge tone={project.compensation.type === "UNPAID" ? "warning" : "brand"} size="sm">
            {meta.short}
          </Badge>
          {project.priority === "HIGH" && (
            <Badge tone="error" size="sm">
              Urgent
            </Badge>
          )}
          {project.visibility === "INVITE_ONLY" && (
            <Badge tone="neutral" size="sm">
              Invite only
            </Badge>
          )}
        </span>
        {onToggleSave && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setSaved((v) => !v);
              onToggleSave(project.id);
            }}
            aria-label={saved ? "Remove from saved" : "Save project"}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/92 text-[var(--color-text-secondary)] backdrop-blur transition-colors hover:text-[var(--color-brand-active)]"
          >
            <Bookmark className={cn("h-4 w-4", saved && "fill-[var(--color-brand)] text-[var(--color-brand)]")} />
          </button>
        )}
        <span className="absolute bottom-3 left-3 flex items-center gap-2">
          <Avatar name={project.company.companyName} src={project.company.logoUrl} size="xs" rounded="md" />
          <span className="text-[12px] font-medium text-white drop-shadow-sm">
            {project.company.companyName}
          </span>
        </span>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <Link href={link} className="min-w-0">
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-[1.4] text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-brand-active)]">
              {project.title}
            </h3>
          </Link>
          {showMatch && project.matchScore !== undefined && (
            <MatchScore score={project.matchScore} size={40} />
          )}
        </div>

        <p className="mt-2 line-clamp-2 text-[13px] leading-[1.55] text-[var(--color-text-secondary)]">
          {project.description.split("\n")[0] || "No description yet."}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {project.requiredSkills.slice(0, 3).map((s) => (
            <Chip key={s} size="sm" className="capitalize">
              {s}
            </Chip>
          ))}
          {project.requiredSkills.length > 3 && (
            <Chip size="sm">+{project.requiredSkills.length - 3}</Chip>
          )}
        </div>

        <div className="mt-auto pt-4">
          <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">
            {compensationLine(project)}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[var(--color-border-subtle)] pt-3 text-[12px] text-[var(--color-text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {project.company.location.split(",")[0]}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {project.applicantCount} applied
            </span>
            {days !== null && days > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {days}d left
              </span>
            )}
            <span className="ml-auto">{relativeTime(project.createdAt)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ============================================================================
   FREELANCER CARD
   ========================================================================= */

export function FreelancerCard({
  freelancer,
  href,
  action,
  showMatch = true,
  variant = "default",
}: {
  freelancer: Freelancer & { matchScore?: number };
  href?: string;
  action?: React.ReactNode;
  showMatch?: boolean;
  variant?: "default" | "row";
}) {
  const link = href ?? `/freelancers/${freelancer.id}`;

  if (variant === "row") {
    return (
      <div className="glass-panel glass-panel-hover flex items-center gap-3.5 p-3.5">
        <Link href={link}>
          <Avatar
            src={freelancer.avatarUrl}
            name={freelancer.name}
            size="md"
            status={freelancer.availabilityStatus}
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={link} className="block truncate text-[13.5px] font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-brand-active)]">
            {freelancer.name}
          </Link>
          <p className="truncate text-[12px] text-[var(--color-text-secondary)]">
            {freelancer.professionalHeadline}
          </p>
        </div>
        <Rating value={freelancer.rating} size="sm" showValue />
        {action}
      </div>
    );
  }

  return (
    <article className="group glass-panel overflow-hidden transition-[border-color,box-shadow] duration-[var(--motion-base)] hover:border-[var(--color-border-emphasis)] hover:shadow-[var(--shadow-sm)]">
      <Link href={link} className="relative block h-20 overflow-hidden bg-[var(--color-surface-sunken)]">
        <Image src={freelancer.bannerUrl} alt="" fill sizes="400px" className="object-cover opacity-90" />
        <span className="absolute inset-0 bg-gradient-to-t from-[rgba(12,20,17,0.35)] to-transparent" />
      </Link>

      <div className="px-4 pb-4">
        <div className="-mt-7 flex items-end justify-between gap-3">
          <Link href={link}>
            <Avatar
              src={freelancer.avatarUrl}
              name={freelancer.name}
              size="lg"
              ring
              status={freelancer.availabilityStatus}
            />
          </Link>
          {showMatch && freelancer.matchScore !== undefined && (
            <MatchScore score={freelancer.matchScore} size={42} />
          )}
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-1.5">
            <Link
              href={link}
              className="truncate text-[15px] font-semibold text-[var(--color-text-primary)] transition-colors hover:text-[var(--color-brand-active)]"
            >
              {freelancer.name}
            </Link>
            {freelancer.verificationBadges.includes("Identity Verified") && (
              <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--color-brand)]" aria-label="Identity verified" />
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-[1.5] text-[var(--color-text-secondary)]">
            {freelancer.professionalHeadline}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {freelancer.skills.slice(0, 3).map((s) => (
            <Chip key={s} size="sm" className="capitalize">
              {s}
            </Chip>
          ))}
          {freelancer.skills.length > 3 && <Chip size="sm">+{freelancer.skills.length - 3}</Chip>}
        </div>

        <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-[var(--color-border-subtle)] pt-3 text-center">
          <div>
            <p className="text-[13.5px] font-semibold tabular-nums text-[var(--color-text-primary)]">
              {freelancer.rating.toFixed(1)}
            </p>
            <p className="text-[11px] text-[var(--color-text-muted)]">Rating</p>
          </div>
          <div className="border-x border-[var(--color-border-subtle)]">
            <p className="text-[13.5px] font-semibold tabular-nums text-[var(--color-text-primary)]">
              {freelancer.completedProjects}
            </p>
            <p className="text-[11px] text-[var(--color-text-muted)]">Projects</p>
          </div>
          <div>
            <p className="text-[13.5px] font-semibold tabular-nums text-[var(--color-text-primary)]">
              {freelancer.experienceYears}y
            </p>
            <p className="text-[11px] text-[var(--color-text-muted)]">Experience</p>
          </div>
        </div>

        {freelancer.hourlyRate && (
          <p className="mt-3 text-center text-[13px] text-[var(--color-text-secondary)]">
            From{" "}
            <span className="font-semibold text-[var(--color-text-primary)]">
              {formatMoney(freelancer.hourlyRate, freelancer.currency)}
            </span>
            /hr
          </p>
        )}

        {action && <div className="mt-3.5">{action}</div>}
      </div>
    </article>
  );
}

/* ============================================================================
   COMPANY CARD
   ========================================================================= */

export function CompanyCard({ company, openRoles }: { company: Company; openRoles?: number }) {
  return (
    <article className="group glass-panel overflow-hidden transition-[border-color,box-shadow] hover:border-[var(--color-border-emphasis)] hover:shadow-[var(--shadow-sm)]">
      <Link href={`/companies/${company.id}`} className="relative block h-24 overflow-hidden">
        <Image src={company.bannerUrl} alt="" fill sizes="400px" className="object-cover" />
        <span className="absolute inset-0 bg-gradient-to-t from-[rgba(12,20,17,0.45)] to-transparent" />
      </Link>
      <div className="px-4 pb-4">
        <div className="-mt-6">
          <Avatar
            src={company.logoUrl}
            name={company.companyName}
            size="lg"
            rounded="md"
            ring
          />
        </div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/companies/${company.id}`}
              className="block truncate text-[15px] font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-brand-active)]"
            >
              {company.companyName}
            </Link>
            <p className="mt-0.5 truncate text-[12.5px] text-[var(--color-text-secondary)]">
              {company.industry} · {company.location}
            </p>
          </div>
          <Badge tone="brand" size="sm" icon={<ShieldCheck />}>
            {company.trustScore}
          </Badge>
        </div>

        <p className="mt-2.5 line-clamp-2 text-[12.5px] leading-[1.55] text-[var(--color-text-secondary)]">
          {company.description}
        </p>

        <div className="mt-3.5 flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-3">
          <Rating value={company.rating} count={company.reviewCount} size="sm" />
          {openRoles !== undefined && (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-brand-active)]">
              <Building2 className="h-3.5 w-3.5" />
              {openRoles} open {openRoles === 1 ? "role" : "roles"}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/* ============================================================================
   APPLICATION CARD (freelancer side)
   ========================================================================= */

export function ApplicationCard({
  application,
  href,
}: {
  application: import("@/lib/types").Application;
  href?: string;
}) {
  const link = href ?? `/freelancer/applications/${application.id}`;
  return (
    <Link href={link} className="glass-panel glass-panel-hover block p-4">
      <div className="flex items-start gap-3.5">
        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)]">
          <Image src={application.project.bannerUrl} alt="" fill sizes="48px" className="object-cover" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[14px] font-semibold text-[var(--color-text-primary)]">
                {application.project.title}
              </h3>
              <p className="mt-0.5 truncate text-[12.5px] text-[var(--color-text-secondary)]">
                {application.project.company.companyName}
                {application.roleName && ` · ${application.roleName}`}
                {application.isApprentice && " (Apprentice)"}
              </p>
            </div>
            <StatusIndicator status={application.status} kind="application" size="sm" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[var(--color-text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Applied {relativeTime(application.createdAt)}
            </span>
            <span>AI match {application.aiScore}%</span>
            {application.offer && application.offer.status === "PENDING" && (
              <Badge tone="warning" size="sm">
                Offer waiting
              </Badge>
            )}
            {application.status === "HIRED" && !application.teamConfirmedAt && (
              <Badge tone="info" size="sm">
                Confirm your place
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
