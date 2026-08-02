-- Visitor conversion status (pending vs converted to member).

CREATE TYPE "VisitorStatus" AS ENUM ('pending', 'converted');

ALTER TABLE "Visitor"
  ADD COLUMN "status" "VisitorStatus" NOT NULL DEFAULT 'pending';

CREATE INDEX "Visitor_gymId_status_idx" ON "Visitor"("gymId", "status");
