/*
  Warnings:

  - The primary key for the `BonusLedger` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Payout` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `Payout` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Payout` table. All the data in the column will be lost.
  - The `status` column on the `Payout` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Referral` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[name]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[referredUserId,level]` on the table `Referral` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[referral_code]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'PAYOUT';

-- DropIndex
DROP INDEX "Referral_referredUserId_key";

-- AlterTable
ALTER TABLE "BonusLedger" DROP CONSTRAINT "BonusLedger_pkey",
ADD COLUMN     "sourceUserId" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "BonusLedger_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "BonusLedger_id_seq";

-- AlterTable
ALTER TABLE "Payout" DROP CONSTRAINT "Payout_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "processed_at" TIMESTAMP(3),
ADD COLUMN     "processed_by" TEXT,
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
ADD CONSTRAINT "Payout_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Payout_id_seq";

-- AlterTable
ALTER TABLE "Referral" DROP CONSTRAINT "Referral_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Referral_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Referral_id_seq";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "referral_code" TEXT;

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "targetUserId" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankConfig" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "directRequired" INTEGER NOT NULL,
    "networkRequired" INTEGER NOT NULL,
    "bonusAmount" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RankConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRank" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rankId" INTEGER NOT NULL,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RankConfig_name_key" ON "RankConfig"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserRank_userId_rankId_key" ON "UserRank"("userId", "rankId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referredUserId_level_key" ON "Referral"("referredUserId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "User_referral_code_key" ON "User"("referral_code");

-- AddForeignKey
ALTER TABLE "BonusLedger" ADD CONSTRAINT "BonusLedger_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRank" ADD CONSTRAINT "UserRank_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRank" ADD CONSTRAINT "UserRank_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "RankConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
