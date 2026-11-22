export function isGymDataExportEnabled(): boolean {
  return process.env.ALLOW_TENANT_GYM_DATA_EXPORT === "true";
}