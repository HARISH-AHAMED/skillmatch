-- SEC-002: transparent migration of legacy plaintext credentials.
--
-- `User.passwordHash` historically stored the plaintext password. Values are
-- re-hashed with bcrypt on each user's next successful login; this flag records
-- that the credential was once stored in the clear so the user can be prompted
-- to rotate it.
--
-- Additive and backfilled with a default, so it is safe to apply to a populated
-- table without downtime.
ALTER TABLE "User" ADD COLUMN "passwordChangeRequired" BOOLEAN NOT NULL DEFAULT false;
