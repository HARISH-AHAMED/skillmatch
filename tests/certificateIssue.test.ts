import { describe, it, expect, beforeEach, vi } from "vitest";
import { createDbMock, sessionState, setSession, signedOut, COMPANY_A, COMPANY_B, FREELANCER_A } from "./helpers/mocks";

/**
 * A-05 — issueCertificate's own docstring said "the freelancer must have been
 * hired on it", and the code checked only that the caller owned the project and
 * that the freelancer row existed. Any freelancer id produced a publicly
 * verifiable credential at /verify/{publicId} for work never done.
 *
 * The engagement is what the credential asserts, so the engagement is checked.
 * Project completion deliberately is not: this action backs the documented
 * "Issue a certificate now" override for a live project.
 */

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

const { issueCertificate } = await import("@/actions/certificateActions");

const INPUT = {
  projectId: "p1",
  freelancerId: "f1",
  roleTitle: "Frontend Developer",
  skills: ["react"],
};

function arrange(opts: { projectStatus?: string; hired?: boolean; existing?: unknown } = {}) {
  db.company.findUnique.mockResolvedValue({ id: "company-a", userId: COMPANY_A!.id, companyName: "Company A" });
  db.project.findUnique.mockResolvedValue({
    id: "p1",
    companyId: "company-a",
    title: "Redesign",
    status: opts.projectStatus ?? "IN_PROGRESS",
  });
  db.freelancer.findUnique.mockResolvedValue({ id: "f1", user: { name: "Freelancer A" } });
  db.application.findFirst.mockResolvedValue(opts.hired === false ? null : { id: "app-1" });
  db.certificate.findUnique.mockResolvedValue(opts.existing ?? null);
  db.certificate.create.mockResolvedValue({ id: "cert-1", publicId: "ABCDE-12345" });
}

beforeEach(() => {
  Object.values(db).forEach((m: any) => {
    if (typeof m === "function") m.mockReset?.();
    else Object.values(m).forEach((f: any) => f.mockReset?.());
  });
  setSession(COMPANY_A);
});

describe("A-05: a certificate requires a real engagement", () => {
  it("refuses a freelancer never hired on the project", async () => {
    arrange({ hired: false });
    const res = await issueCertificate(INPUT);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/was not hired on this project/i);
    expect(db.certificate.create).not.toHaveBeenCalled();
  });

  it("scopes the engagement lookup to this project and this freelancer", async () => {
    arrange();
    await issueCertificate(INPUT);
    const where = db.application.findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({ projectId: "p1", freelancerId: "f1", status: "HIRED" });
  });

  it("refuses a company that does not own the project", async () => {
    arrange();
    setSession(COMPANY_B);
    db.company.findUnique.mockResolvedValue({ id: "company-b", userId: COMPANY_B!.id, companyName: "B" });
    const res = await issueCertificate(INPUT);
    expect(res.success).toBe(false);
    expect(db.certificate.create).not.toHaveBeenCalled();
  });

  it("refuses a freelancer caller", async () => {
    arrange();
    setSession(FREELANCER_A);
    const res = await issueCertificate(INPUT);
    expect(res.success).toBe(false);
    expect(db.certificate.create).not.toHaveBeenCalled();
  });

  it("refuses an anonymous caller", async () => {
    arrange();
    signedOut();
    const res = await issueCertificate(INPUT);
    expect(res.success).toBe(false);
    expect(db.certificate.create).not.toHaveBeenCalled();
  });
});

describe("A-05: the manual override still works on a live project", () => {
  it("issues for a hired freelancer while the project is in progress", async () => {
    arrange({ projectStatus: "IN_PROGRESS" });
    const res = await issueCertificate(INPUT);
    expect(res.success).toBe(true);
    expect(res.publicId).toBe("ABCDE-12345");
    expect(db.certificate.create).toHaveBeenCalledTimes(1);
  });

  it("issues on a completed project too", async () => {
    arrange({ projectStatus: "COMPLETED" });
    expect((await issueCertificate(INPUT)).success).toBe(true);
  });

  it("is idempotent: re-issuing returns the existing certificate", async () => {
    arrange({ existing: { id: "cert-old", publicId: "OLDID-99999" } });
    const res = await issueCertificate(INPUT);
    expect(res.success).toBe(true);
    expect(res.publicId).toBe("OLDID-99999");
    expect(db.certificate.create).not.toHaveBeenCalled();
  });

  it("snapshots the issuer and recipient onto the row", async () => {
    arrange();
    await issueCertificate(INPUT);
    const data = db.certificate.create.mock.calls[0][0].data;
    expect(data.issuerName).toBe("Company A");
    expect(data.recipientName).toBe("Freelancer A");
    expect(data.projectTitle).toBe("Redesign");
    expect(data.publicId).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
  });
});
