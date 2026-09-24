import { PrismaClient } from "@prisma/client";

import { describe } from "vitest";

const INTEGRATION_ENV = "TENANT_RECONCILE_INTEGRATION_DATABASE_URL";

export function getTenantReconcileIntegrationDatabaseUrl(): string | null {
  const url = process.env[INTEGRATION_ENV];
  return url && url.length > 0 ? url : null;
}

export function createIntegrationPrismaClient(): PrismaClient {
  const url = getTenantReconcileIntegrationDatabaseUrl();
  if (!url) {
    throw new Error(`${INTEGRATION_ENV} is not set`);
  }
  return new PrismaClient({
    datasources: { db: { url } },
  });
}

export function integrationDescribe() {
  const url = getTenantReconcileIntegrationDatabaseUrl();
  return url ? describe : describe.skip;
}

export function uniqueIntegrationId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
