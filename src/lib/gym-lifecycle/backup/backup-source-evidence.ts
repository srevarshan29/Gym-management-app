import { POSTGRES_GYM_SCOPED_TABLES } from "@/lib/seed/tenant-id-reconciliation";

import { backupObjectPrefix } from "@/lib/gym-lifecycle/backup/backup-format";
import type { TenantBackupArtifactEntry } from "@/lib/gym-lifecycle/backup/backup-format";
import { validateSupabaseStorageBackupArtifacts } from "@/lib/gym-lifecycle/backup/backup-supabase-artifact-verify";
import { TENANT_GYM_ID_COLLECTIONS } from "@/lib/gym-lifecycle/backup/tenant-data-inventory";
import type { GymDoc } from "@/lib/firestore/types";
import type { GymTenantBackupJobDoc } from "@/lib/firestore/repositories/gym-tenant-backup-jobs";

export type TenantBackupSourceCompletionRecord = {
  status: "complete";
  inspectedAt: string;
  recordCount: number;
};

export type TenantBackupEvidenceBindingV1 = {
  gymId: string;
  backupId: string;
  backupJobId: string;
  artifactPrefix: string;
  manifestChecksumSha256: string;
  backupVerifiedAt: string;
};

export type TenantBackupSourceEvidenceV1 = {
  binding?: TenantBackupEvidenceBindingV1;
  firestore: TenantBackupSourceCompletionRecord & {
    collectionsScanned: number;
    rootDocCount: number;
    shardArtifactCount: number;
    documentFingerprintCount?: number;
    documentIntegrityVerified?: boolean;
    integrityVerifiedAt?: string;
  };
  postgres: TenantBackupSourceCompletionRecord & {
    tablesExported: number;
    expectedTables: number;
    integrityVerified?: boolean;
    integrityVerifiedAt?: string;
  };
  supabase: TenantBackupSourceCompletionRecord & {
    pathsManifestPath: string;
    pathsManifestChecksumSha256: string;
    objectByteArtifacts: number;
    integrityVerified?: boolean;
    integrityVerifiedAt?: string;
  };
  financial: TenantBackupSourceCompletionRecord & {
    archivePath: string;
  };
};

export function postgresExportTableName(
  table: (typeof POSTGRES_GYM_SCOPED_TABLES)[number],
): string {
  return "rawTable" in table && typeof (table as { rawTable?: string }).rawTable === "string"
    ? (table as { rawTable: string }).rawTable
    : table.prismaModel ?? table.label;
}

export function expectedPostgresExportTableNames(): string[] {
  return POSTGRES_GYM_SCOPED_TABLES.map((t) => postgresExportTableName(t));
}

export function buildTenantBackupEvidenceBinding(input: {
  gymId: string;
  backupId: string;
  backupJobId: string;
  manifestChecksumSha256: string;
  backupVerifiedAt: string;
}): TenantBackupEvidenceBindingV1 {
  return {
    gymId: input.gymId,
    backupId: input.backupId,
    backupJobId: input.backupJobId,
    artifactPrefix: backupObjectPrefix(input.gymId, input.backupId),
    manifestChecksumSha256: input.manifestChecksumSha256,
    backupVerifiedAt: input.backupVerifiedAt,
  };
}

export type SourceEvidenceValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export type PostgresArtifactBodies = Record<string, Buffer>;

function artifactMatchesPath(artifacts: TenantBackupArtifactEntry[], path: string): boolean {
  return artifacts.some((a) => a.path === path || a.path.endsWith(path));
}

function validateEvidenceBinding(
  binding: TenantBackupEvidenceBindingV1,
  input: { gymId: string; backupId: string; backupJobId: string; manifestChecksumSha256: string },
): SourceEvidenceValidationResult {
  if (binding.gymId !== input.gymId) {
    return { ok: false, reason: "Backup evidence is bound to a different gym." };
  }
  if (binding.backupId !== input.backupId) {
    return { ok: false, reason: "Backup evidence is bound to a different backup." };
  }
  if (binding.backupJobId !== input.backupJobId) {
    return { ok: false, reason: "Backup evidence is bound to a different backup job." };
  }
  if (binding.manifestChecksumSha256 !== input.manifestChecksumSha256) {
    return { ok: false, reason: "Backup evidence manifest checksum does not match." };
  }
  const expectedPrefix = backupObjectPrefix(input.gymId, input.backupId);
  if (binding.artifactPrefix !== expectedPrefix) {
    return { ok: false, reason: "Backup evidence artifact prefix is invalid." };
  }
  if (!binding.backupVerifiedAt) {
    return { ok: false, reason: "Backup evidence is missing verification timestamp." };
  }
  return { ok: true };
}

export function validateTenantBackupSourceEvidence(input: {
  evidence: TenantBackupSourceEvidenceV1 | null | undefined;
  artifacts: TenantBackupArtifactEntry[];
  gymId: string;
  backupId: string;
  backupJobId: string;
  manifestChecksumSha256: string;
  pathsManifestBody?: Buffer;
  objectBodiesByArtifactPath?: Record<string, Buffer>;
  postgresArtifactBodies?: PostgresArtifactBodies;
  /** Set when verify phase already downloaded and checked artifact bodies. */
  trustPriorArtifactVerification?: boolean;
}): SourceEvidenceValidationResult {
  const { evidence, artifacts } = input;
  if (!evidence) {
    return { ok: false, reason: "Backup source evidence is missing." };
  }

  if (!evidence.binding) {
    return { ok: false, reason: "Backup evidence binding is missing." };
  }
  const bindingCheck = validateEvidenceBinding(evidence.binding, {
    gymId: input.gymId,
    backupId: input.backupId,
    backupJobId: input.backupJobId,
    manifestChecksumSha256: input.manifestChecksumSha256,
  });
  if (!bindingCheck.ok) return bindingCheck;

  const expectedPrefix = evidence.binding.artifactPrefix;

  if (evidence.firestore.status !== "complete") {
    return { ok: false, reason: "Firestore export source evidence is incomplete." };
  }
  if (evidence.firestore.collectionsScanned !== TENANT_GYM_ID_COLLECTIONS.length) {
    return {
      ok: false,
      reason: "Firestore export did not scan every tenant collection.",
    };
  }
  const gymRootsPath = `${expectedPrefix}firestore/gym-roots.json`;
  if (!artifactMatchesPath(artifacts, gymRootsPath)) {
    return { ok: false, reason: "Firestore gym root artifact is missing." };
  }
  const firestoreShardCount = artifacts.filter((a) => a.path.includes("/firestore/")).length;
  if (firestoreShardCount < 1) {
    return { ok: false, reason: "Firestore export artifacts are missing." };
  }
  if (evidence.firestore.shardArtifactCount !== firestoreShardCount) {
    return {
      ok: false,
      reason: "Firestore source evidence does not match exported shard artifacts.",
    };
  }
  if (evidence.firestore.documentIntegrityVerified !== true) {
    return {
      ok: false,
      reason: "Firestore document-level integrity has not been verified for this backup.",
    };
  }

  if (evidence.postgres.status !== "complete") {
    return { ok: false, reason: "PostgreSQL export source evidence is incomplete." };
  }
  if (evidence.postgres.integrityVerified !== true) {
    return {
      ok: false,
      reason: "PostgreSQL export integrity has not been verified for this backup.",
    };
  }
  const expectedTables = expectedPostgresExportTableNames();
  if (
    evidence.postgres.expectedTables !== expectedTables.length ||
    evidence.postgres.tablesExported !== expectedTables.length
  ) {
    return {
      ok: false,
      reason: "PostgreSQL export did not cover every gym-scoped table.",
    };
  }
  for (const table of expectedTables) {
    const tablePath = `${expectedPrefix}postgres/${table}.json`;
    const tableArtifact = artifacts.find((a) => a.path === tablePath);
    if (!tableArtifact) {
      return { ok: false, reason: `PostgreSQL artifact missing for table ${table}.` };
    }
    let rowCount: number;
    if (input.postgresArtifactBodies?.[tablePath]) {
      try {
        const payload = JSON.parse(
          input.postgresArtifactBodies[tablePath]!.toString("utf8"),
        ) as { rowCount?: number; rows?: unknown[] };
        rowCount =
          typeof payload.rowCount === "number"
            ? payload.rowCount
            : Array.isArray(payload.rows)
              ? payload.rows.length
              : -1;
      } catch {
        return { ok: false, reason: `PostgreSQL artifact for ${table} is not valid JSON.` };
      }
      if (rowCount !== tableArtifact.recordCount) {
        return {
          ok: false,
          reason: `PostgreSQL row count mismatch in artifact body for ${table}.`,
        };
      }
    }
  }
  const postgresRowArtifacts = artifacts.filter((a) => a.path.includes("/postgres/"));
  const postgresRowSum = postgresRowArtifacts.reduce((s, a) => s + a.recordCount, 0);
  if (evidence.postgres.recordCount !== postgresRowSum) {
    return {
      ok: false,
      reason: "PostgreSQL source record count does not match exported artifacts.",
    };
  }

  if (evidence.supabase.status !== "complete") {
    return { ok: false, reason: "Supabase storage export source evidence is incomplete." };
  }
  if (evidence.supabase.integrityVerified !== true) {
    return {
      ok: false,
      reason: "Supabase storage export integrity has not been verified for this backup.",
    };
  }
  const pathsPath = evidence.supabase.pathsManifestPath;
  if (!artifactMatchesPath(artifacts, pathsPath)) {
    return { ok: false, reason: "Supabase paths manifest artifact is missing." };
  }
  if (!pathsPath.startsWith(expectedPrefix)) {
    return { ok: false, reason: "Supabase paths manifest is outside the backup prefix." };
  }
  const pathsArtifact = artifacts.find((a) => a.path === pathsPath);
  if (pathsArtifact && pathsArtifact.checksumSha256 !== evidence.supabase.pathsManifestChecksumSha256) {
    return {
      ok: false,
      reason: "Supabase paths manifest checksum does not match source evidence.",
    };
  }

  if (!input.pathsManifestBody && !input.trustPriorArtifactVerification) {
    return { ok: false, reason: "Supabase paths manifest body is required for verification." };
  }

  if (input.pathsManifestBody) {
    const supabaseCheck = validateSupabaseStorageBackupArtifacts({
    gymId: input.gymId,
    pathsManifestBody: input.pathsManifestBody,
    artifacts,
    objectBodiesByArtifactPath: input.objectBodiesByArtifactPath,
  });
    if (!supabaseCheck.ok) return supabaseCheck;
  } else if (evidence.supabase.recordCount !== evidence.supabase.objectByteArtifacts) {
    return {
      ok: false,
      reason: "Supabase listed object count does not match downloaded object artifacts.",
    };
  }

  if (evidence.financial.status !== "complete") {
    return { ok: false, reason: "Financial archive source evidence is incomplete." };
  }
  const financialPath = evidence.financial.archivePath;
  if (!artifactMatchesPath(artifacts, financialPath)) {
    return { ok: false, reason: "Financial archive artifact is missing." };
  }
  if (!financialPath.startsWith(expectedPrefix)) {
    return { ok: false, reason: "Financial archive artifact is outside the backup prefix." };
  }

  const financialArtifact = artifacts.find((a) => a.path === financialPath);
  if (!financialArtifact) {
    return { ok: false, reason: "Financial archive artifact is missing." };
  }
  if (evidence.financial.recordCount !== financialArtifact.recordCount) {
    return {
      ok: false,
      reason: "Financial archive record count does not match artifact metadata.",
    };
  }

  return { ok: true };
}

export function validateTenantBackupSourceEvidenceSyncForTests(
  input: Omit<
    Parameters<typeof validateTenantBackupSourceEvidence>[0],
    "pathsManifestBody"
  > & {
    pathsManifestBody: Buffer;
    postgresArtifactBodies?: PostgresArtifactBodies;
  },
): SourceEvidenceValidationResult {
  return validateTenantBackupSourceEvidence(input);
}

export function evaluatePromotedFullBackupEvidence(input: {
  gym: Pick<
    GymDoc,
    | "backupScope"
    | "backupStatus"
    | "backupManifestChecksum"
    | "backupVerifiedAt"
    | "backupSourceEvidence"
    | "backupCompletedJobId"
  > & { id: string };
  backupJob: (GymTenantBackupJobDoc & { id: string }) | null;
  pathsManifestBody?: Buffer;
  objectBodiesByArtifactPath?: Record<string, Buffer>;
  postgresArtifactBodies?: PostgresArtifactBodies;
}): SourceEvidenceValidationResult {
  const { gym, backupJob } = input;
  if (!gym.backupSourceEvidence?.binding) {
    return { ok: false, reason: "Gym is missing bound full backup source evidence." };
  }
  if (!gym.backupCompletedJobId) {
    return { ok: false, reason: "Gym is missing the completed full backup job reference." };
  }
  if (!backupJob) {
    return { ok: false, reason: "Full backup job record is missing." };
  }
  if (backupJob.id !== gym.backupCompletedJobId) {
    return { ok: false, reason: "Full backup job does not match the gym binding." };
  }
  if (backupJob.gymId !== gym.id) {
    return { ok: false, reason: "Full backup job belongs to a different gym." };
  }
  if (backupJob.phase !== "completed") {
    return { ok: false, reason: "Full backup job is not complete." };
  }
  if (backupJob.manifestChecksumSha256 !== gym.backupManifestChecksum) {
    return { ok: false, reason: "Backup job manifest checksum does not match gym metadata." };
  }
  if (backupJob.manifestChecksumSha256 !== gym.backupSourceEvidence.binding.manifestChecksumSha256) {
    return {
      ok: false,
      reason: "Backup job manifest checksum does not match bound evidence.",
    };
  }
  if (gym.backupManifestChecksum !== gym.backupSourceEvidence.binding.manifestChecksumSha256) {
    return { ok: false, reason: "Gym manifest checksum does not match bound evidence." };
  }
  const verifiedAtIso = gym.backupVerifiedAt?.toDate().toISOString();
  if (!verifiedAtIso || verifiedAtIso !== gym.backupSourceEvidence.binding.backupVerifiedAt) {
    return { ok: false, reason: "Gym backup verification timestamp does not match bound evidence." };
  }

  return validateTenantBackupSourceEvidence({
    evidence: gym.backupSourceEvidence,
    artifacts: backupJob.artifacts,
    gymId: gym.id,
    backupId: backupJob.backupId,
    backupJobId: backupJob.id,
    manifestChecksumSha256: gym.backupManifestChecksum ?? "",
    pathsManifestBody: input.pathsManifestBody,
    objectBodiesByArtifactPath: input.objectBodiesByArtifactPath,
    postgresArtifactBodies: input.postgresArtifactBodies,
  });
}

/** @deprecated Use evaluatePromotedFullBackupEvidence with backup job + manifest bodies. */
export function gymHasVerifiableFullBackupSourceEvidence(
  gym: Pick<GymDoc, "backupSourceEvidence">,
): SourceEvidenceValidationResult {
  if (!gym.backupSourceEvidence?.binding) {
    return { ok: false, reason: "Gym is missing promoted backup source evidence." };
  }
  return { ok: false, reason: "Full backup evidence requires backup job and manifest verification." };
}