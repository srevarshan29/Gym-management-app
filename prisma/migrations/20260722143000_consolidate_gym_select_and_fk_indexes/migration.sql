-- Consolidate permissive Gym SELECT policies; add FK indexes for Supabase advisor.

-- ---------------------------------------------------------------------------
-- Gym: single SELECT policy (tenant OR super-admin)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS gym_tenant_select ON "Gym";
DROP POLICY IF EXISTS gym_super_admin_select ON "Gym";

CREATE POLICY gym_select ON "Gym" FOR SELECT
  USING (
    "id" = app_current_gym_id()
    OR app_is_super_admin()
  );

-- ---------------------------------------------------------------------------
-- Unindexed foreign keys (Supabase performance advisor)
-- ---------------------------------------------------------------------------
CREATE INDEX "Subscription_packageId_idx" ON "Subscription"("packageId");
CREATE INDEX "Subscription_createdById_idx" ON "Subscription"("createdById");
CREATE INDEX "Payment_recordedById_idx" ON "Payment"("recordedById");
