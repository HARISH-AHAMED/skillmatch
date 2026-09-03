-- Administrator moderation for reviews. The row is preserved so the record
-- stays auditable; the columns record that it was hidden, why, and by whom.
ALTER TABLE "Review" ADD COLUMN "hiddenAt" TIMESTAMP(3);
ALTER TABLE "Review" ADD COLUMN "hiddenReason" TEXT;
ALTER TABLE "Review" ADD COLUMN "hiddenById" TEXT;
