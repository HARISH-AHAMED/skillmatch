"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { Role, ProjectPriority, ProjectStatus, ApplicationStatus, Prisma } from "@prisma/client";
import { recalculateRecommendationsForProject } from "@/services/aiRecommendation";
import { revalidatePath as revalidateRoute } from "next/cache";
import { CACHE_TAGS, invalidatePublic } from "@/data/server/cache";

/**
 * PERF — the public directories and marketing pages read through a tagged
 * cache, so a mutation has to drop those entries as well as the rendered
 * routes. Wrapping revalidatePath here keeps the two in step: every existing
 * invalidation point in this file now does both.
 */
function revalidatePath(path: string) {
  revalidateRoute(path);
  invalidatePublic(CACHE_TAGS.projects, CACHE_TAGS.stats);
}
import { assertProjectTransition, assertProjectMutable } from "@/lib/lifecycle";
import { deriveFromMetadata } from "@/lib/compensation";

/**
 * COMP-016 — the canonical compensation for a project comes from the metadata
 * block serialised into its description. Projects and their ProjectCompensation
 * row are written together so no project can exist without one.
 */
function compensationData(description: string, budget: number) {
  const c = deriveFromMetadata(description, budget);
  return {
    type: c.type,
    currency: c.currency,
    totalBudget: c.totalBudget,
    budgetNegotiable: c.budgetNegotiable,
    hourlyRate: c.hourlyRate,
    estimatedHours: c.estimatedHours,
    // maxHours and stipendPeriods were resolved but never written, so both
    // columns stayed NULL on every project. A NULL stipendPeriods reads as a
    // single payable period, and a NULL maxHours removes the ceiling on
    // billable hours entirely.
    maxHours: c.maxHours,
    stipendAmount: c.stipendAmount,
    stipendFrequency: c.stipendFrequency,
    stipendPeriods: c.stipendPeriods,
  };
}

/**
 * Whether a project's compensation may still be changed the way this edit
 * proposes.
 *
 * A project with no financial history is fully editable, which is the common
 * case and the behaviour companies expect while a listing is still being
 * shaped. Once value has moved, the terms it moved under are fixed: the type
 * and currency are frozen, and the budget cannot fall below what is already
 * committed to freelancers.
 */
async function assertCompensationChangeAllowed(
  projectId: string,
  next: { type: string; currency: string; totalBudget: Prisma.Decimal }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const current = await db.projectCompensation.findUnique({ where: { projectId } });
  if (!current) return { ok: true };

  const [items, releases, periods] = await Promise.all([
    db.paymentItem.findMany({
      where: { projectId },
      select: { fundedAmount: true, releasedAmount: true },
    }),
    db.paymentTransaction.findMany({ where: { projectId }, select: { amount: true } }),
    db.stipendPeriod.count({ where: { projectId, status: "RELEASED" } }),
  ]);

  const hasHistory =
    releases.length > 0 ||
    periods > 0 ||
    items.some((i) => i.fundedAmount.greaterThan(0) || i.releasedAmount.greaterThan(0));

  if (!hasHistory) return { ok: true };

  if (next.type !== current.type) {
    return {
      ok: false,
      error: `This project already has payment records under its ${current.type.toLowerCase()} terms, so its compensation type can no longer be changed.`,
    };
  }
  if (next.currency !== current.currency) {
    return {
      ok: false,
      error: `This project's payments are denominated in ${current.currency} and cannot be re-denominated.`,
    };
  }

  // Committed = the larger of funded and released on each stage, plus every
  // non-stage payout already made.
  const committedOnItems = items.reduce(
    (t, i) => t.plus(Prisma.Decimal.max(i.fundedAmount, i.releasedAmount)),
    new Prisma.Decimal(0)
  );
  const releasedElsewhere = releases.reduce(
    (t, r) => (r.amount.isNegative() ? t.plus(r.amount.abs()) : t),
    new Prisma.Decimal(0)
  );
  const floor = Prisma.Decimal.max(committedOnItems, releasedElsewhere);

  if (next.totalBudget.lessThan(floor)) {
    return {
      ok: false,
      error: `${floor.toFixed(2)} is already committed or paid on this project, so the budget cannot be lowered below that.`,
    };
  }

  return { ok: true };
}

export async function createProject(formData: {
  title: string;
  description: string;
  budget: number;
  priority: ProjectPriority;
  requiredSkills: string[];
  experienceRequired: number;
  freelancersLimit?: number;
  isVisible?: boolean;
  preferredGender?: string;
  domain?: string;
  bannerUrl?: string | null;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    throw new Error("Unauthorized");
  }

  // Get company ID
  const company = await db.company.findUnique({
    where: { userId: session.user.id },
  });

  if (!company) {
    throw new Error("Please complete your company profile before posting a project.");
  }

  const skillsCleaned = formData.requiredSkills.map(s => s.toLowerCase().trim()).filter(Boolean);

  const project = await db.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        companyId: company.id,
        title: formData.title,
        description: formData.description,
        budget: formData.budget,
        priority: formData.priority,
        requiredSkills: skillsCleaned,
        experienceRequired: formData.experienceRequired,
        status: ProjectStatus.OPEN,
        freelancersLimit: formData.freelancersLimit ?? 1,
        isVisible: formData.isVisible ?? true,
        preferredGender: formData.preferredGender ?? "ANY",
        domain: formData.domain ?? "Other",
        bannerUrl: formData.bannerUrl ?? null,
      },
    });

    // COMP-016 — atomic with the project itself.
    await tx.projectCompensation.create({
      data: { projectId: created.id, ...compensationData(formData.description, formData.budget) },
    });

    return created;
  });

  // Calculate AI Recommendations for this new project
  await recalculateRecommendationsForProject(project.id);

  /**
   * PERF-001 class — this used to load every freelancer on the platform with
   * their user relation, filter the skill overlap in JavaScript, and then issue
   * one insert per match sequentially: an unbounded table scan plus N round
   * trips inside the request that posts a job.
   *
   * The overlap is a Postgres array operation, so the database can answer it
   * directly, and the inserts go in one statement.
   */
  if (skillsCleaned.length > 0) {
    const matched = await db.freelancer.findMany({
      where: { skills: { hasSome: skillsCleaned } },
      select: { userId: true },
    });

    if (matched.length > 0) {
      await db.notification.createMany({
        data: matched.map((f) => ({
          userId: f.userId,
          title: "New Match Found",
          message: `A new project '${project.title}' matching your skills was posted by ${company.companyName}.`,
        })),
      });
    }
  }

  revalidatePath("/company/dashboard");
  revalidatePath("/company/projects");
  revalidatePath("/freelancer/projects");
  revalidatePath("/freelancer/dashboard");

  return { success: true, project };
}

export async function editProject(
  projectId: string,
  formData: {
    title: string;
    description: string;
    budget: number;
    priority: ProjectPriority;
    requiredSkills: string[];
    experienceRequired: number;
    freelancersLimit?: number;
    isVisible?: boolean;
    preferredGender?: string;
    domain?: string;
    bannerUrl?: string | null;
  }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    throw new Error("Unauthorized");
  }

  const company = await db.company.findUnique({
    where: { userId: session.user.id },
  });

  const existingProject = await db.project.findUnique({
    where: { id: projectId },
  });

  if (!existingProject || !company || existingProject.companyId !== company.id) {
    throw new Error("Unauthorized project edit");
  }

  // LIFE-001 — a terminal project is read-only.
  const editable = assertProjectMutable(existingProject.status, "edit");
  if (!editable.ok) throw new Error(editable.error);

  /**
   * The compensation row was rewritten from the submitted description with no
   * reconciliation against records that already exist against it. That allowed
   * three things a live engagement cannot survive: dropping the budget below
   * money already committed, switching the compensation type out from under
   * existing payment records, and re-denominating a project whose stages keep
   * their original currency (which then fails checkSaveItem's equality test and
   * leaves the project unable to add stages at all).
   */
  const nextComp = compensationData(formData.description, formData.budget);
  const guard = await assertCompensationChangeAllowed(projectId, nextComp);
  if (!guard.ok) throw new Error(guard.error);

  const skillsCleaned = formData.requiredSkills.map(s => s.toLowerCase().trim()).filter(Boolean);

  const project = await db.project.update({
    where: { id: projectId },
    data: {
      title: formData.title,
      description: formData.description,
      budget: formData.budget,
      priority: formData.priority,
      requiredSkills: skillsCleaned,
      experienceRequired: formData.experienceRequired,
      freelancersLimit: formData.freelancersLimit ?? 1,
      isVisible: formData.isVisible ?? true,
      preferredGender: formData.preferredGender ?? "ANY",
      domain: formData.domain ?? "Other",
      bannerUrl: formData.bannerUrl ?? null,
    },
  });

  // COMP-016 — an edit can change the compensation metadata, so the canonical
  // row is kept in step with the description it is derived from.
  await db.projectCompensation.upsert({
    where: { projectId },
    create: { projectId, ...nextComp },
    update: nextComp,
  });

  // Recalculate match recommendations
  await recalculateRecommendationsForProject(project.id);

  revalidatePath(`/company/projects`);
  revalidatePath("/freelancer/projects");

  return { success: true, project };
}

export async function toggleProjectVisibility(projectId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    throw new Error("Unauthorized");
  }

  const company = await db.company.findUnique({
    where: { userId: session.user.id },
  });

  const project = await db.project.findUnique({
    where: { id: projectId },
  });

  if (!project || !company || project.companyId !== company.id) {
    throw new Error("Unauthorized");
  }

  const visible = assertProjectMutable(project.status, "change the visibility of");
  if (!visible.ok) throw new Error(visible.error);

  const updatedProject = await db.project.update({
    where: { id: projectId },
    data: { isVisible: !project.isVisible },
  });

  revalidatePath("/company/projects");
  revalidatePath("/freelancer/projects");

  return { success: true, isVisible: updatedProject.isVisible };
}

export async function closeProject(projectId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    throw new Error("Unauthorized");
  }

  const company = await db.company.findUnique({
    where: { userId: session.user.id },
  });

  const project = await db.project.findUnique({
    where: { id: projectId },
  });

  if (!project || !company || project.companyId !== company.id) {
    throw new Error("Unauthorized");
  }

  // LIFE-001 — CLOSED and COMPLETED are terminal; neither can be reopened or
  // re-closed.
  const move = assertProjectTransition(project.status, ProjectStatus.CLOSED);
  if (!move.ok) throw new Error(move.error);

  await db.project.update({
    where: { id: projectId },
    data: { status: ProjectStatus.CLOSED },
  });

  revalidatePath("/company/projects");
  return { success: true };
}

export async function updateProjectDueDate(projectId: string, dueDateString: string | null) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    throw new Error("Unauthorized");
  }

  const company = await db.company.findUnique({
    where: { userId: session.user.id },
  });

  const project = await db.project.findUnique({
    where: { id: projectId },
  });

  if (!project || !company || project.companyId !== company.id) {
    throw new Error("Unauthorized");
  }

  const datable = assertProjectMutable(project.status, "change the due date of");
  if (!datable.ok) throw new Error(datable.error);

  const updatedProject = await db.project.update({
    where: { id: projectId },
    data: {
      dueDate: dueDateString ? new Date(dueDateString) : null,
    },
  });

  revalidatePath("/company/projects");
  revalidatePath("/freelancer/projects");

  return { success: true, dueDate: updatedProject.dueDate };
}

/**
 * Ownership guard shared by every lifecycle action below. The project is
 * loaded and its company compared against the session — a caller-supplied id
 * is only ever a lookup key, never proof of ownership.
 */
async function requireOwnedProject(projectId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    return { ok: false as const, error: "Unauthorized" };
  }
  const company = await db.company.findUnique({ where: { userId: session.user.id } });
  if (!company) return { ok: false as const, error: "Unauthorized" };

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.companyId !== company.id) {
    return { ok: false as const, error: "Unauthorized" };
  }
  return { ok: true as const, project, company, session };
}

/**
 * Draft autosave. One draft per creation session: the caller passes the id it
 * was given the first time, and subsequent saves update that row rather than
 * accumulating drafts. Drafts are DRAFT status, so public browse — which only
 * returns OPEN/IN_PROGRESS — can never surface them, and applicationActions
 * already refuses applications to anything outside those two states.
 *
 * Autosave deliberately does not validate: a draft is allowed to be
 * incomplete. The publish path below runs the real validation.
 */
export async function saveProjectDraft(input: {
  draftId?: string | null;
  title?: string;
  description?: string;
  budget?: number;
  priority?: ProjectPriority;
  requiredSkills?: string[];
  experienceRequired?: number;
  freelancersLimit?: number;
  domain?: string;
  bannerUrl?: string | null;
  preferredGender?: string;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    return { success: false, error: "Unauthorized" };
  }
  const company = await db.company.findUnique({ where: { userId: session.user.id } });
  if (!company) return { success: false, error: "Complete your company profile first." };

  const data = {
    title: input.title?.trim() || "Untitled draft",
    description: input.description ?? "",
    budget: Number.isFinite(input.budget) ? Number(input.budget) : 0,
    priority: input.priority ?? ProjectPriority.MEDIUM,
    requiredSkills: (input.requiredSkills ?? []).map((s) => s.toLowerCase().trim()).filter(Boolean),
    experienceRequired: input.experienceRequired ?? 0,
    freelancersLimit: input.freelancersLimit ?? 1,
    domain: input.domain ?? "Other",
    bannerUrl: input.bannerUrl ?? null,
    preferredGender: input.preferredGender ?? "ANY",
    // A draft is never publicly discoverable, on either signal.
    isVisible: false,
    status: ProjectStatus.DRAFT,
  };

  if (input.draftId) {
    const owned = await requireOwnedProject(input.draftId);
    if (!owned.ok) return { success: false, error: owned.error };
    if (owned.project.status !== ProjectStatus.DRAFT) {
      return { success: false, error: "This project is already published." };
    }
    const updated = await db.project.update({ where: { id: input.draftId }, data });
    return { success: true, draftId: updated.id, savedAt: updated.updatedAt };
  }

  const created = await db.project.create({ data: { ...data, companyId: company.id } });
  return { success: true, draftId: created.id, savedAt: created.updatedAt };
}

/**
 * A single draft, with the full serialised wizard payload, for resuming into
 * the form. Ownership is re-derived from the session, so one company can never
 * read another's draft.
 */
export async function getProjectDraft(draftId: string) {
  const owned = await requireOwnedProject(draftId);
  if (!owned.ok) return null;
  if (owned.project.status !== ProjectStatus.DRAFT) return null;
  const p = owned.project;
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    budget: p.budget,
    priority: p.priority,
    requiredSkills: p.requiredSkills,
    experienceRequired: p.experienceRequired,
    freelancersLimit: p.freelancersLimit,
    domain: p.domain,
    bannerUrl: p.bannerUrl,
    preferredGender: p.preferredGender,
  };
}

/** The company's resumable drafts, newest first. Scoped to the caller's company. */
export async function getMyProjectDrafts() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) return [];
  const company = await db.company.findUnique({ where: { userId: session.user.id } });
  if (!company) return [];

  return db.project.findMany({
    where: { companyId: company.id, status: ProjectStatus.DRAFT },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true, budget: true, domain: true },
  });
}

/**
 * Publishes a draft. Runs the same required-field validation the normal
 * creation path enforces, so autosave cannot be used to sneak an incomplete
 * project into the public listing.
 */
export async function publishProjectDraft(draftId: string, isVisible = true) {
  const owned = await requireOwnedProject(draftId);
  if (!owned.ok) return { success: false, error: owned.error };
  if (owned.project.status !== ProjectStatus.DRAFT) {
    return { success: false, error: "Only a draft can be published." };
  }

  const p = owned.project;
  const missing: string[] = [];
  if (!p.title.trim() || p.title === "Untitled draft") missing.push("title");
  if (!p.description.trim()) missing.push("description");
  if (!(p.budget > 0)) missing.push("budget");
  if (p.requiredSkills.length === 0) missing.push("required skills");
  if (missing.length > 0) {
    return { success: false, error: `Add a ${missing.join(", ")} before publishing.` };
  }

  const transition = assertProjectTransition(p.status, ProjectStatus.OPEN);
  if (!transition.ok) return { success: false, error: transition.error };

  const published = await db.project.update({
    where: { id: draftId },
    data: { status: ProjectStatus.OPEN, isVisible },
  });

  // Compensation is written on every creation path (COMP-016).
  const existing = await db.projectCompensation.findUnique({ where: { projectId: draftId } });
  if (!existing) {
    await db.projectCompensation.create({
      data: { projectId: draftId, ...compensationData(published.description, published.budget) },
    });
  }

  await recalculateRecommendationsForProject(draftId);
  revalidatePath("/company/projects");
  revalidatePath("/freelancer/projects");
  return { success: true, projectId: published.id };
}

/**
 * Requirement #1/#10 — the single lifecycle path behind "Delete".
 *
 * Nothing is hard-deleted: applications, workspaces, reviews, certificates and
 * the whole financial ledger reference the project, and destroying the row
 * would orphan all of it. A draft, which has no history, is archived too — the
 * same transition, so there is only one implementation to reason about.
 */
export async function setProjectLifecycle(
  projectId: string,
  to: "CANCELLED" | "ARCHIVED"
) {
  const owned = await requireOwnedProject(projectId);
  if (!owned.ok) return { success: false, error: owned.error };

  const transition = assertProjectTransition(owned.project.status, to as ProjectStatus);
  if (!transition.ok) return { success: false, error: transition.error };

  await db.project.update({
    where: { id: projectId },
    // Removed from public discovery on the authoritative flag as well.
    data: { status: to as ProjectStatus, isVisible: false },
  });

  revalidatePath("/company/projects");
  revalidatePath("/freelancer/projects");
  revalidatePath(`/company/projects/${projectId}`);
  return { success: true, status: to };
}

/** "Delete" in the UI: cancel a published project, archive an unpublished one. */
export async function deleteProject(projectId: string) {
  const owned = await requireOwnedProject(projectId);
  if (!owned.ok) return { success: false, error: owned.error };
  const target = owned.project.status === ProjectStatus.DRAFT ? "ARCHIVED" : "CANCELLED";
  return setProjectLifecycle(projectId, target);
}
