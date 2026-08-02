-- Prisma one-to-one requires unique memberId (member belongs to one gym).

CREATE UNIQUE INDEX "DietPlan_memberId_key" ON "DietPlan"("memberId");
CREATE UNIQUE INDEX "WorkoutPlan_memberId_key" ON "WorkoutPlan"("memberId");
