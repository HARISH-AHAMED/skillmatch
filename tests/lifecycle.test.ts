import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import {
  assertProjectTransition,
  assertProjectMutable,
  assertApplicationTransition,
  isProjectMutable,
  buildContractMilestones,
  getCapacity,
  deriveRoleSkills,
  deriveRoleTitle,
} from "@/lib/lifecycle";

/** LIFE-001 — CLOSED and COMPLETED are terminal. */
describe("LIFE-001: terminal project states", () => {
  it("cannot reopen a CLOSED project", () => {
    for (const to of ["OPEN", "IN_PROGRESS", "COMPLETED"] as const) {
      const res = assertProjectTransition("CLOSED", to);
      expect(res.ok).toBe(false);
      expect((res as any).error).toMatch(/closed and cannot be reopened/i);
    }
  });

  it("cannot change a COMPLETED project", () => {
    for (const to of ["OPEN", "IN_PROGRESS", "CLOSED"] as const) {
      expect(assertProjectTransition("COMPLETED", to).ok).toBe(false);
    }
  });

  it("cannot complete a CLOSED project", () => {
    expect(assertProjectTransition("CLOSED", "COMPLETED").ok).toBe(false);
  });

  it("blocks mutation of terminal projects, with an actionable message", () => {
    expect(isProjectMutable("OPEN")).toBe(true);
    expect(isProjectMutable("IN_PROGRESS")).toBe(true);
    expect(isProjectMutable("CLOSED")).toBe(false);
    expect(isProjectMutable("COMPLETED")).toBe(false);

    const closed = assertProjectMutable("CLOSED", "edit");
    expect(closed.ok).toBe(false);
    expect((closed as any).error).toMatch(/closed, so you cannot edit it/i);
  });

  it("still permits the intended live transitions", () => {
    expect(assertProjectTransition("OPEN", "IN_PROGRESS").ok).toBe(true);
    expect(assertProjectTransition("OPEN", "COMPLETED").ok).toBe(true);
    expect(assertProjectTransition("IN_PROGRESS", "COMPLETED").ok).toBe(true);
    expect(assertProjectTransition("IN_PROGRESS", "CLOSED").ok).toBe(true);
    // Re-opening for a replacement hire remains valid.
    expect(assertProjectTransition("IN_PROGRESS", "OPEN").ok).toBe(true);
  });

  it("treats a same-state write as a no-op rather than an error", () => {
    expect(assertProjectTransition("COMPLETED", "COMPLETED").ok).toBe(true);
  });
});

/** LIFE-003 — application transitions were previously unvalidated entirely. */
describe("LIFE-003: application state machine", () => {
  it("rejects the invalid transitions the audit named", () => {
    expect(assertApplicationTransition("REJECTED", "HIRED").ok).toBe(false);
    expect(assertApplicationTransition("HIRED", "PENDING").ok).toBe(false);
    expect(assertApplicationTransition("HIRED", "SHORTLISTED").ok).toBe(false);
  });

  it("refuses re-hiring an already-hired applicant", () => {
    const res = assertApplicationTransition("HIRED", "HIRED");
    expect(res.ok).toBe(false);
    expect((res as any).error).toMatch(/already hired/i);
  });

  it("preserves every currently valid transition", () => {
    expect(assertApplicationTransition("PENDING", "SHORTLISTED").ok).toBe(true);
    expect(assertApplicationTransition("PENDING", "HIRED").ok).toBe(true);
    expect(assertApplicationTransition("PENDING", "REJECTED").ok).toBe(true);
    expect(assertApplicationTransition("SHORTLISTED", "HIRED").ok).toBe(true);
    expect(assertApplicationTransition("SHORTLISTED", "REJECTED").ok).toBe(true);
    // Releasing a hired freelancer.
    expect(assertApplicationTransition("HIRED", "REJECTED").ok).toBe(true);
    // Reconsidering a rejected applicant, but never straight to hired.
    expect(assertApplicationTransition("REJECTED", "SHORTLISTED").ok).toBe(true);
  });
});

/** COMP-011 — the fabricated 30/40/30 split. */
describe("COMP-011: contract schedule is derived, not hardcoded", () => {
  it("uses the offer's agreed milestones when present", () => {
    const result = buildContractMilestones({
      offerMilestones: [
        { title: "Discovery", budget: 2000 },
        { title: "Delivery", budget: 8000 },
      ],
      fallbackTotal: 10_000,
      projectTitle: "Site build",
    });
    expect(result.map((m) => m.title)).toEqual(["Discovery", "Delivery"]);
    expect(result.map((m) => m.budget)).toEqual([2000, 8000]);
  });

  it("falls back to configured payment items", () => {
    const result = buildContractMilestones({
      configuredItems: [
        { title: "Phase 1", amount: new Prisma.Decimal("1500.00") },
        { title: "Phase 2", amount: new Prisma.Decimal("500.00") },
      ],
      fallbackTotal: 2000,
      projectTitle: "Site build",
    });
    expect(result.map((m) => m.budget)).toEqual([1500, 500]);
  });

  it("produces a single full-value milestone when nothing is configured", () => {
    const result = buildContractMilestones({
      fallbackTotal: 10_000,
      projectTitle: "Site build",
    });
    expect(result).toHaveLength(1);
    expect(result[0].budget).toBe(10_000);
  });

  it("never reproduces the 30/40/30 split or its fabricated titles", () => {
    for (const params of [
      { fallbackTotal: 10_000, projectTitle: "P" },
      { configuredItems: [{ title: "Only", amount: 10_000 }], fallbackTotal: 10_000, projectTitle: "P" },
    ]) {
      const result = buildContractMilestones(params as any);
      expect(result.map((m) => m.budget)).not.toEqual([3000, 4000, 3000]);
      expect(result.map((m) => m.title)).not.toContain("Milestone 1: Project Setup");
      expect(result.map((m) => m.title)).not.toContain("Milestone 2: Beta Launch");
    }
  });
});

/** MF-004 / MF-005 — one capacity calculation for both apply and hire. */
describe("MF-004/MF-005: unified capacity", () => {
  const client = (opts: {
    limit: number;
    hiredPrimaries: number;
    roleSlots?: number;
    roleHired?: number;
  }) =>
    ({
      project: { findUnique: vi.fn().mockResolvedValue({ freelancersLimit: opts.limit }) },
      projectRole: {
        findUnique: vi.fn().mockResolvedValue(
          opts.roleSlots == null ? null : { slots: opts.roleSlots }
        ),
      },
      application: {
        count: vi
          .fn()
          .mockResolvedValueOnce(opts.hiredPrimaries)
          .mockResolvedValueOnce(opts.roleHired ?? 0),
      },
    }) as any;

  it("reports the project full at its limit, counting primaries only", async () => {
    const cap = await getCapacity(client({ limit: 2, hiredPrimaries: 2 }), "p1");
    expect(cap.projectFull).toBe(true);
    expect(cap.hiredPrimaries).toBe(2);
  });

  it("does not report full while a primary slot remains", async () => {
    const cap = await getCapacity(client({ limit: 2, hiredPrimaries: 1 }), "p1");
    expect(cap.projectFull).toBe(false);
  });

  it("enforces a project limit even when the listing has no roles", async () => {
    // This is the MF-005 gap: hireApplicant previously checked role capacity
    // only, so a role-less project had no limit at all.
    const cap = await getCapacity(client({ limit: 1, hiredPrimaries: 1 }), "p1");
    expect(cap.roleSlots).toBeNull();
    expect(cap.projectFull).toBe(true);
  });

  it("reports role capacity independently of project capacity", async () => {
    const cap = await getCapacity(
      client({ limit: 10, hiredPrimaries: 3, roleSlots: 2, roleHired: 2 }),
      "p1",
      "role-1"
    );
    expect(cap.roleFull).toBe(true);
    expect(cap.projectFull).toBe(false);
  });
});

/** MF-007 — certificate role title and per-role skills. */
describe("MF-007: certificate role attribution", () => {
  const PROJECT_SKILLS = ["react", "figma", "postgresql", "typescript"];

  it("uses the role's name, not the non-existent `title` field", () => {
    // The bug: roleTitle read role.title, which ProjectRole does not have, so
    // every certificate fell through to the generic label.
    expect(deriveRoleTitle({ name: "Frontend Developer" }, false)).toBe("Frontend Developer");
    expect(deriveRoleTitle({ name: "  Designer  " }, false)).toBe("Designer");
  });

  it("marks an apprentice's certificate as such", () => {
    expect(deriveRoleTitle({ name: "Backend Engineer" }, true)).toBe("Backend Engineer (Apprentice)");
  });

  it("falls back to a generic title only when there is no role", () => {
    expect(deriveRoleTitle(null, false)).toBe("Project Contributor");
    expect(deriveRoleTitle({ name: "" }, false)).toBe("Project Contributor");
  });

  it("credits different skills to different roles on the same project", () => {
    const designer = deriveRoleSkills(
      { name: "Designer", description: "Figma mockups and design system" },
      PROJECT_SKILLS
    );
    const backend = deriveRoleSkills(
      { name: "Backend Engineer", description: "PostgreSQL schema and API work" },
      PROJECT_SKILLS
    );
    expect(designer).toEqual(["figma"]);
    expect(backend).toEqual(["postgresql"]);
    // The specific defect: both used to receive the identical project-wide list.
    expect(designer).not.toEqual(backend);
  });

  it("falls back to project skills when the role names none", () => {
    expect(deriveRoleSkills({ name: "Generalist", description: null }, PROJECT_SKILLS)).toEqual(
      PROJECT_SKILLS
    );
  });

  it("falls back to project skills when the project uses no roles", () => {
    expect(deriveRoleSkills(null, PROJECT_SKILLS)).toEqual(PROJECT_SKILLS);
  });

  it("caps the credited skill list", () => {
    const many = Array.from({ length: 20 }, (_, i) => `skill${i}`);
    expect(deriveRoleSkills(null, many)).toHaveLength(8);
  });
});
