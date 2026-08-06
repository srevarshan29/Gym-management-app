-- AlterTable
ALTER TABLE "GymProfile" ADD COLUMN "membershipPolicyText" TEXT;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN "membershipPolicyAgreedText" TEXT;
ALTER TABLE "Member" ADD COLUMN "membershipPolicyAgreedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Visitor" ADD COLUMN "membershipPolicyAgreedText" TEXT;
ALTER TABLE "Visitor" ADD COLUMN "membershipPolicyAgreedAt" TIMESTAMP(3);
