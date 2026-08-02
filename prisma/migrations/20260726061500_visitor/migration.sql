-- Walk-in visitor log (tenant-scoped).

CREATE TABLE "Visitor" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "visitDate" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Visitor_gymId_visitDate_idx" ON "Visitor"("gymId", "visitDate");
CREATE INDEX "Visitor_gymId_name_idx" ON "Visitor"("gymId", "name");

ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_gymId_fkey"
  FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Visitor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Visitor" FORCE ROW LEVEL SECURITY;

CREATE POLICY visitor_tenant_all ON "Visitor" FOR ALL
  USING ("gymId" = app_current_gym_id())
  WITH CHECK ("gymId" = app_current_gym_id());
