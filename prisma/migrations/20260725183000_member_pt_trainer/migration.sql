-- PT member flag and optional trainer assignment (gym staff User).

ALTER TABLE "Member" ADD COLUMN "isPt" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Member" ADD COLUMN "trainerId" TEXT;

CREATE INDEX "Member_gymId_isPt_idx" ON "Member"("gymId", "isPt");
CREATE INDEX "Member_trainerId_idx" ON "Member"("trainerId");

ALTER TABLE "Member" ADD CONSTRAINT "Member_trainerId_fkey"
  FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
