/**
 * SEC-002 — password hashing.
 *
 * Before this, `User.passwordHash` held the *plaintext* password (the column
 * was named for a hash it never contained) and login compared with `!==`.
 * `bcryptjs` was already a declared dependency but was imported nowhere.
 *
 * Existing rows cannot simply be reinterpreted as hashes, so this module
 * supports a one-way transparent migration:
 *
 *   1. `isBcryptHash()` distinguishes an already-migrated row from a legacy
 *      plaintext one by its `$2a$/$2b$/$2y$` prefix and length.
 *   2. `verifyPassword()` verifies against whichever form is stored, and
 *      reports back whether the stored value needs upgrading.
 *   3. The caller re-hashes on the next successful login and sets
 *      `passwordChangeRequired`, so the credential the user typed is never
 *      left sitting in plaintext after they have proven they know it.
 *
 * A legacy plaintext value that merely *looks* like a bcrypt hash would be
 * misread, which is why the check is anchored and length-constrained rather
 * than a loose `startsWith("$2")`.
 */

import bcrypt from "bcryptjs";

/** Cost factor. 12 is the current sensible default for interactive logins. */
const BCRYPT_ROUNDS = 12;

export const MIN_PASSWORD_LENGTH = 8;

/** A bcrypt digest is exactly 60 chars: $2<variant>$<2-digit cost>$<53 chars>. */
const BCRYPT_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

export function isBcryptHash(stored: string | null | undefined): boolean {
  return typeof stored === "string" && stored.length === 60 && BCRYPT_PATTERN.test(stored);
}

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

export interface PasswordVerification {
  /** Whether the supplied password matched what is stored. */
  valid: boolean;
  /**
   * True when the stored value was legacy plaintext and should be replaced
   * with a bcrypt hash now that the user has proven they know it.
   */
  needsRehash: boolean;
}

/**
 * Verify a password against the stored value, whatever form it is in.
 *
 * Legacy comparison uses a length-safe constant-time compare rather than
 * `===`, so the migration window does not reintroduce a timing oracle.
 */
export async function verifyPassword(
  plaintext: string,
  stored: string | null | undefined
): Promise<PasswordVerification> {
  if (!stored) return { valid: false, needsRehash: false };

  if (isBcryptHash(stored)) {
    return { valid: await bcrypt.compare(plaintext, stored), needsRehash: false };
  }

  // Legacy plaintext row. Compare without leaking length via early return.
  const valid = timingSafeEqualStrings(plaintext, stored);
  return { valid, needsRehash: valid };
}

/**
 * Constant-time string comparison. Compares over a fixed number of iterations
 * so the loop count does not depend on where the first difference falls.
 * Length inequality is folded into the result rather than short-circuiting.
 */
function timingSafeEqualStrings(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
