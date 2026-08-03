-- CreateTable
CREATE TABLE "GymEvent" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventDate" DATE NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GymEvent_gymId_idx" ON "GymEvent"("gymId");

-- CreateIndex
CREATE INDEX "GymEvent_gymId_eventDate_idx" ON "GymEvent"("gymId", "eventDate");

-- AddForeignKey
ALTER TABLE "GymEvent" ADD CONSTRAINT "GymEvent_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GymEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GymEvent" FORCE ROW LEVEL SECURITY;

CREATE POLICY gym_event_tenant_all ON "GymEvent" FOR ALL
  USING ("gymId" = app_current_gym_id())
  WITH CHECK ("gymId" = app_current_gym_id());
