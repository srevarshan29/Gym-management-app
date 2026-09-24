import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { sha256Hex } from "@/lib/catalog/hash";
import { validateCatalogExerciseInput } from "@/lib/catalog/input-validation";
import {
  buildCatalogSyncMetaDoc,
  validateCatalogSyncMetaDoc,
} from "@/lib/catalog/sync-meta-validation";
import {
  assertCatalogSyncWriteConfirmed,
  assertCatalogSyncWriteEnvironment,
  CatalogSyncProductionBlockedError,
  CatalogSyncWriteNotConfirmedError,
  parseCatalogSyncCliArgs,
} from "@/lib/catalog/sync-environment";
import {
  computeCatalogSyncPlan,
  existingSnapshotFromValidated,
  fingerprintCatalogExercise,
} from "@/lib/catalog/sync-plan";
import {
  CatalogSyncWriteBackendRequiredError,
  runCatalogSync,
} from "@/lib/catalog/sync-runner";
import {
  CATALOG_SYNC_BATCH_SIZE,
  executeCatalogSyncWrite,
  type CatalogSyncWriterBackend,
} from "@/lib/catalog/sync-writer";
import { CATALOG_SYNC_SCRIPT_VERSION } from "@/lib/catalog/sync-version";
import type {
  CatalogExerciseInput,
  CatalogSyncMetaDoc,
  ValidatedCatalogExercise,
} from "@/lib/catalog/types";

function exerciseRow(overrides: Partial<CatalogExerciseInput> = {}): CatalogExerciseInput {
  return {
    catalogId: "dev-push-up",
    name: "Push Up",
    muscleGroup: "CHEST",
    instructions: ["Step one.", "Step two."],
    primaryMuscles: ["pectorals"],
    isBodyweight: true,
    provider: { provider: "gym", providerExerciseId: "dev-push-up" },
    ...overrides,
  };
}

function validatedExercise(
  overrides: Partial<CatalogExerciseInput> = {},
): ValidatedCatalogExercise {
  const result = validateCatalogExerciseInput(exerciseRow(overrides), {
    catalogVersion: "test-fixture-v1",
    manifestProvider: "gym",
    index: 0,
  });
  if (!result.ok) {
    throw new Error(result.errors.join("; "));
  }
  return result.exercise;
}

class MockCatalogSyncWriterBackend implements CatalogSyncWriterBackend {
  upsertCalls: Array<{ items: { action: "create" | "update"; catalogId: string }[] }> =
    [];
  deactivateCalls: string[][] = [];
  metaWrites: CatalogSyncMetaDoc[] = [];
  existing: ReturnType<typeof existingSnapshotFromValidated>[] = [];
  failUpsertBatchNumber: number | null = null;
  failDeactivateBatchNumber: number | null = null;

  async listExistingSnapshots() {
    return this.existing;
  }

  async applyUpsertBatch(
    items: { action: "create" | "update"; catalogId: string }[],
    _exercisesById: Map<string, ValidatedCatalogExercise>,
  ): Promise<void> {
    const batchNumber = this.upsertCalls.length + 1;
    if (this.failUpsertBatchNumber === batchNumber) {
      throw new Error(`Injected upsert batch ${batchNumber} failure`);
    }
    this.upsertCalls.push({ items });
  }

  async applyDeactivateBatch(catalogIds: string[]): Promise<void> {
    const batchNumber = this.deactivateCalls.length + 1;
    if (this.failDeactivateBatchNumber === batchNumber) {
      throw new Error(`Injected deactivate batch ${batchNumber} failure`);
    }
    this.deactivateCalls.push(catalogIds);
  }

  async writeSyncMeta(meta: CatalogSyncMetaDoc): Promise<void> {
    this.metaWrites.push(meta);
  }
}

function writeFixture(
  dir: string,
  exercises: CatalogExerciseInput[],
  manifestOverrides: Record<string, unknown> = {},
) {
  const exercisesJson = `${JSON.stringify(exercises, null, 2)}\n`;
  const manifestPath = join(dir, "manifest.json");
  const exercisesPath = join(dir, "exercises.json");
  writeFileSync(exercisesPath, exercisesJson, "utf8");
  writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        catalogVersion: "test-fixture-v1",
        provider: "gym",
        exerciseCount: exercises.length,
        sha256OfJson: sha256Hex(exercisesJson),
        syncedAt: null,
        ...manifestOverrides,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return { manifestPath, exercisesPath };
}

describe("catalog sync CLI safeguards", () => {
  it("defaults to dry-run", () => {
    expect(parseCatalogSyncCliArgs([]).dryRun).toBe(true);
    expect(parseCatalogSyncCliArgs(["--dry-run"]).dryRun).toBe(true);
  });

  it("requires explicit confirmation for write mode", () => {
    expect(() =>
      assertCatalogSyncWriteConfirmed(parseCatalogSyncCliArgs(["--write"])),
    ).toThrow(CatalogSyncWriteNotConfirmedError);
    expect(() =>
      assertCatalogSyncWriteConfirmed(
        parseCatalogSyncCliArgs(["--write", "--confirm-write"]),
      ),
    ).not.toThrow();
  });

  it("blocks production writes unless explicitly allowed", () => {
    expect(() =>
      assertCatalogSyncWriteEnvironment({
        projectId: "prod-project",
        firestoreEmulatorHost: null,
        isEmulator: false,
        allowProduction: false,
      }),
    ).toThrow(CatalogSyncProductionBlockedError);

    expect(() =>
      assertCatalogSyncWriteEnvironment({
        projectId: "prod-project",
        firestoreEmulatorHost: null,
        isEmulator: false,
        allowProduction: true,
      }),
    ).not.toThrow();
  });
});

describe("executeCatalogSyncWrite", () => {
  it("applies create, update, deactivate, and unchanged counts", async () => {
    const backend = new MockCatalogSyncWriterBackend();
    const base = validatedExercise();
    const changed = validatedExercise();
    changed.description = "Updated description";
    const created = validatedExercise({ catalogId: "dev-new", name: "New Move" });
    backend.existing = [
      existingSnapshotFromValidated(base),
      existingSnapshotFromValidated(
        validatedExercise({ catalogId: "dev-retired", name: "Retired Move" }),
      ),
    ];

    const plan = computeCatalogSyncPlan([changed, created], backend.existing);

    const result = await executeCatalogSyncWrite({
      backend,
      plan,
      exercises: [changed, created],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.counts.created).toBe(1);
      expect(result.counts.updated).toBe(1);
      expect(result.counts.deactivated).toBe(1);
      expect(result.counts.unchanged).toBe(0);
    }
    expect(backend.deactivateCalls.length).toBe(1);
    expect(backend.deactivateCalls[0]).toEqual(["dev-retired"]);
  });

  it("processes upserts in batches of 50", async () => {
    const backend = new MockCatalogSyncWriterBackend();
    const exercises = Array.from({ length: 51 }, (_, index) =>
      validatedExercise({
        catalogId: `dev-item-${index + 1}`,
        name: `Move ${index + 1}`,
      }),
    );
    const plan = computeCatalogSyncPlan(exercises, []);
    const result = await executeCatalogSyncWrite({
      backend,
      plan,
      exercises,
    });

    expect(result.ok).toBe(true);
    expect(backend.upsertCalls).toHaveLength(2);
    expect(backend.upsertCalls[0]?.items).toHaveLength(CATALOG_SYNC_BATCH_SIZE);
    expect(backend.upsertCalls[1]?.items).toHaveLength(1);
  });

  it("does not run deactivations when an upsert batch fails", async () => {
    const backend = new MockCatalogSyncWriterBackend();
    backend.failUpsertBatchNumber = 1;
    backend.existing = [
      existingSnapshotFromValidated(
        validatedExercise({ catalogId: "dev-retired", name: "Retired Move" }),
      ),
    ];

    const plan = computeCatalogSyncPlan(
      [validatedExercise({ catalogId: "dev-new", name: "New Move" })],
      backend.existing,
    );

    const result = await executeCatalogSyncWrite({
      backend,
      plan,
      exercises: [validatedExercise({ catalogId: "dev-new", name: "New Move" })],
    });

    expect(result.ok).toBe(false);
    expect(backend.deactivateCalls).toHaveLength(0);
  });

  it("is idempotent on rerun when content is unchanged", async () => {
    const backend = new MockCatalogSyncWriterBackend();
    const exercise = validatedExercise();
    backend.existing = [existingSnapshotFromValidated(exercise)];

    const plan = computeCatalogSyncPlan([exercise], backend.existing);
    const result = await executeCatalogSyncWrite({
      backend,
      plan,
      exercises: [exercise],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.counts.unchanged).toBe(1);
      expect(result.counts.created).toBe(0);
      expect(result.counts.updated).toBe(0);
    }
    expect(backend.upsertCalls).toHaveLength(0);
  });
});

describe("runCatalogSync write integration", () => {
  it("never calls the writer backend writes in dry-run mode", async () => {
    const backend = new MockCatalogSyncWriterBackend();
    const report = await runCatalogSync({ dryRun: true, backend });
    expect(report.dryRun).toBe(true);
    expect(backend.upsertCalls).toHaveLength(0);
    expect(backend.deactivateCalls).toHaveLength(0);
    expect(backend.metaWrites).toHaveLength(0);
  });

  it("requires a backend for write mode", async () => {
    await expect(runCatalogSync({ dryRun: false })).rejects.toBeInstanceOf(
      CatalogSyncWriteBackendRequiredError,
    );
  });

  it("persists metadata only after a successful complete write", async () => {
    const backend = new MockCatalogSyncWriterBackend();
    const report = await runCatalogSync({ dryRun: false, backend });
    expect(report.syncCompleted).toBe(true);
    expect(report.errors).toEqual([]);
    expect(backend.metaWrites).toHaveLength(1);
    expect(backend.metaWrites[0]?.status).toBe("complete");
    expect(backend.metaWrites[0]?.lastRun.scriptVersion).toBe(
      CATALOG_SYNC_SCRIPT_VERSION,
    );
  });

  it("does not persist metadata when a write batch fails", async () => {
    const backend = new MockCatalogSyncWriterBackend();
    backend.failUpsertBatchNumber = 1;
    const report = await runCatalogSync({ dryRun: false, backend });
    expect(report.syncCompleted).toBe(false);
    expect(report.errors.length).toBeGreaterThan(0);
    expect(backend.metaWrites).toHaveLength(0);
  });

  it("returns validation errors for invalid bundles without touching the backend", async () => {
    const backend = new MockCatalogSyncWriterBackend();
    const dir = mkdtempSync(join(tmpdir(), "catalog-invalid-write-"));
    const { manifestPath, exercisesPath } = writeFixture(
      dir,
      [exerciseRow()],
      { exerciseCount: 99 },
    );
    const report = await runCatalogSync({
      dryRun: false,
      backend,
      manifestPath,
      exercisesPath,
    });
    expect(report.errors.length).toBeGreaterThan(0);
    expect(backend.upsertCalls).toHaveLength(0);
    expect(backend.metaWrites).toHaveLength(0);
  });
});

describe("catalog sync metadata shape", () => {
  it("records checksum, counts, timestamps, and script version", () => {
    const finishedAt = "2026-09-20T10:00:01.000Z";
    const meta = buildCatalogSyncMetaDoc({
      manifestCatalogVersion: "dev-fixture-v1",
      exerciseCount: 3,
      jsonSha256: "a".repeat(64),
      dryRun: false,
      startedAt: "2026-09-20T10:00:00.000Z",
      finishedAt,
      created: 3,
      updated: 0,
      deactivated: 0,
      unchanged: 0,
      failures: [],
      warnings: [],
      status: "complete",
    });

    const validation = validateCatalogSyncMetaDoc(meta);
    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(validation.meta.jsonSha256).toBe("a".repeat(64));
      expect(validation.meta.lastRun.created).toBe(3);
      expect(validation.meta.lastRun.scriptVersion).toBe(CATALOG_SYNC_SCRIPT_VERSION);
      expect(validation.meta.syncedAt).toBe(finishedAt);
    }
  });
});

describe("catalog fingerprint rerun detection", () => {
  it("detects content changes for update planning", () => {
    const exercise = validatedExercise();
    const snapshot = existingSnapshotFromValidated(exercise);
    const changedFingerprint = fingerprintCatalogExercise({
      ...exercise,
      description: "Changed",
    });
    expect(snapshot.contentFingerprint).not.toBe(changedFingerprint);
  });
});
