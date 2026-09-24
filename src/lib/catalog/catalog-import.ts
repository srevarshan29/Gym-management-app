import { randomUUID } from "node:crypto";

import { Timestamp, type DocumentReference, type Firestore, type Transaction } from "firebase-admin/firestore";

import { isValidCatalogId } from "@/lib/catalog/catalog-id";
import { COLLECTIONS } from "@/lib/firestore/collections";
import type { FirestoreContext } from "@/lib/firestore/context";
import { assertTenantAccess } from "@/lib/firestore/context";
import { omitUndefined, serverTimestamps } from "@/lib/firestore/serialize";
import { isCatalogLinkedExercise } from "@/lib/permissions";
import type {
  CustomExerciseDoc,
  ExerciseCatalogDoc,
  ExerciseTrackingType,
} from "@/lib/firestore/types";

export const MAX_CATALOG_IMPORT_BATCH = 25;

export type CatalogImportItemStatus =
  | "imported"
  | "already_imported"
  | "unavailable"
  | "invalid";

export type CatalogImportItemResult = {
  catalogId: string;
  status: CatalogImportItemStatus;
  exerciseId?: string;
  reason?: string;
};

export type CatalogImportSummary = {
  imported: number;
  alreadyImported: number;
  unavailable: number;
  invalid: number;
};

export type CatalogImportResult = {
  items: CatalogImportItemResult[];
  summary: CatalogImportSummary;
};

export function summarizeCatalogImportItems(
  items: CatalogImportItemResult[],
): CatalogImportSummary {
  return {
    imported: items.filter((item) => item.status === "imported").length,
    alreadyImported: items.filter((item) => item.status === "already_imported").length,
    unavailable: items.filter((item) => item.status === "unavailable").length,
    invalid: items.filter((item) => item.status === "invalid").length,
  };
}

function trackingTypeForCatalog(catalog: ExerciseCatalogDoc): ExerciseTrackingType {
  return catalog.isBodyweight ? "BODYWEIGHT" : "WEIGHTED";
}

export function buildImportedCustomExerciseDoc(
  gymId: string,
  catalog: ExerciseCatalogDoc,
  timestamps: { createdAt: Timestamp; updatedAt: Timestamp },
): Omit<CustomExerciseDoc, "id"> {
  return omitUndefined({
    gymId,
    name: catalog.name,
    nameLower: catalog.nameLower,
    muscleGroup: catalog.muscleGroup,
    defaultSets: null,
    defaultReps: null,
    defaultTempo: null,
    defaultRestSeconds: null,
    trackingType: trackingTypeForCatalog(catalog),
    isSeeded: false,
    exerciseSource: "CATALOG",
    catalogId: catalog.catalogId,
    importedCatalogVersion: catalog.catalogVersion,
    description: catalog.description,
    instructions: catalog.instructions,
    tips: catalog.tips,
    equipment: catalog.equipment,
    bodyPart: catalog.bodyPart,
    difficulty: catalog.difficulty,
    movementPattern: catalog.movementPattern,
    primaryMuscles: catalog.primaryMuscles,
    secondaryMuscles: catalog.secondaryMuscles,
    safetyNotes: catalog.safetyNotes,
    media: catalog.media,
    provider: catalog.provider,
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
  }) as Omit<CustomExerciseDoc, "id">;
}

export type CatalogImportWriteParams = {
  db: Firestore;
  ctx: FirestoreContext;
  gymId: string;
  catalogId: string;
  newExerciseId: string;
};

export function newImportedExerciseId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 25);
}

export function catalogImportLockDocId(gymId: string, catalogId: string): string {
  return `${gymId}_${catalogId}`;
}

type CatalogImportLockDoc = {
  gymId?: string;
  catalogId?: string;
  exerciseId?: string;
};

/** True when a gym exercise is a valid target for an import lock or idempotent match. */
export function isValidCatalogImportExercise(
  exercise: CustomExerciseDoc,
  gymId: string,
  catalogId: string,
): boolean {
  if (exercise.gymId !== gymId) return false;
  if (!isCatalogLinkedExercise(exercise)) return false;
  return exercise.catalogId?.trim() === catalogId;
}

type CatalogExerciseCandidate = {
  id: string;
  doc: CustomExerciseDoc;
};

/**
 * Picks one canonical exercise when legacy duplicates exist.
 * Oldest `createdAt` wins; document id breaks ties. Does not delete others.
 */
export function pickCanonicalCatalogExercise(
  candidates: CatalogExerciseCandidate[],
): CatalogExerciseCandidate {
  return [...candidates].sort((a, b) => {
    const aMillis = a.doc.createdAt?.toMillis?.() ?? 0;
    const bMillis = b.doc.createdAt?.toMillis?.() ?? 0;
    if (aMillis !== bMillis) return aMillis - bMillis;
    return a.id.localeCompare(b.id);
  })[0]!;
}

function buildImportLockPayload(
  gymId: string,
  catalogId: string,
  exerciseId: string,
  createdAt: Timestamp,
) {
  return omitUndefined({
    gymId,
    catalogId,
    exerciseId,
    createdAt,
  });
}

function alreadyImportedResult(
  catalogId: string,
  exerciseId: string,
): CatalogImportItemResult {
  return {
    catalogId,
    status: "already_imported",
    exerciseId,
  };
}

async function findMatchingCatalogExercisesInTransaction(
  tx: Transaction,
  db: Firestore,
  gymId: string,
  catalogId: string,
): Promise<CatalogExerciseCandidate[]> {
  const query = db
    .collection(COLLECTIONS.customExercises)
    .where("gymId", "==", gymId)
    .where("catalogId", "==", catalogId);
  const snap = await tx.get(query);

  return snap.docs
    .map((doc) => ({ id: doc.id, doc: doc.data() as CustomExerciseDoc }))
    .filter(({ doc }) => isValidCatalogImportExercise(doc, gymId, catalogId));
}

async function resolveLockedImportExercise(
  tx: Transaction,
  db: Firestore,
  lockData: CatalogImportLockDoc,
  gymId: string,
  catalogId: string,
): Promise<string | null> {
  if (lockData.gymId !== gymId || lockData.catalogId !== catalogId) {
    return null;
  }

  const lockedExerciseId = lockData.exerciseId?.trim();
  if (!lockedExerciseId) {
    return null;
  }

  const lockedExerciseSnap = await tx.get(
    db.collection(COLLECTIONS.customExercises).doc(lockedExerciseId),
  );
  if (!lockedExerciseSnap.exists) {
    return null;
  }

  const exercise = lockedExerciseSnap.data() as CustomExerciseDoc;
  if (!isValidCatalogImportExercise(exercise, gymId, catalogId)) {
    return null;
  }

  return lockedExerciseId;
}

async function backfillImportLock(
  tx: Transaction,
  lockRef: DocumentReference,
  gymId: string,
  catalogId: string,
  exerciseId: string,
  createdAt: Timestamp,
): Promise<CatalogImportItemResult> {
  tx.set(lockRef, buildImportLockPayload(gymId, catalogId, exerciseId, createdAt));
  return alreadyImportedResult(catalogId, exerciseId);
}

export async function importCatalogExerciseInTransaction(
  params: CatalogImportWriteParams,
): Promise<CatalogImportItemResult> {
  const { db, ctx, gymId, catalogId, newExerciseId } = params;
  assertTenantAccess(ctx, gymId);

  if (!isValidCatalogId(catalogId)) {
    return {
      catalogId,
      status: "invalid",
      reason: "catalogId format is invalid.",
    };
  }

  const lockId = catalogImportLockDocId(gymId, catalogId);
  const lockRef = db.collection(COLLECTIONS.catalogImportLocks).doc(lockId);
  const catalogRef = db.collection(COLLECTIONS.exerciseCatalog).doc(catalogId);
  const exerciseRef = db.collection(COLLECTIONS.customExercises).doc(newExerciseId);

  return db.runTransaction(async (tx) => {
    const lockSnap = await tx.get(lockRef);
    if (lockSnap.exists) {
      const lockData = lockSnap.data() as CatalogImportLockDoc;
      const validLockedExerciseId = await resolveLockedImportExercise(
        tx,
        db,
        lockData,
        gymId,
        catalogId,
      );
      if (validLockedExerciseId) {
        return alreadyImportedResult(catalogId, validLockedExerciseId);
      }
    }

    const existingMatches = await findMatchingCatalogExercisesInTransaction(
      tx,
      db,
      gymId,
      catalogId,
    );
    if (existingMatches.length > 0) {
      const canonical = pickCanonicalCatalogExercise(existingMatches);
      const now = Timestamp.now();
      return backfillImportLock(
        tx,
        lockRef,
        gymId,
        catalogId,
        canonical.id,
        now,
      );
    }

    const catalogSnap = await tx.get(catalogRef);
    if (!catalogSnap.exists) {
      return {
        catalogId,
        status: "unavailable",
        reason: "Catalog exercise not found.",
      };
    }

    const catalog = catalogSnap.data() as ExerciseCatalogDoc;
    if (catalog.catalogId !== catalogId) {
      return {
        catalogId,
        status: "invalid",
        reason: "Catalog document id mismatch.",
      };
    }

    if (!catalog.isActive) {
      return {
        catalogId,
        status: "unavailable",
        reason: "Catalog exercise is inactive.",
      };
    }

    const now = Timestamp.now();
    const timestamps = serverTimestamps(now);
    const exerciseDoc = buildImportedCustomExerciseDoc(gymId, catalog, timestamps);

    tx.set(lockRef, buildImportLockPayload(gymId, catalogId, newExerciseId, now));
    tx.set(exerciseRef, omitUndefined({ ...exerciseDoc, gymId }));

    return {
      catalogId,
      status: "imported",
      exerciseId: newExerciseId,
    };
  });
}

export async function importCatalogExercisesForGym(params: {
  db: Firestore;
  ctx: FirestoreContext;
  gymId: string;
  catalogIds: string[];
  newExerciseId?: () => string;
  writeItem?: (input: CatalogImportWriteParams) => Promise<CatalogImportItemResult>;
}): Promise<CatalogImportResult> {
  assertTenantAccess(params.ctx, params.gymId);

  const uniqueIds = [...new Set(params.catalogIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length > MAX_CATALOG_IMPORT_BATCH) {
    throw new Error(`Import batch exceeds maximum of ${MAX_CATALOG_IMPORT_BATCH} exercises.`);
  }

  const writeItem = params.writeItem ?? importCatalogExerciseInTransaction;
  const createId = params.newExerciseId ?? newImportedExerciseId;

  const items: CatalogImportItemResult[] = [];
  for (const catalogId of uniqueIds) {
    items.push(
      await writeItem({
        db: params.db,
        ctx: params.ctx,
        gymId: params.gymId,
        catalogId,
        newExerciseId: createId(),
      }),
    );
  }

  return {
    items,
    summary: summarizeCatalogImportItems(items),
  };
}
