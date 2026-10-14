/*
  Warnings:

  - You are about to drop the `EmailVerification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TwoFactorAuth` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EmailVerification" DROP CONSTRAINT "EmailVerification_userId_fkey";

-- DropForeignKey
ALTER TABLE "TwoFactorAuth" DROP CONSTRAINT "TwoFactorAuth_userId_fkey";

-- AlterTable
ALTER TABLE "UserAuth" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "EmailVerification";

-- DropTable
DROP TABLE "TwoFactorAuth";
