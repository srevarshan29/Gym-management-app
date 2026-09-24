import {
  Timestamp,
  type Firestore,
} from "firebase-admin/firestore";

import {
  createCatalogDocFromValidated,
  updateCatalogDocFromValidated,
} from "@/lib/catalog/catalog-doc-mapper";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { CATALOG_SYNC_META_DOC_ID } from "@/lib/catalog/paths";
import {
  CATALOG_SYNC_BATCH_SIZE,
  chunkCatalogSyncPlan,
  fingerprintCatalogExercise,
  type ExistingCatalogSnapshot,
} from "@/lib/catalog/sync-plan";
import type {
  CatalogSyncFailureRecord,
  CatalogSyncMetaDoc,
  CatalogSyncPlan,
  CatalogSyncPlanItem,
  ValidatedCatalogExercise,
} from "@/lib/catalog/types";
import type { ExerciseCatalogDoc } from "@/lib/firestore/types";
import { omitUndefined, touchUpdatedAt } from "@/lib/firestore/serialize";

export type CatalogSyncWriteCounts = {
  created: number;
  updated: number;
  deactivated: number;
  unchanged: number;
};

export type CatalogSyncWriteResult =
  | {
      ok: true;
      counts: CatalogSyncWriteCounts;
      failures: CatalogSyncFailureRecord[];
    }
  | {
      ok: false;
      counts: CatalogSyncWriteCounts;
      failures: CatalogSyncFailureRecord[];
      errors: string[];
    };

export type CatalogSyncUpsertItem = {
  action: "create" | "update";
  catalogId: string;
};

/** Injectable Firestore backend for catalog sync (tests + production script). */
export interface CatalogSyncWriterBackend {
  listExistingSnapshots(): Promise<ExistingCatalogSnapshot[]>;
  applyUpsertBatch(
    items: CatalogSyncUpsertItem[],
    exercisesById: Map<string, ValidatedCatalogExercise>,
  ): Promise<void>;
  applyDeactivateBatch(catalogIds: string[]): Promise<void>;
  writeSyncMeta(meta: CatalogSyncMetaDoc): Promise<void>;
}

export function existingSnapshotFromCatalogDoc(
  doc: ExerciseCatalogDoc & { id: string },
): ExistingCatalogSnapshot {
  if (doc.id !== doc.catalogId) {
    throw new Error(
      `Catalog document id "${doc.id}" does not match catalogId "${doc.catalogId}".`,
    );
  }

  return {
    catalogId: doc.catalogId,
    catalogVersion: doc.catalogVersion,
    nameLower: doc.nameLower,
    isActive: doc.isActive,
    contentFingerprint: fingerprintCatalogExercise({
      catalogId: doc.catalogId,
      name: doc.name,
      nameLower: doc.nameLower,
      muscleGroup: doc.muscleGroup,
      description: doc.description,
      instructions: doc.instructions,
      tips: doc.tips,
      equipment: doc.equipment,
      bodyPart: doc.bodyPart,
      difficulty: doc.difficulty,
      movementPattern: doc.movementPattern,
      primaryMuscles: doc.primaryMuscles,
      secondaryMuscles: doc.secondaryMuscles,
      safetyNotes: doc.safetyNotes,
      category: doc.category,
      isBodyweight: doc.isBodyweight,
      media: doc.media,
      provider: doc.provider,
      catalogVersion: doc.catalogVersion,
      searchPrefixes: doc.searchPrefixes,
      isActive: doc.isActive,
    }),
  };
}

export class FirestoreCatalogSyncWriterBackend implements CatalogSyncWriterBackend {
  constructor(private readonly db: Firestore) {}

  private catalogCollection() {
    return this.db.collection(COLLECTIONS.exerciseCatalog);
  }

  private metaDocRef() {
    return this.db.collection(COLLECTIONS.catalogSyncMeta).doc(CATALOG_SYNC_META_DOC_ID);
  }

  async listExistingSnapshots(): Promise<ExistingCatalogSnapshot[]> {
    const snap = await this.catalogCollection().get();
    return snap.docs.map((doc) =>
      existingSnapshotFromCatalogDoc({
        id: doc.id,
        ...(doc.data() as ExerciseCatalogDoc),
      }),
    );
  }

  private async getExistingDoc(
    catalogId: string,
  ): Promise<(ExerciseCatalogDoc & { id: string }) | null> {
    const snap = await this.catalogCollection().doc(catalogId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...(snap.data() as ExerciseCatalogDoc) };
  }

  async applyUpsertBatch(
    items: CatalogSyncUpsertItem[],
    exercisesById: Map<string, ValidatedCatalogExercise>,
  ): Promise<void> {
    if (items.length === 0) return;
    const batch = this.db.batch();
    const now = Timestamp.now();

    for (const item of items) {
      const exercise = exercisesById.get(item.catalogId);
      if (!exercise) {
        throw new Error(`Missing validated exercise for catalogId "${item.catalogId}".`);
      }

      const ref = this.catalogCollection().doc(item.catalogId);
      if (item.action === "create") {
        const existing = await this.getExistingDoc(item.catalogId);
        if (existing) {
          batch.set(
            ref,
            updateCatalogDocFromValidated(exercise, existing.createdAt, now),
          );
        } else {
          batch.set(ref, createCatalogDocFromValidated(exercise, now));
        }
        continue;
      }

      const existing = await this.getExistingDoc(item.catalogId);
      if (!existing) {
        batch.set(ref, createCatalogDocFromValidated(exercise, now));
        continue;
      }

      batch.set(ref, updateCatalogDocFromValidated(exercise, existing.createdAt, now));
    }

    await batch.commit();
  }

  async applyDeactivateBatch(catalogIds: string[]): Promise<void> {
    if (catalogIds.length === 0) return;
    const batch = this.db.batch();
    const now = Timestamp.now();
    let writes = 0;

    for (const catalogId of catalogIds) {
      const existing = await this.getExistingDoc(catalogId);
      if (!existing) continue;
      const ref = this.catalogCollection().doc(catalogId);
      batch.update(ref, omitUndefined({ ...touchUpdatedAt(now), isActive: false }));
      writes += 1;
    }

    if (writes === 0) return;
    await batch.commit();
  }

  async writeSyncMeta(meta: CatalogSyncMetaDoc): Promise<void> {
    await this.metaDocRef().set(omitUndefined(meta));
  }
}

function splitPlanItems(items: CatalogSyncPlanItem[]) {
  const upserts: CatalogSyncUpsertItem[] = items
    .filter((item) => item.action === "create" || item.action === "update")
    .map((item) => ({
      action: item.action as "create" | "update",
      catalogId: item.catalogId,
    }));
  const deactivations = items
    .filter((item) => item.action === "deactivate")
    .map((item) => item.catalogId);
  const unchanged = items.filter((item) => item.action === "unchanged").length;
  return { upserts, deactivations, unchanged };
}

export async function executeCatalogSyncWrite(options: {
  backend: CatalogSyncWriterBackend;
  plan: CatalogSyncPlan;
  exercises: ValidatedCatalogExercise[];
}): Promise<CatalogSyncWriteResult> {
  const exercisesById = new Map(
    options.exercises.map((exercise) => [exercise.catalogId, exercise]),
  );
  const { upserts, deactivations, unchanged } = splitPlanItems(options.plan.items);
  const counts: CatalogSyncWriteCounts = {
    created: 0,
    updated: 0,
    deactivated: 0,
    unchanged,
  };
  const failures: CatalogSyncFailureRecord[] = [];

  const upsertBatches = chunkCatalogSyncPlan(
    upserts.map((item) => ({
      catalogId: item.catalogId,
      action: item.action,
      warnings: [],
    })),
  );

  for (const [batchIndex, batchItems] of upsertBatches.entries()) {
    const batchUpserts = batchItems.map((item) => ({
      action: item.action as "create" | "update",
      catalogId: item.catalogId,
    }));

    try {
      await options.backend.applyUpsertBatch(batchUpserts, exercisesById);
      for (const item of batchUpserts) {
        if (item.action === "create") counts.created += 1;
        else counts.updated += 1;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Firestore batch failure.";
      failures.push({
        catalogId: null,
        phase: "firestore",
        message: `Upsert batch ${batchIndex + 1} failed: ${message}`,
      });
      return {
        ok: false,
        counts,
        failures,
        errors: [message],
      };
    }
  }

  const deactivateBatches: string[][] = [];
  for (let i = 0; i < deactivations.length; i += CATALOG_SYNC_BATCH_SIZE) {
    deactivateBatches.push(deactivations.slice(i, i + CATALOG_SYNC_BATCH_SIZE));
  }

  for (const [batchIndex, catalogIds] of deactivateBatches.entries()) {
    try {
      await options.backend.applyDeactivateBatch(catalogIds);
      counts.deactivated += catalogIds.length;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Firestore batch failure.";
      failures.push({
        catalogId: null,
        phase: "firestore",
        message: `Deactivate batch ${batchIndex + 1} failed: ${message}`,
      });
      return {
        ok: false,
        counts,
        failures,
        errors: [message],
      };
    }
  }

  return { ok: true, counts, failures };
}

export { CATALOG_SYNC_BATCH_SIZE };
