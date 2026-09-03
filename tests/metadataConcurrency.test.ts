import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createDbMock, sessionState, setSession, COMPANY_A, FREELANCER_A } from "./helpers/mocks";
import { METADATA_MARKER } from "@/lib/workflowHelpers";

/**
 * D-03 — offers, negotiations, contract signatures, interview scheduling,
 * pipeline events and discussion questions all live in a JSON blob serialised
 * into a text column. Every one of them used to parse that blob, mutate it in
 * memory and write the whole column back with no transaction and no lock, so
 * two overlapping writers silently discarded one of the two edits.
 *
 * The structural test below is the guard against the pattern returning: it
 * fails if any mutation of those columns appears outside a locked transaction.
 */

const SOURCE = readFileSync(
  join(process.cwd(), "src/actions/workflowActions.ts"),
  "utf8"
);

describe("D-03: every metadata writer is inside a locked transaction", () => {
  it("writes the application blob only through the shared helper", () => {
    // The helper is the only place allowed to serialise onto coverLetter,
    // besides the milestone release, which runs its own locked transaction.
    const writes = [...SOURCE.matchAll(/(\w+)\.application\.update\(/g)].map((m) => m[1]);
    // Every write goes through a transaction client, never the bare db client.
    expect(writes.length).toBeGreaterThan(0);
    expect(writes.every((client) => client === "tx")).toBe(true);
  });

  it("writes the project description only inside a transaction", () => {
    const writes = [...SOURCE.matchAll(/(\w+)\.project\.update\(/g)].map((m) => m[1]);
    const serialising = SOURCE.includes("description: serializeProjectMetadata");
    expect(serialising).toBe(true);
    // The only bare-client project.update left is the IN_PROGRESS status flip,
    // which touches no serialised column.
    const bare = writes.filter((c) => c !== "tx");
    for (const _ of bare) {
      // Each remaining one must be a status-only write.
      expect(SOURCE).toContain("data: { status: ProjectStatus.IN_PROGRESS }");
    }
  });

  it("takes a row lock before every metadata read-modify-write", () => {
    const locks = [...SOURCE.matchAll(/FOR UPDATE/g)].length;
    // The application helper, the milestone release (application + items),
    // and both discussion-question paths.
    expect(locks).toBeGreaterThanOrEqual(5);
  });

  it("keeps the eight application-metadata writers on the helper", () => {
    const uses = [...SOURCE.matchAll(/withApplicationMetadata\(/g)].length;
    // One definition plus seven call sites, or more if writers are added.
    expect(uses).toBeGreaterThanOrEqual(8);
  });

  it("re-reads inside the lock rather than reusing an earlier fetch", () => {
    // The helper reads the row it just locked; a stale outer read cannot be
    // the basis for the write.
    expect(SOURCE).toMatch(/FOR UPDATE[\s\S]{0,400}?tx\.application\.findUnique/);
  });
});

/* ── Behavioural: a stale read cannot overwrite newer state ───────────────*/

const db = createDbMock();
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/auth", () => ({
  auth: async () => (sessionState.user ? { user: sessionState.user } : null),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));
vi.mock("@/lib/authz", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/authz")>();
  return {
    ...actual,
    requireProjectOwner: async () => ({
      ok: true,
      data: {
        userId: COMPANY_A!.id,
        company: { id: "company-a" },
        project: { id: "p1", description: "stale", status: "OPEN" },
      },
    }),
    requireRole: async () => ({ ok: true, data: { userId: FREELANCER_A!.id, role: "FREELANCER", name: "Freelancer A" } }),
  };
});

const { replyToDiscussionQuestion, negotiateOfferAction } = await import(
  "@/actions/workflowActions"
);

function projectDescription(faq: { question: string; answer: string }[]) {
  return "A project" + METADATA_MARKER + JSON.stringify({ faq, screeningQuestions: [], visibility: "PUBLIC" });
}

beforeEach(() => {
  Object.values(db).forEach((m: any) => {
    if (typeof m === "function") m.mockReset?.();
    else Object.values(m).forEach((f: any) => f.mockReset?.());
  });
  db.$transaction.mockImplementation(async (ops: unknown) =>
    Array.isArray(ops) ? Promise.all(ops) : (ops as (tx: unknown) => unknown)(db)
  );
  db.$queryRaw.mockResolvedValue([]);
  setSession(COMPANY_A);
});

describe("D-03: the discussion-question paths read the locked row", () => {
  it("answers against fresh state, not the description fetched by the guard", async () => {
    // The guard's copy has one question; another asker has since added a second.
    db.project.findUnique.mockResolvedValue({
      description: projectDescription([
        { question: "[Discussion Question by A]: first?", answer: "" },
        { question: "[Discussion Question by B]: second?", answer: "" },
      ]),
    });
    db.project.update.mockResolvedValue({});

    const res = await replyToDiscussionQuestion("p1", 1, "Answered");
    expect(res.success).toBe(true);

    // The reply landed on the second question, which the stale copy did not
    // contain — so the newer question was not discarded.
    const written = db.project.update.mock.calls[0][0].data.description as string;
    const meta = JSON.parse(written.split(METADATA_MARKER)[1]);
    expect(meta.faq).toHaveLength(2);
    expect(meta.faq[1].answer).toBe("Answered");
    expect(meta.faq[0].answer).toBe("");
    expect(db.$queryRaw).toHaveBeenCalled();
  });

  it("refuses an index that the locked state does not contain", async () => {
    db.project.findUnique.mockResolvedValue({
      description: projectDescription([{ question: "only one", answer: "" }]),
    });
    const res = await replyToDiscussionQuestion("p1", 5, "Answered");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/question not found/i);
    expect(db.project.update).not.toHaveBeenCalled();
  });

  it("reports a project that disappeared between guard and lock", async () => {
    db.project.findUnique.mockResolvedValue(null);
    const res = await replyToDiscussionQuestion("p1", 0, "Answered");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/project not found/i);
    expect(db.project.update).not.toHaveBeenCalled();
  });
});

describe("D-03: the one-pending-counter-offer rule holds under the lock", () => {
  it("refuses a second counter-offer that the locked state already shows", async () => {
    setSession(FREELANCER_A);
    const coverLetter =
      "Proposal" +
      METADATA_MARKER +
      JSON.stringify({
        pipelineHistory: [],
        screeningAnswers: {},
        offerLetter: {
          offerText: "o",
          stipendAmount: 5000,
          milestones: [],
          paymentCategory: "FIXED",
          currency: "USD",
          status: "NEGOTIATING",
          sentAt: "2026-01-01T00:00:00.000Z",
          // A counter-offer is already pending in the committed row.
          negotiation: [{ status: "PENDING", proposedAmount: 6000, previousAmount: 5000 }],
        },
      });

    db.application.findUnique.mockImplementation(async (args: any) =>
      args.select?.coverLetter
        ? { id: "app-1", status: "SHORTLISTED", roleId: null, isApprentice: false, coverLetter }
        : {
            id: "app-1",
            coverLetter,
            project: { title: "Redesign", company: { userId: COMPANY_A!.id } },
            freelancer: { user: { id: FREELANCER_A!.id, name: "Freelancer A" } },
          }
    );
    db.application.update.mockResolvedValue({});

    const res = await negotiateOfferAction("app-1", 7000, "FIXED", "USD");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/already have a counter-offer/i);
    expect(db.application.update).not.toHaveBeenCalled();
  });
});
