import { describe, it, expect, beforeEach, vi } from "vitest";
import { Role } from "@prisma/client";
import {
  createDbMock,
  sessionState,
  setSession,
  signedOut,
  COMPANY_A,
  COMPANY_B,
  FREELANCER_A,
  FREELANCER_B,
} from "./helpers/mocks";

const db = createDbMock();
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/auth", () => ({
  auth: async () => (sessionState.user ? { user: sessionState.user } : null),
}));

const {
  requireAdmin,
  requireProjectOwner,
  requireApplicationOwner,
  requireProjectParty,
  visibleChannelsFor,
} = await import("@/lib/authz");

beforeEach(() => {
  signedOut();
  Object.values(db).forEach((m) => {
    if (m && typeof m === "object") Object.values(m).forEach((fn: any) => fn?.mockReset?.());
  });
});

const COMPANY_A_ROW = { id: "company-a", userId: COMPANY_A!.id, companyName: "A Ltd" };
const PROJECT_OF_A = { id: "project-a", companyId: "company-a", title: "A's project" };

/**
 * Class A — SEC-004/005/006/007/016. The guards must refuse a caller who holds
 * a valid session and the right role but does not own the object.
 */
describe("Class A ownership guards", () => {
  describe("requireProjectOwner", () => {
    it("allows the owning company", async () => {
      setSession(COMPANY_A);
      db.company.findUnique.mockResolvedValue(COMPANY_A_ROW);
      db.project.findUnique.mockResolvedValue(PROJECT_OF_A);
      const res = await requireProjectOwner("project-a");
      expect(res.ok).toBe(true);
    });

    it("refuses a different company holding a valid project id (IDOR)", async () => {
      setSession(COMPANY_B);
      db.company.findUnique.mockResolvedValue({ id: "company-b", userId: COMPANY_B!.id });
      db.project.findUnique.mockResolvedValue(PROJECT_OF_A);
      const res = await requireProjectOwner("project-a");
      expect(res.ok).toBe(false);
    });

    it("refuses a freelancer", async () => {
      setSession(FREELANCER_A);
      const res = await requireProjectOwner("project-a");
      expect(res.ok).toBe(false);
    });

    it("refuses an unauthenticated caller", async () => {
      const res = await requireProjectOwner("project-a");
      expect(res.ok).toBe(false);
    });

    it("does not distinguish 'missing' from 'not yours', so ids cannot be probed", async () => {
      setSession(COMPANY_B);
      db.company.findUnique.mockResolvedValue({ id: "company-b", userId: COMPANY_B!.id });

      db.project.findUnique.mockResolvedValue(null);
      const missing = await requireProjectOwner("does-not-exist");

      db.project.findUnique.mockResolvedValue(PROJECT_OF_A);
      const notMine = await requireProjectOwner("project-a");

      expect(missing.ok).toBe(false);
      expect(notMine.ok).toBe(false);
      expect((missing as any).error).toBe((notMine as any).error);
    });
  });

  describe("requireApplicationOwner", () => {
    it("allows the company that owns the application's project", async () => {
      setSession(COMPANY_A);
      db.company.findUnique.mockResolvedValue(COMPANY_A_ROW);
      db.application.findUnique.mockResolvedValue({ id: "app-1", project: PROJECT_OF_A });
      const res = await requireApplicationOwner("app-1");
      expect(res.ok).toBe(true);
    });

    it("refuses a company holding another company's application id (SEC-004)", async () => {
      setSession(COMPANY_B);
      db.company.findUnique.mockResolvedValue({ id: "company-b", userId: COMPANY_B!.id });
      db.application.findUnique.mockResolvedValue({ id: "app-1", project: PROJECT_OF_A });
      const res = await requireApplicationOwner("app-1");
      expect(res.ok).toBe(false);
    });

    it("refuses a freelancer trying to act on an application (SEC-005)", async () => {
      setSession(FREELANCER_A);
      const res = await requireApplicationOwner("app-1");
      expect(res.ok).toBe(false);
    });
  });

  describe("requireProjectParty", () => {
    it("recognises the owning company", async () => {
      setSession(COMPANY_A);
      db.project.findUnique.mockResolvedValue({
        ...PROJECT_OF_A,
        company: { userId: COMPANY_A!.id },
        applications: [],
      });
      const res = await requireProjectParty("project-a");
      expect(res.ok && res.data.role).toBe("COMPANY");
    });

    it("recognises a hired freelancer and returns their own application id", async () => {
      setSession(FREELANCER_A);
      db.project.findUnique.mockResolvedValue({
        ...PROJECT_OF_A,
        company: { userId: COMPANY_A!.id },
        applications: [{ id: "app-fa" }],
      });
      const res = await requireProjectParty("project-a");
      expect(res.ok && res.data.role).toBe("FREELANCER");
      expect(res.ok && res.data.applicationId).toBe("app-fa");
    });

    it("refuses an unrelated freelancer", async () => {
      setSession(FREELANCER_B);
      db.project.findUnique.mockResolvedValue({
        ...PROJECT_OF_A,
        company: { userId: COMPANY_A!.id },
        applications: [],
      });
      const res = await requireProjectParty("project-a");
      expect(res.ok).toBe(false);
    });
  });

  describe("requireAdmin", () => {
    it("refuses every non-admin role", async () => {
      for (const who of [COMPANY_A, FREELANCER_A, null]) {
        setSession(who);
        expect((await requireAdmin()).ok).toBe(false);
      }
    });
  });
});

/**
 * SEC-011 / WS-002 — one predicate shared by the polling API and the
 * server-rendered page, so the two read paths cannot drift apart.
 */
describe("visibleChannelsFor", () => {
  const match = (filter: ReturnType<typeof visibleChannelsFor>, channel: string) =>
    filter.OR.some((clause) => {
      const c = clause.channel as any;
      if (typeof c === "string") return channel === c;
      if ("startsWith" in c) return channel.startsWith(c.startsWith);
      return channel.endsWith(c.endsWith);
    });

  it("lets everyone see the group channel", () => {
    expect(match(visibleChannelsFor("COMPANY", "u1"), "group")).toBe(true);
    expect(match(visibleChannelsFor("FREELANCER", "u1"), "group")).toBe(true);
  });

  it("hides the freelancers-only channel from the company", () => {
    expect(match(visibleChannelsFor("COMPANY", "u1"), "freelancers")).toBe(false);
    expect(match(visibleChannelsFor("FREELANCER", "u1"), "freelancers")).toBe(true);
  });

  it("shows a DM only to its two participants", () => {
    const channel = "dm:alice:bob";
    expect(match(visibleChannelsFor("FREELANCER", "alice"), channel)).toBe(true);
    expect(match(visibleChannelsFor("FREELANCER", "bob"), channel)).toBe(true);
    expect(match(visibleChannelsFor("FREELANCER", "carol"), channel)).toBe(false);
    // The company must not see freelancers' private DMs either.
    expect(match(visibleChannelsFor("COMPANY", "carol"), channel)).toBe(false);
  });

  it("does not leak a DM to a user whose id is a suffix of a participant's", () => {
    // Anchored prefix/suffix matching rather than `contains`: with `contains`,
    // user "abc" would match "dm:z:xabc".
    expect(match(visibleChannelsFor("FREELANCER", "abc"), "dm:z:xabc")).toBe(false);
    expect(match(visibleChannelsFor("FREELANCER", "abc"), "dm:abc:z")).toBe(true);
    expect(match(visibleChannelsFor("FREELANCER", "abc"), "dm:z:abc")).toBe(true);
  });
});
