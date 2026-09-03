import { describe, it, expect, beforeEach, vi } from "vitest";
import { createDbMock, sessionState, setSession, COMPANY_A, FREELANCER_A } from "./helpers/mocks";
import { METADATA_MARKER } from "@/lib/workflowHelpers";

/**
 * H-04 / H-02 / H-03 — accepting an offer used to fabricate both signatures
 * with the placeholder IPs "client" and "server", mark the contract executed,
 * check capacity outside any transaction, and ignore the project's own state.
 *
 * D-03 — the same action, and every other writer of the application metadata
 * blob, read-modify-wrote the whole column with no lock.
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

const partyResult = {
  ok: true as boolean,
  error: undefined as string | undefined,
  data: { userId: "", role: "FREELANCER" as "COMPANY" | "FREELANCER", application: {} as any },
};
vi.mock("@/lib/authz", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/authz")>();
  return {
    ...actual,
    requireApplicationParty: async () => partyResult,
    callerIpAddress: async () => "203.0.113.9",
  };
});

const capacity = { projectLimit: 2, hiredPrimaries: 0, projectFull: false, roleSlots: null, roleHired: null, roleFull: false };
vi.mock("@/lib/lifecycle", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/lifecycle")>();
  return { ...actual, getCapacity: async () => capacity };
});

const { respondToOfferLetterAction, signDigitalContract } = await import("@/actions/workflowActions");

function metaBlob(extra: Record<string, unknown>) {
  return (
    "Proposal" +
    METADATA_MARKER +
    JSON.stringify({ pipelineHistory: [], screeningAnswers: {}, ...extra })
  );
}

const OFFER = {
  offerText: "Join us",
  stipendAmount: 5000,
  milestones: [{ title: "Phase one", budget: 5000, status: "PENDING" }],
  paymentCategory: "FIXED",
  currency: "USD",
  status: "PENDING",
  sentAt: "2026-01-01T00:00:00.000Z",
  negotiation: [],
};

/** Reads back the metadata this call wrote. */
function writtenMeta() {
  const cover = db.application.update.mock.calls[0][0].data.coverLetter as string;
  return JSON.parse(cover.split(METADATA_MARKER)[1]);
}

function arrangeOffer(over: { offer?: Record<string, unknown>; projectStatus?: string; appStatus?: string } = {}) {
  const coverLetter = metaBlob({ offerLetter: { ...OFFER, ...(over.offer ?? {}) } });

  db.application.findUnique.mockImplementation(async (args: any) => {
    if (args.select?.coverLetter) {
      return {
        id: "app-1",
        status: over.appStatus ?? "SHORTLISTED",
        roleId: null,
        isApprentice: false,
        coverLetter,
      };
    }
    return {
      id: "app-1",
      status: over.appStatus ?? "SHORTLISTED",
      coverLetter,
      roleId: null,
      isApprentice: false,
      project: {
        id: "p1",
        title: "Redesign",
        budget: 10000,
        status: over.projectStatus ?? "OPEN",
        company: { userId: COMPANY_A!.id },
      },
      freelancer: { user: { id: FREELANCER_A!.id, name: "Freelancer A" } },
    };
  });
  db.project.findUnique.mockResolvedValue({ status: over.projectStatus ?? "OPEN" });
  db.application.update.mockResolvedValue({});
  db.project.update.mockResolvedValue({});
  db.notification.create.mockResolvedValue({});
  return coverLetter;
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
  setSession(FREELANCER_A);
  Object.assign(capacity, { projectFull: false, roleFull: false });
  partyResult.ok = true;
});

describe("H-04: accepting an offer does not fabricate the company signature", () => {
  it("records the freelancer's real signature and leaves the company's unsigned", async () => {
    arrangeOffer();
    const res = await respondToOfferLetterAction("app-1", "ACCEPT");
    expect(res.success).toBe(true);

    const contract = writtenMeta().digitalContract;
    expect(contract.freelancerSigned).toBe(true);
    // The accepting party's real address, not the "client" placeholder.
    expect(contract.freelancerIp).toBe("203.0.113.9");
    expect(contract.freelancerIp).not.toBe("client");

    // The company has not signed, and no placeholder stands in for them.
    expect(contract.clientSigned).toBe(false);
    expect(contract.clientIp).toBeUndefined();
    expect(contract.clientSignedAt).toBeUndefined();

    // The contract is awaiting counter-signature, not executed.
    expect(contract.status).toBe("SENT");
  });

  it("still hires the freelancer and moves an OPEN project to IN_PROGRESS", async () => {
    arrangeOffer();
    const res = await respondToOfferLetterAction("app-1", "ACCEPT");
    expect(res.success).toBe(true);

    expect(db.application.update.mock.calls[0][0].data.status).toBe("HIRED");
    expect(db.project.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "IN_PROGRESS" } })
    );
    // The company is told, exactly once.
    expect(db.notification.create).toHaveBeenCalledTimes(1);
  });

  it("carries the agreed milestones onto the contract", async () => {
    arrangeOffer();
    await respondToOfferLetterAction("app-1", "ACCEPT");
    const contract = writtenMeta().digitalContract;
    expect(contract.milestones).toEqual([{ title: "Phase one", budget: 5000, status: "PENDING" }]);
  });

  it("declining neither hires nor writes a contract", async () => {
    arrangeOffer();
    const res = await respondToOfferLetterAction("app-1", "DECLINE", "Rate too low");
    expect(res.success).toBe(true);

    const meta = writtenMeta();
    expect(meta.offerLetter.status).toBe("DECLINED");
    expect(meta.digitalContract).toBeUndefined();
    expect(db.application.update.mock.calls[0][0].data.status).toBeUndefined();
    expect(db.project.update).not.toHaveBeenCalled();
  });
});

describe("H-02 / H-03: acceptance is gated on capacity and project state", () => {
  it("refuses when the role or project has filled since the offer", async () => {
    arrangeOffer();
    capacity.projectFull = true;
    const res = await respondToOfferLetterAction("app-1", "ACCEPT");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/since been filled/i);
    expect(db.application.update).not.toHaveBeenCalled();
  });

  it("refuses acceptance onto a cancelled project", async () => {
    arrangeOffer({ projectStatus: "CANCELLED" });
    const res = await respondToOfferLetterAction("app-1", "ACCEPT");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/cancelled/i);
    expect(db.application.update).not.toHaveBeenCalled();
  });

  it("refuses acceptance onto a completed project", async () => {
    arrangeOffer({ projectStatus: "COMPLETED" });
    const res = await respondToOfferLetterAction("app-1", "ACCEPT");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/complete/i);
  });

  it("refuses while a counter-offer is still pending", async () => {
    arrangeOffer({
      offer: { negotiation: [{ status: "PENDING", proposedAmount: 7000, previousAmount: 5000 }] },
    });
    const res = await respondToOfferLetterAction("app-1", "ACCEPT");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/counter-offer is still awaiting/i);
  });

  it("takes a row lock and commits the status with the metadata", async () => {
    arrangeOffer();
    await respondToOfferLetterAction("app-1", "ACCEPT");

    expect(db.$queryRaw).toHaveBeenCalled(); // SELECT … FOR UPDATE
    // One write carrying both the hire and the contract — not two racing writes.
    expect(db.application.update).toHaveBeenCalledTimes(1);
    const data = db.application.update.mock.calls[0][0].data;
    expect(data.status).toBe("HIRED");
    expect(data.coverLetter).toContain(METADATA_MARKER);
  });
});

describe("H-04: the company signs through the intended flow", () => {
  function arrangeContract(contract: Record<string, unknown>) {
    const coverLetter = metaBlob({ digitalContract: contract });
    db.application.findUnique.mockImplementation(async (args: any) =>
      args.select?.coverLetter
        ? { id: "app-1", status: "HIRED", roleId: null, isApprentice: false, coverLetter }
        : {
            id: "app-1",
            projectId: "p1",
            coverLetter,
            project: { id: "p1", title: "Redesign", budget: 10000, company: {} },
          }
    );
    db.paymentItem.findMany.mockResolvedValue([]);
    db.application.update.mockResolvedValue({});
    db.application.findMany.mockResolvedValue([]);
    db.project.findUnique.mockResolvedValue({ status: "IN_PROGRESS" });
    db.project.update.mockResolvedValue({});
    return coverLetter;
  }

  const AWAITING_COMPANY = {
    contractText: "c",
    freelancerSigned: true,
    freelancerSignedAt: "2026-01-02T00:00:00.000Z",
    freelancerIp: "203.0.113.9",
    clientSigned: false,
    status: "SENT",
    milestones: [{ title: "Phase one", budget: 5000, status: "PENDING" }],
  };

  it("records the company signature with a real IP and completes the contract", async () => {
    setSession(COMPANY_A);
    partyResult.data = { userId: COMPANY_A!.id, role: "COMPANY", application: {} as any };
    arrangeContract(AWAITING_COMPANY);

    const res = await signDigitalContract("app-1");
    expect(res.success).toBe(true);

    const contract = writtenMeta().digitalContract;
    expect(contract.clientSigned).toBe(true);
    expect(contract.clientIp).toBe("203.0.113.9");
    expect(contract.clientIp).not.toBe("server");
    // Both signatures present, so the contract is executed and escrow opens.
    expect(contract.status).toBe("SIGNED");
    expect(contract.milestones[0].status).toBe("ESCROWED");
    // The freelancer's earlier signature is preserved, not overwritten.
    expect(contract.freelancerSigned).toBe(true);
    expect(contract.freelancerSignedAt).toBe("2026-01-02T00:00:00.000Z");
  });

  it("records a freelancer signature without touching the company's", async () => {
    setSession(FREELANCER_A);
    partyResult.data = { userId: FREELANCER_A!.id, role: "FREELANCER", application: {} as any };
    arrangeContract({ ...AWAITING_COMPANY, freelancerSigned: false, freelancerIp: undefined });

    const res = await signDigitalContract("app-1");
    expect(res.success).toBe(true);

    const contract = writtenMeta().digitalContract;
    expect(contract.freelancerSigned).toBe(true);
    expect(contract.freelancerIp).toBe("203.0.113.9");
    expect(contract.clientSigned).toBe(false);
    // One signature only, so the contract is not yet executed.
    expect(contract.status).toBe("SENT");
  });

  it("refuses a caller who is not a party to the application", async () => {
    partyResult.ok = false;
    partyResult.error = "Not found, or you do not have access to it.";
    const res = await signDigitalContract("app-1");
    expect(res.success).toBe(false);
    expect(db.application.update).not.toHaveBeenCalled();
    partyResult.error = undefined;
  });

  it("takes a row lock before mutating the signature blob", async () => {
    setSession(COMPANY_A);
    partyResult.data = { userId: COMPANY_A!.id, role: "COMPANY", application: {} as any };
    arrangeContract(AWAITING_COMPANY);

    await signDigitalContract("app-1");
    expect(db.$queryRaw).toHaveBeenCalled();
    expect(db.application.update).toHaveBeenCalledTimes(1);
  });
});
