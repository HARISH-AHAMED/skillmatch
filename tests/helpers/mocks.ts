import { vi } from "vitest";
import { Role } from "@prisma/client";

/**
 * Shared test doubles for the two boundaries every server action touches:
 * the Prisma client and the NextAuth session.
 *
 * Deliberately hand-rolled rather than hitting a real database — these suites
 * assert authorization decisions, which are pure logic over session + row
 * ownership. A live DB would make them slower without testing anything more.
 */

export type SessionUser = { id: string; role: Role; name?: string | null } | null;

/** Mutable session the `@/auth` mock reads from. Set via `setSession`. */
export const sessionState: { user: SessionUser } = { user: null };

export function setSession(user: SessionUser) {
  sessionState.user = user;
}

export function signedOut() {
  sessionState.user = null;
}

/** Builds a chainable Prisma mock whose per-model methods are vi.fn(). */
export function createDbMock() {
  const model = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
  });

  const client: Record<string, unknown> = {
    user: model(),
    company: model(),
    freelancer: model(),
    project: model(),
    application: model(),
    projectRole: model(),
    task: model(),
    sharedFile: model(),
    message: model(),
    projectUpdate: model(),
    notification: model(),
    mediaAsset: model(),
    adminLog: model(),
    review: model(),
    certificate: model(),
    projectCompensation: model(),
    paymentItem: model(),
    paymentTransaction: model(),
    stipendPeriod: model(),
    workLog: model(),
    meeting: model(),
    meetingAttendee: model(),
  };

  // Row locks are issued as tagged-template raw SQL. The mock records the call
  // so a test can assert a lock was taken before the read it protects.
  client.$queryRaw = vi.fn(async () => []);

  // $transaction is used two ways here: with an array of already-invoked
  // promises, and with an interactive callback that receives a client. The
  // callback form is handed the same mock so writes inside it are asserted
  // exactly like writes outside it.
  client.$transaction = vi.fn(async (ops: unknown) =>
    Array.isArray(ops) ? Promise.all(ops) : (ops as (tx: unknown) => unknown)(client)
  );

  return client as ReturnType<typeof model> extends never ? never : any;
}

export const ADMIN: SessionUser = { id: "admin-1", role: Role.ADMIN, name: "Root Admin" };
export const COMPANY_A: SessionUser = { id: "company-user-a", role: Role.COMPANY, name: "Company A" };
export const COMPANY_B: SessionUser = { id: "company-user-b", role: Role.COMPANY, name: "Company B" };
export const FREELANCER_A: SessionUser = { id: "freelancer-user-a", role: Role.FREELANCER, name: "Freelancer A" };
export const FREELANCER_B: SessionUser = { id: "freelancer-user-b", role: Role.FREELANCER, name: "Freelancer B" };
