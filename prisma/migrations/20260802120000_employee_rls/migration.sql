-- Tenant RLS for Employee (matches Visitor / DietPlan pattern).

ALTER TABLE "Employee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Employee" FORCE ROW LEVEL SECURITY;

CREATE POLICY employee_tenant_all ON "Employee" FOR ALL
  USING ("gymId" = app_current_gym_id())
  WITH CHECK ("gymId" = app_current_gym_id());
