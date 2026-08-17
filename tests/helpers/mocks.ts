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

  return {
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
    adminLog: model(),
    review: model(),
    certificate: model(),
    // $transaction receives an array of already-invoked promises in this
    // codebase's usage, so resolving them all matches real behaviour closely
    // enough for authorization assertions.
    $transaction: vi.fn(async (ops: unknown) =>
      Array.isArray(ops) ? Promise.all(ops) : (ops as () => unknown)()
    ),
  };
}

export const ADMIN: SessionUser = { id: "admin-1", role: Role.ADMIN, name: "Root Admin" };
export const COMPANY_A: SessionUser = { id: "company-user-a", role: Role.COMPANY, name: "Company A" };
export const COMPANY_B: SessionUser = { id: "company-user-b", role: Role.COMPANY, name: "Company B" };
export const FREELANCER_A: SessionUser = { id: "freelancer-user-a", role: Role.FREELANCER, name: "Freelancer A" };
export const FREELANCER_B: SessionUser = { id: "freelancer-user-b", role: Role.FREELANCER, name: "Freelancer B" };
