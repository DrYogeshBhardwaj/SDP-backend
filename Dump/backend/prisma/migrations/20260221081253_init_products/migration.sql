/*
  Warnings:

  - The primary key for the `Product` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `minutes` on the `Product` table. All the data in the column will be lost.
  - Added the required column `minutes_allocated` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `Transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('PERSONAL', 'FAMILY');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PURCHASE', 'MINUTE_DEDUCT', 'BONUS');

-- AlterTable
ALTER TABLE "Product" DROP CONSTRAINT "Product_pkey",
DROP COLUMN "minutes",
ADD COLUMN     "minutes_allocated" INTEGER NOT NULL,
ADD COLUMN     "type" "ProductType" NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Product_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Product_id_seq";

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "description" TEXT,
DROP COLUMN "type",
ADD COLUMN     "type" "TransactionType" NOT NULL;
