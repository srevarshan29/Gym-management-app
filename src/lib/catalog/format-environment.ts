import type { CatalogSyncEnvironment } from "@/lib/catalog/sync-environment";

export function formatCatalogSyncEnvironment(env: CatalogSyncEnvironment): string {
  const lines = [
    "Target environment",
    "==================",
    `  Firebase project:     ${env.projectId ?? "(not set)"}`,
    `  Firestore emulator:   ${env.firestoreEmulatorHost ?? "(not set — live Firestore)"}`,
    `  Emulator mode:        ${env.isEmulator ? "yes" : "no"}`,
    `  Production override:  ${env.allowProduction ? "yes (CATALOG_SYNC_ALLOW_PRODUCTION=true)" : "no"}`,
  ];
  return lines.join("\n");
}
