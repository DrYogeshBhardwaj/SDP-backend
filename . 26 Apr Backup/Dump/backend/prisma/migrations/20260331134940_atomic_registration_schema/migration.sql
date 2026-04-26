/*
  Warnings:

  - You are about to drop the column `status` on the `BonusLedger` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Payout` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Referral` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Transaction` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "Status" ADD VALUE 'PENDING';

-- DropIndex
DROP INDEX "Payout_status_idx";

-- DropIndex
DROP INDEX "Transaction_status_idx";

-- AlterTable
ALTER TABLE "BonusLedger" DROP COLUMN "status",
ADD COLUMN     "incomeStatus" "IncomeStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "level" INTEGER,
ADD COLUMN     "plan" TEXT;

-- AlterTable
ALTER TABLE "Payout" DROP COLUMN "status",
ADD COLUMN     "payoutStatus" "PayoutStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Referral" DROP COLUMN "status",
ADD COLUMN     "referralStatus" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "status",
ADD COLUMN     "from_user_id" TEXT,
ADD COLUMN     "level" INTEGER,
ADD COLUMN     "plan_amount" DOUBLE PRECISION,
ADD COLUMN     "plan_type" TEXT,
ADD COLUMN     "txStatus" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activated_at" TIMESTAMP(3),
ADD COLUMN     "join_type" TEXT DEFAULT 'DIRECT',
ADD COLUMN     "level1_id" TEXT,
ADD COLUMN     "level2_id" TEXT,
ADD COLUMN     "level3_id" TEXT,
ADD COLUMN     "plan_amount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "plan_type" TEXT DEFAULT 'BASIC',
ADD COLUMN     "sponsor_id" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Payout_payoutStatus_idx" ON "Payout"("payoutStatus");

-- CreateIndex
CREATE INDEX "Referral_referralStatus_idx" ON "Referral"("referralStatus");

-- CreateIndex
CREATE INDEX "Transaction_txStatus_idx" ON "Transaction"("txStatus");
