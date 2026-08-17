import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  isBcryptHash,
  MIN_PASSWORD_LENGTH,
} from "@/lib/password";

/**
 * SEC-002 — passwords stored and compared in plaintext.
 *
 * Audit "Validate" step: inspect User.passwordHash — every row must be a $2b$
 * bcrypt string. These tests cover the unit-level guarantees that make that
 * true: hashing on write, and the detect-verify-rehash path that migrates
 * existing plaintext rows on next login.
 */
describe("SEC-002: password hashing", () => {
  it("produces a bcrypt digest, not the plaintext", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash).not.toBe("correct horse battery");
    expect(isBcryptHash(hash)).toBe(true);
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("produces a different digest each time (salted)", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
  });

  it("verifies a correct password against a bcrypt hash without asking to rehash", async () => {
    const hash = await hashPassword("s3cret-password");
    const result = await verifyPassword("s3cret-password", hash);
    expect(result).toEqual({ valid: true, needsRehash: false });
  });

  it("rejects an incorrect password against a bcrypt hash", async () => {
    const hash = await hashPassword("s3cret-password");
    const result = await verifyPassword("wrong-password", hash);
    expect(result.valid).toBe(false);
  });

  describe("legacy plaintext migration", () => {
    it("verifies a correct password stored as legacy plaintext and flags it for rehash", async () => {
      const result = await verifyPassword("legacy-pass", "legacy-pass");
      expect(result).toEqual({ valid: true, needsRehash: true });
    });

    it("rejects an incorrect password against a legacy plaintext value", async () => {
      const result = await verifyPassword("guess", "legacy-pass");
      expect(result).toEqual({ valid: false, needsRehash: false });
    });

    it("does not mistake a legacy plaintext value for a bcrypt hash", () => {
      expect(isBcryptHash("legacy-pass")).toBe(false);
      // Close-but-wrong shapes must not be treated as already-migrated,
      // otherwise a real password would be compared as a hash and always fail.
      expect(isBcryptHash("$2b$12$tooshort")).toBe(false);
      expect(isBcryptHash("$2b$12$" + "x".repeat(52))).toBe(false);
      expect(isBcryptHash(null)).toBe(false);
      expect(isBcryptHash(undefined)).toBe(false);
    });

    it("treats a real bcrypt hash as already migrated", async () => {
      expect(isBcryptHash(await hashPassword("anything"))).toBe(true);
    });
  });

  it("returns invalid when nothing is stored (e.g. OAuth-only account)", async () => {
    expect(await verifyPassword("anything", null)).toEqual({ valid: false, needsRehash: false });
    expect(await verifyPassword("anything", "")).toEqual({ valid: false, needsRehash: false });
  });

  it("enforces a minimum password length constant", () => {
    expect(MIN_PASSWORD_LENGTH).toBeGreaterThanOrEqual(8);
  });
});
