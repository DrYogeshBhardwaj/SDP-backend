/*
  Warnings:

  - A unique constraint covering the columns `[sourceUserId,type]` on the table `BonusLedger` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[activePayoutId]` on the table `WalletCash` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "BonusLedger" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Referral" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'India',
ADD COLUMN     "familyOwnerId" TEXT,
ADD COLUMN     "kit_activated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "profile_photo" TEXT,
ADD COLUMN     "upi_id" TEXT,
ADD COLUMN     "validity_expiry" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WalletCash" ADD COLUMN     "activePayoutId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "BonusLedger_sourceUserId_type_key" ON "BonusLedger"("sourceUserId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "WalletCash_activePayoutId_key" ON "WalletCash"("activePayoutId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_familyOwnerId_fkey" FOREIGN KEY ("familyOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
