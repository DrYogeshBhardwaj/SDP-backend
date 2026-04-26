/*
  Warnings:

  - The values [USER_178,USER_580] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - The `status` column on the `BonusLedger` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `balance` on the `WalletCash` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "IncomeStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID');

-- CreateEnum
CREATE TYPE "AnnouncementPriority" AS ENUM ('NORMAL', 'IMPORTANT', 'CRITICAL');

-- AlterEnum
ALTER TYPE "PayoutStatus" ADD VALUE 'PAID';

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('BASIC', 'BUSINESS', 'SEEDER', 'ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'BASIC';
COMMIT;

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "priority" "AnnouncementPriority" NOT NULL DEFAULT 'NORMAL';

-- AlterTable
ALTER TABLE "BonusLedger" DROP COLUMN "status",
ADD COLUMN     "status" "IncomeStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN     "system_wallet_snapshot" DOUBLE PRECISION,
ADD COLUMN     "wallet_after" DOUBLE PRECISION,
ADD COLUMN     "wallet_before" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "RankConfig" ADD COLUMN     "basicBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "businessBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "pointsRequired" INTEGER NOT NULL DEFAULT 25;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "source" TEXT,
ALTER COLUMN "amount" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "active_sdb_last_ping" TIMESTAMP(3),
ADD COLUMN     "active_sdb_start" TIMESTAMP(3),
ADD COLUMN     "active_sdd_last_ping" TIMESTAMP(3),
ADD COLUMN     "active_sdd_start" TIMESTAMP(3),
ADD COLUMN     "active_sde_last_ping" TIMESTAMP(3),
ADD COLUMN     "active_sde_start" TIMESTAMP(3),
ADD COLUMN     "active_sdm_last_ping" TIMESTAMP(3),
ADD COLUMN     "active_sdm_start" TIMESTAMP(3),
ADD COLUMN     "active_sdp_last_ping" TIMESTAMP(3),
ADD COLUMN     "active_sdp_start" TIMESTAMP(3),
ADD COLUMN     "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "sds_imagination_index" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "seen_announcement_id" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "upgradeIncluded" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "role" SET DEFAULT 'BASIC';

-- AlterTable
ALTER TABLE "WalletCash" DROP COLUMN "balance";
