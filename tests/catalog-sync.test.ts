import { Timestamp } from "firebase-admin/firestore";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  loadCatalogBundleFiles,
  validateCatalogBundle,
} from "@/lib/catalog/bundle-validation";
import { sha256Hex } from "@/lib/catalog/hash";
import { validateCatalogExerciseInput } from "@/lib/catalog/input-validation";
import {
  validateCatalogManifest,
  validateManifestExerciseCount,
  validateManifestSha256,
} from "@/lib/catalog/manifest-validation";
import {
  buildCatalogSyncMetaDoc,
  validateCatalogSyncMetaDoc,
} from "@/lib/catalog/sync-meta-validation";
import {
  computeCatalogSyncPlan,
  existingSnapshotFromValidated,
  fingerprintCatalogExercise,
} from "@/lib/catalog/sync-plan";
import { runCatalogSync } from "@/lib/catalog/sync-runner";
import type { CatalogExerciseInput } from "@/lib/catalog/types";

const PUBLIC_BASE =
  "https://example.supabase.co/storage/v1/object/public/gym-assets";

beforeEach(() => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_STORAGE_BUCKET = "gym-assets";
});

afterEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_STORAGE_BUCKET;
});

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

function manifestFor(exercisesJson: string, exerciseCount: number, overrides = {}) {
  return {
    catalogVersion: "test-fixture-v1",
    provider: "gym",
    exerciseCount,
    sha256OfJson: sha256Hex(exercisesJson),
    syncedAt: null,
    ...overrides,
  };
}

function writeFixture(
  dir: string,
  exercises: CatalogExerciseInput[],
  manifestOverrides: Record<string, unknown> = {},
) {
  const exercisesJson = `${JSON.stringify(exercises, null, 2)}\n`;
  const manifestPath = join(dir, "manifest.json");
  const exercisesPath = join(dir, "exercises.json");
  writeFileSync(
    exercisesPath,
    exercisesJson,
    "utf8",
  );
  writeFileSync(
    manifestPath,
    `${JSON.stringify(manifestFor(exercisesJson, exercises.length, manifestOverrides), null, 2)}\n`,
    "utf8",
  );
  return { manifestPath, exercisesPath, exercisesJson };
}

describe("catalog manifest validation", () => {
  it("accepts a valid manifest", () => {
    const result = validateCatalogManifest({
      catalogVersion: "dev-fixture-v1",
      provider: "gym",
      exerciseCount: 3,
      sha256OfJson: "a".repeat(64),
      syncedAt: null,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects invalid provider and checksum format", () => {
    const result = validateCatalogManifest({
      catalogVersion: "dev-fixture-v1",
      provider: "repdb-invalid",
      exerciseCount: 1,
      sha256OfJson: "not-a-hash",
      syncedAt: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          "manifest.provider must be repdb, custom, or gym.",
          "manifest.sha256OfJson must be a 64-character SHA-256 hex digest.",
        ]),
      );
    }
  });
});

describe("catalog bundle validation", () => {
  it("validates the committed development fixture", () => {
    const bundle = loadCatalogBundleFiles();
    const result = validateCatalogBundle(bundle);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.manifest.catalogVersion).toBe("dev-fixture-v1");
      expect(result.exercises).toHaveLength(3);
    }
  });

  it("detects duplicate catalog IDs", () => {
    const dir = mkdtempSync(join(tmpdir(), "catalog-dup-id-"));
    const { manifestPath, exercisesPath } = writeFixture(dir, [
      exerciseRow({ catalogId: "dev-push-up" }),
      exerciseRow({ catalogId: "dev-push-up", name: "Push Up Clone" }),
    ]);
    const result = validateCatalogBundle(
      loadCatalogBundleFiles({ manifestPath, exercisesPath }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.includes('Duplicate catalogId "dev-push-up"'))).toBe(
        true,
      );
    }
  });

  it("detects duplicate normalized names", () => {
    const dir = mkdtempSync(join(tmpdir(), "catalog-dup-name-"));
    const { manifestPath, exercisesPath } = writeFixture(dir, [
      exerciseRow({ catalogId: "dev-push-up", name: "Push Up" }),
      exerciseRow({ catalogId: "dev-push-up-alt", name: "  PUSH UP  " }),
    ]);
    const result = validateCatalogBundle(
      loadCatalogBundleFiles({ manifestPath, exercisesPath }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((error) =>
          error.includes('Duplicate normalized name "push up"'),
        ),
      ).toBe(true);
    }
  });

  it("detects manifest exercise count mismatch", () => {
    const exercises = [exerciseRow()];
    const exercisesJson = `${JSON.stringify(exercises, null, 2)}\n`;
    const message = validateManifestExerciseCount(
      manifestFor(exercisesJson, 99) as never,
      exercises.length,
    );
    expect(message).toContain("does not match exercises.json length");
  });

  it("detects manifest sha256 mismatch", () => {
    const exercisesJson = `${JSON.stringify([exerciseRow()], null, 2)}\n`;
    const message = validateManifestSha256(
      manifestFor(exercisesJson, 1, { sha256OfJson: "b".repeat(64) }) as never,
      sha256Hex(exercisesJson),
    );
    expect(message).toContain("does not match computed SHA-256");
  });
});

describe("catalog exercise input validation", () => {
  it("rejects invalid catalogId format", () => {
    const result = validateCatalogExerciseInput(
      exerciseRow({ catalogId: "Invalid ID!" }),
      {
        catalogVersion: "test-fixture-v1",
        manifestProvider: "gym",
        index: 0,
      },
    );
    expect(result.ok).toBe(false);
  });

  it("accepts catalog-scoped media URLs", () => {
    const result = validateCatalogExerciseInput(
      exerciseRow({
        media: {
          primaryImageUrl: `${PUBLIC_BASE}/catalog/dev-push-up/primary.webp`,
          secondaryImageUrl: null,
          thumbnailUrl: null,
        },
      }),
      {
        catalogVersion: "test-fixture-v1",
        manifestProvider: "gym",
        index: 0,
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.exercise.media.primaryImageUrl).toContain("/catalog/dev-push-up/");
    }
  });

  it("rejects gym-scoped media URLs during sync validation", () => {
    const result = validateCatalogExerciseInput(
      exerciseRow({
        media: {
          primaryImageUrl: `${PUBLIC_BASE}/gyms/gym-a/exercises/ex-1/primary.webp`,
          secondaryImageUrl: null,
          thumbnailUrl: null,
        },
      }),
      {
        catalogVersion: "test-fixture-v1",
        manifestProvider: "gym",
        index: 0,
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.includes("platform catalog media URLs"))).toBe(
        true,
      );
    }
  });

  it("rejects arbitrary external media URLs during sync validation", () => {
    const result = validateCatalogExerciseInput(
      exerciseRow({
        media: {
          primaryImageUrl: "https://attacker.example/images/push-up.jpg",
          secondaryImageUrl: null,
          thumbnailUrl: null,
        },
      }),
      {
        catalogVersion: "test-fixture-v1",
        manifestProvider: "gym",
        index: 0,
      },
    );

    expect(result.ok).toBe(false);
  });

  it("rejects malformed media URLs during sync validation", () => {
    const result = validateCatalogExerciseInput(
      exerciseRow({
        media: {
          primaryImageUrl: "not-a-url",
          secondaryImageUrl: null,
          thumbnailUrl: null,
        },
      }),
      {
        catalogVersion: "test-fixture-v1",
        manifestProvider: "gym",
        index: 0,
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.includes("http(s) URL"))).toBe(true);
    }
  });

  it("generates searchPrefixes from the exercise name", () => {
    const result = validateCatalogExerciseInput(exerciseRow(), {
      catalogVersion: "test-fixture-v1",
      manifestProvider: "gym",
      index: 0,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.exercise.searchPrefixes).toEqual(
        expect.arrayContaining(["pus", "push"]),
      );
    }
  });
});

describe("catalog sync plan", () => {
  it("marks all valid rows as would-create when nothing exists yet", () => {
    const validated = validateCatalogExerciseInput(exerciseRow(), {
      catalogVersion: "test-fixture-v1",
      manifestProvider: "gym",
      index: 0,
    });
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    const plan = computeCatalogSyncPlan([validated.exercise], []);
    expect(plan.wouldCreate).toBe(1);
    expect(plan.wouldUpdate).toBe(0);
    expect(plan.wouldDeactivate).toBe(0);
  });

  it("detects update and deactivate actions idempotently", () => {
    const validated = validateCatalogExerciseInput(exerciseRow(), {
      catalogVersion: "test-fixture-v1",
      manifestProvider: "gym",
      index: 0,
    });
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    const unchanged = existingSnapshotFromValidated(validated.exercise);
    const changed = {
      ...unchanged,
      contentFingerprint: fingerprintCatalogExercise({
        ...validated.exercise,
        description: "Changed",
      }),
    };

    const updatePlan = computeCatalogSyncPlan([validated.exercise], [changed]);
    expect(updatePlan.wouldUpdate).toBe(1);

    const deactivatePlan = computeCatalogSyncPlan([], [unchanged]);
    expect(deactivatePlan.wouldDeactivate).toBe(1);

    const samePlan = computeCatalogSyncPlan([validated.exercise], [unchanged]);
    expect(samePlan.unchanged).toBe(1);
  });
});

describe("catalog sync meta validation", () => {
  it("accepts a pending dry-run metadata draft", () => {
    const draft = buildCatalogSyncMetaDoc({
      manifestCatalogVersion: "dev-fixture-v1",
      exerciseCount: 3,
      jsonSha256: "a".repeat(64),
      dryRun: true,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      created: 3,
      updated: 0,
      deactivated: 0,
      unchanged: 0,
      failures: [],
      warnings: [],
    });
    expect(validateCatalogSyncMetaDoc(draft).ok).toBe(true);
  });
});

describe("runCatalogSync dry-run behavior", () => {
  it("validates the dev fixture and reports would-create counts", async () => {
    const report = await runCatalogSync({ dryRun: true });
    expect(report.dryRun).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.totalInputExercises).toBe(3);
    expect(report.validExercises).toBe(3);
    expect(report.wouldCreate).toBe(3);
    expect(report.wouldUpdate).toBe(0);
    expect(report.wouldDeactivate).toBe(0);
    expect(report.batchesProcessed).toBe(1);
  });

  it("does not invoke backend writes in dry-run mode", async () => {
    const writeHandler = vi.fn();
    const report = await runCatalogSync({ dryRun: true });
    expect(report.dryRun).toBe(true);
    expect(writeHandler).not.toHaveBeenCalled();
  });

  it("returns validation errors without Firestore access for invalid bundles", async () => {
    const dir = mkdtempSync(join(tmpdir(), "catalog-invalid-"));
    const { manifestPath, exercisesPath } = writeFixture(
      dir,
      [exerciseRow()],
      { exerciseCount: 99 },
    );
    const report = await runCatalogSync({
      dryRun: true,
      manifestPath,
      exercisesPath,
    });
    expect(report.errors.length).toBeGreaterThan(0);
    expect(report.validExercises).toBe(0);
    expect(report.wouldCreate).toBe(0);
  });
});

describe("legacy exercise catalog compatibility", () => {
  it("keeps Firestore catalog doc validation independent from bundle input validation", () => {
    const now = Timestamp.fromDate(new Date("2026-09-20T00:00:00Z"));
    const result = validateCatalogExerciseInput(exerciseRow(), {
      catalogVersion: "dev-fixture-v1",
      manifestProvider: "gym",
      index: 0,
    });
    expect(result.ok).toBe(true);
    expect(now).toBeDefined();
  });
});
