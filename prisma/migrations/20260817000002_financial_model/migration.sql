-- CreateEnum
CREATE TYPE "CompensationTypeEnum" AS ENUM ('FIXED', 'HOURLY', 'MILESTONE', 'STIPEND', 'UNPAID');

-- CreateEnum
CREATE TYPE "StipendFrequencyEnum" AS ENUM ('ONE_TIME', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "PaymentItemStatus" AS ENUM ('PENDING', 'FUNDED', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED', 'RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkLogStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('FUND', 'RELEASE', 'REFUND', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "ProjectCompensation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "CompensationTypeEnum" NOT NULL,
    "currency" TEXT NOT NULL,
    "totalBudget" DECIMAL(18,2) NOT NULL,
    "budgetNegotiable" BOOLEAN NOT NULL DEFAULT false,
    "hourlyRate" DECIMAL(18,2),
    "estimatedHours" INTEGER,
    "maxHours" INTEGER,
    "stipendAmount" DECIMAL(18,2),
    "stipendFrequency" "StipendFrequencyEnum",
    "stipendPeriods" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCompensation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentItemStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" DATE,
    "fundedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "releasedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "submissionNote" TEXT,
    "reviewNote" TEXT,
    "revisionCount" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "hours" DECIMAL(6,2) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "WorkLogStatus" NOT NULL DEFAULT 'PENDING',
    "rateSnapshot" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StipendPeriod" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "periodIndex" INTEGER NOT NULL,
    "periodStart" DATE,
    "periodEnd" DATE,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentItemStatus" NOT NULL DEFAULT 'PENDING',
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StipendPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "paymentItemId" TEXT,
    "workLogId" TEXT,
    "stipendPeriodId" TEXT,
    "type" "LedgerEntryType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "note" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "externalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCompensation_projectId_key" ON "ProjectCompensation"("projectId");

-- CreateIndex
CREATE INDEX "PaymentItem_projectId_idx" ON "PaymentItem"("projectId");

-- CreateIndex
CREATE INDEX "PaymentItem_applicationId_idx" ON "PaymentItem"("applicationId");

-- CreateIndex
CREATE INDEX "PaymentItem_projectId_status_idx" ON "PaymentItem"("projectId", "status");

-- CreateIndex
CREATE INDEX "WorkLog_projectId_idx" ON "WorkLog"("projectId");

-- CreateIndex
CREATE INDEX "WorkLog_applicationId_status_idx" ON "WorkLog"("applicationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkLog_applicationId_workDate_description_key" ON "WorkLog"("applicationId", "workDate", "description");

-- CreateIndex
CREATE INDEX "StipendPeriod_projectId_idx" ON "StipendPeriod"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "StipendPeriod_applicationId_periodIndex_key" ON "StipendPeriod"("applicationId", "periodIndex");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_idempotencyKey_key" ON "PaymentTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentTransaction_projectId_idx" ON "PaymentTransaction"("projectId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_applicationId_idx" ON "PaymentTransaction"("applicationId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_paymentItemId_idx" ON "PaymentTransaction"("paymentItemId");

-- AddForeignKey
ALTER TABLE "ProjectCompensation" ADD CONSTRAINT "ProjectCompensation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentItem" ADD CONSTRAINT "PaymentItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentItem" ADD CONSTRAINT "PaymentItem_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StipendPeriod" ADD CONSTRAINT "StipendPeriod_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StipendPeriod" ADD CONSTRAINT "StipendPeriod_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_paymentItemId_fkey" FOREIGN KEY ("paymentItemId") REFERENCES "PaymentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

