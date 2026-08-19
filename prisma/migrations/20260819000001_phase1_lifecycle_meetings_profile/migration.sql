-- Phase 1: lifecycle states, freelancer banner, certificate co-signers, meetings.
--
-- Every change is additive. New enum values are unused by existing rows, new
-- columns are nullable, and the new tables start empty, so projects, profiles
-- and certificates created before this migration are unaffected.

-- Lifecycle. DRAFT/CANCELLED/ARCHIVED are added alongside the existing states;
-- CLOSED keeps its established terminal meaning and is not overloaded.
ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

-- Freelancer profile banner. Nullable: existing profiles have none.
ALTER TABLE "Freelancer" ADD COLUMN "bannerUrl" TEXT;

-- Certificate co-signers. All nullable so certificates issued before
-- two-signer support continue to render from issuerName alone.
ALTER TABLE "Certificate" ADD COLUMN "signer1Name" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "signer1Title" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "signer1SignatureUrl" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "signer2Name" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "signer2Title" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "signer2SignatureUrl" TEXT;

-- Meetings.
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'CANCELLED', 'COMPLETED');
CREATE TYPE "MeetingAttendeeStatus" AS ENUM ('INVITED', 'ACCEPTED', 'DECLINED');

CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organizerUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "meetingUrl" TEXT,
    "location" TEXT,
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MeetingAttendee" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "MeetingAttendeeStatus" NOT NULL DEFAULT 'INVITED',
    CONSTRAINT "MeetingAttendee_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Meeting_projectId_idx" ON "Meeting"("projectId");
CREATE INDEX "Meeting_projectId_startsAt_idx" ON "Meeting"("projectId", "startsAt");
CREATE UNIQUE INDEX "MeetingAttendee_meetingId_userId_key" ON "MeetingAttendee"("meetingId", "userId");
CREATE INDEX "MeetingAttendee_userId_idx" ON "MeetingAttendee"("userId");

ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_organizerUserId_fkey" FOREIGN KEY ("organizerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
