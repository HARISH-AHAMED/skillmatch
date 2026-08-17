import { describe, it, expect, beforeEach, vi } from "vitest";
import { Role } from "@prisma/client";
import {
  createDbMock,
  sessionState,
  setSession,
  signedOut,
  ADMIN,
  COMPANY_A,
  FREELANCER_A,
} from "./helpers/mocks";

const db = createDbMock();

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/auth", () => ({
  auth: async () => (sessionState.user ? { user: sessionState.user } : null),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { deleteUser, updateUserRole, registerUser } = await import("@/actions/authActions");

beforeEach(() => {
  signedOut();
  Object.values(db).forEach((m) => {
    if (m && typeof m === "object") Object.values(m).forEach((fn: any) => fn?.mockReset?.());
  });
  db.$transaction.mockImplementation(async (ops: unknown) =>
    Array.isArray(ops) ? Promise.all(ops) : (ops as () => unknown)()
  );
});

/**
 * SEC-001 — deleteUser / updateUserRole previously had NO authentication.
 *
 * Audit "Validate" step: with a FREELANCER session and with no session,
 * invoke both actions directly; both must return 403 and leave the DB
 * unchanged.
 */
describe("SEC-001: admin-only user administration", () => {
  describe("deleteUser", () => {
    it("refuses an unauthenticated caller and touches no rows", async () => {
      const res = await deleteUser("victim-1");
      expect(res.error).toBeTruthy();
      expect(db.user.delete).not.toHaveBeenCalled();
      expect(db.$transaction).not.toHaveBeenCalled();
    });

    it("refuses a FREELANCER caller and touches no rows", async () => {
      setSession(FREELANCER_A);
      const res = await deleteUser("victim-1");
      expect(res.error).toBeTruthy();
      expect(db.user.delete).not.toHaveBeenCalled();
    });

    it("refuses a COMPANY caller and touches no rows", async () => {
      setSession(COMPANY_A);
      const res = await deleteUser("victim-1");
      expect(res.error).toBeTruthy();
      expect(db.user.delete).not.toHaveBeenCalled();
    });

    it("allows an admin to delete an ordinary user and writes an audit row", async () => {
      setSession(ADMIN);
      db.user.findUnique.mockResolvedValue({ id: "victim-1", role: Role.FREELANCER, email: "v@x.com" });
      const res = await deleteUser("victim-1");
      expect(res.success).toBe(true);
      expect(db.user.delete).toHaveBeenCalledWith({ where: { id: "victim-1" } });
      expect(db.adminLog.create).toHaveBeenCalled();
    });

    it("refuses self-deletion", async () => {
      setSession(ADMIN);
      const res = await deleteUser(ADMIN!.id);
      expect(res.error).toMatch(/your own account/i);
      expect(db.user.delete).not.toHaveBeenCalled();
    });

    it("refuses deleting the last remaining administrator", async () => {
      setSession(ADMIN);
      db.user.findUnique.mockResolvedValue({ id: "admin-2", role: Role.ADMIN, email: "a2@x.com" });
      db.user.count.mockResolvedValue(1);
      const res = await deleteUser("admin-2");
      expect(res.error).toMatch(/last remaining administrator/i);
      expect(db.user.delete).not.toHaveBeenCalled();
    });

    it("allows deleting an admin when others remain", async () => {
      setSession(ADMIN);
      db.user.findUnique.mockResolvedValue({ id: "admin-2", role: Role.ADMIN, email: "a2@x.com" });
      db.user.count.mockResolvedValue(3);
      const res = await deleteUser("admin-2");
      expect(res.success).toBe(true);
    });
  });

  describe("updateUserRole", () => {
    it("refuses an unauthenticated caller — no self-promotion to ADMIN", async () => {
      const res = await updateUserRole("attacker-1", Role.ADMIN);
      expect(res.error).toBeTruthy();
      expect(db.user.update).not.toHaveBeenCalled();
    });

    it("refuses a FREELANCER attempting to promote themselves to ADMIN", async () => {
      setSession(FREELANCER_A);
      const res = await updateUserRole(FREELANCER_A!.id, Role.ADMIN);
      expect(res.error).toBeTruthy();
      expect(db.user.update).not.toHaveBeenCalled();
    });

    it("allows an admin to change a role and writes an audit row", async () => {
      setSession(ADMIN);
      db.user.findUnique.mockResolvedValue({ id: "u-1", role: Role.FREELANCER, email: "u@x.com" });
      const res = await updateUserRole("u-1", Role.COMPANY);
      expect(res.success).toBe(true);
      expect(db.user.update).toHaveBeenCalledWith({ where: { id: "u-1" }, data: { role: Role.COMPANY } });
      expect(db.adminLog.create).toHaveBeenCalled();
    });

    it("refuses demoting the last remaining administrator", async () => {
      setSession(ADMIN);
      db.user.findUnique.mockResolvedValue({ id: "admin-2", role: Role.ADMIN, email: "a2@x.com" });
      db.user.count.mockResolvedValue(1);
      const res = await updateUserRole("admin-2", Role.FREELANCER);
      expect(res.error).toMatch(/last remaining administrator/i);
      expect(db.user.update).not.toHaveBeenCalled();
    });

    it("rejects a role value outside the enum", async () => {
      setSession(ADMIN);
      const res = await updateUserRole("u-1", "SUPERUSER" as Role);
      expect(res.error).toMatch(/unknown role/i);
      expect(db.user.update).not.toHaveBeenCalled();
    });
  });
});

/**
 * SEC-010 — registration accepted a client-supplied role.
 * SEC-002 — registration stored the raw password.
 */
describe("SEC-010: registration role is server-validated", () => {
  beforeEach(() => {
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockImplementation(async ({ data }: any) => ({ id: "new-user", ...data }));
  });

  it("downgrades an attempted ADMIN self-registration to FREELANCER", async () => {
    const res = await registerUser({
      name: "Attacker",
      email: "Attacker@Example.com",
      password: "a-long-enough-password",
      role: Role.ADMIN,
    });
    expect(res.success).toBe(true);
    expect(db.user.create).toHaveBeenCalled();
    expect(db.user.create.mock.calls[0][0].data.role).toBe(Role.FREELANCER);
    // ...and it must not have created an admin-shaped profile either.
    expect(db.company.create).not.toHaveBeenCalled();
  });

  it("honours a legitimate COMPANY registration and creates the matching profile", async () => {
    const res = await registerUser({
      name: "Acme",
      email: "acme@example.com",
      password: "a-long-enough-password",
      role: Role.COMPANY,
    });
    expect(res.success).toBe(true);
    expect(db.user.create.mock.calls[0][0].data.role).toBe(Role.COMPANY);
    expect(db.company.create).toHaveBeenCalled();
    expect(db.freelancer.create).not.toHaveBeenCalled();
  });

  it("stores a bcrypt hash, never the submitted password (SEC-002)", async () => {
    await registerUser({
      name: "User",
      email: "user@example.com",
      password: "plaintext-secret",
      role: Role.FREELANCER,
    });
    const stored = db.user.create.mock.calls[0][0].data.passwordHash;
    expect(stored).not.toBe("plaintext-secret");
    expect(stored).toMatch(/^\$2[aby]\$\d{2}\$/);
  });

  it("normalises the email to lower case", async () => {
    await registerUser({
      name: "User",
      email: "  MiXeD@Example.COM",
      password: "a-long-enough-password",
      role: Role.FREELANCER,
    });
    expect(db.user.create.mock.calls[0][0].data.email).toBe("mixed@example.com");
  });

  it("rejects a password below the minimum length", async () => {
    const res = await registerUser({
      name: "User",
      email: "short@example.com",
      password: "abc",
      role: Role.FREELANCER,
    });
    expect(res.error).toMatch(/at least/i);
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("rejects a duplicate email", async () => {
    db.user.findUnique.mockResolvedValue({ id: "existing" });
    const res = await registerUser({
      name: "User",
      email: "taken@example.com",
      password: "a-long-enough-password",
      role: Role.FREELANCER,
    });
    expect(res.error).toMatch(/already exists/i);
    expect(db.user.create).not.toHaveBeenCalled();
  });
});
