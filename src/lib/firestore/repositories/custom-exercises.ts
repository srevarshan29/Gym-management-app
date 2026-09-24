import type {
  DocumentSnapshot,
  Firestore,
  Query,
  WithFieldValue,
} from "firebase-admin/firestore";
import { FieldPath } from "firebase-admin/firestore";

import {
  catalogNamePrefixEnd,
  primaryCatalogSearchToken,
} from "@/lib/exercises/catalog-search";
import { COLLECTIONS } from "@/lib/firestore/collections";
import type { FirestoreContext } from "@/lib/firestore/context";
import { assertTenantAccess } from "@/lib/firestore/context";
import {
  InvalidPaginationCursorError,
  TenantIsolationError,
} from "@/lib/firestore/errors";
import { omitUndefined } from "@/lib/firestore/serialize";
import type { DocWithId, PaginatedResult } from "@/lib/firestore/repositories/base";
import { TenantRepository, clampPageSize } from "@/lib/firestore/repositories/base";
import type {
  CustomExerciseDoc,
  ExerciseTrackingType,
  MuscleGroup,
} from "@/lib/firestore/types";
import { catalogImportLockDocId } from "@/lib/catalog/catalog-import";
import { resolveExerciseSource } from "@/lib/exercises/source";

export type CreateCustomExerciseInput = {
  name: string;
  muscleGroup: MuscleGroup;
  defaultSets?: number | null;
  defaultReps?: string | null;
  defaultTempo?: string | null;
  defaultRestSeconds?: number | null;
  trackingType?: ExerciseTrackingType;
  isSeeded?: boolean;
};

export type UpdateExerciseDefaultsInput = {
  defaultSets?: number | null;
  defaultReps?: string | null;
  defaultTempo?: string | null;
  defaultRestSeconds?: number | null;
  trackingType?: ExerciseTrackingType;
};

export const BUILDER_LIBRARY_SEARCH_LIMIT = 30;
/** Firestore `in` query limit for catalogId / documentId batches. */
const FIRESTORE_IN_QUERY_LIMIT = 30;
const LIBRARY_CURSOR_ID_PATTERN = /^[a-zA-Z0-9]{1,128}$/;

export class CustomExercisesRepository extends TenantRepository<CustomExerciseDoc> {
  constructor(db: Firestore) {
    super(db, COLLECTIONS.customExercises);
  }

  async countByGym(ctx: FirestoreContext, gymId: string): Promise<number> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .count()
      .get();
    return snap.data().count;
  }

  async findByNameLower(
    ctx: FirestoreContext,
    gymId: string,
    nameLower: string,
  ): Promise<DocWithId<CustomExerciseDoc> | null> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .where("nameLower", "==", nameLower)
      .limit(1)
      .get();
    const doc = snap.docs[0];
    if (!doc) return null;
    return this.fromSnapshot(doc.id, doc.data());
  }

  async findByCatalogId(
    ctx: FirestoreContext,
    gymId: string,
    catalogId: string,
  ): Promise<DocWithId<CustomExerciseDoc> | null> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .where("catalogId", "==", catalogId)
      .limit(1)
      .get();
    const doc = snap.docs[0];
    if (!doc) return null;
    return this.fromSnapshot(doc.id, doc.data());
  }

  /** Returns catalog IDs already imported by this gym from a candidate list. */
  async findImportedCatalogIds(
    ctx: FirestoreContext,
    gymId: string,
    catalogIds: string[],
  ): Promise<Set<string>> {
    assertTenantAccess(ctx, gymId);
    const unique = [...new Set(catalogIds.filter(Boolean))];
    if (unique.length === 0) return new Set();

    const imported = new Set<string>();
    for (let index = 0; index < unique.length; index += FIRESTORE_IN_QUERY_LIMIT) {
      const batch = unique.slice(index, index + FIRESTORE_IN_QUERY_LIMIT);
      const snap = await this.collection()
        .where("gymId", "==", gymId)
        .where("catalogId", "in", batch)
        .get();

      for (const doc of snap.docs) {
        const data = doc.data();
        if (typeof data.catalogId === "string" && data.catalogId) {
          imported.add(data.catalogId);
        }
      }
    }
    return imported;
  }

  /** @deprecated Prefer findByNameLower for duplicate checks. */
  async findByName(
    ctx: FirestoreContext,
    gymId: string,
    name: string,
  ): Promise<DocWithId<CustomExerciseDoc> | null> {
    return this.findByNameLower(ctx, gymId, name.trim().toLowerCase());
  }

  async listLibrary(
    ctx: FirestoreContext,
    gymId: string,
    muscleGroup?: MuscleGroup | null,
  ): Promise<DocWithId<CustomExerciseDoc>[]> {
    if (muscleGroup) {
      return this.listByMuscleGroup(ctx, gymId, muscleGroup);
    }

    assertTenantAccess(ctx, gymId);
    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .orderBy("name", "asc")
      .get();
    const rows = snap.docs
      .map((d) => this.fromSnapshot(d.id, d.data()))
      .filter((d): d is DocWithId<CustomExerciseDoc> => d !== null);

    return rows.sort((a, b) => {
      const byGroup = a.muscleGroup.localeCompare(b.muscleGroup);
      return byGroup !== 0 ? byGroup : a.name.localeCompare(b.name);
    });
  }

  async listByMuscleGroup(
    ctx: FirestoreContext,
    gymId: string,
    muscleGroup: MuscleGroup,
  ): Promise<DocWithId<CustomExerciseDoc>[]> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .where("muscleGroup", "==", muscleGroup)
      .orderBy("name", "asc")
      .get();
    return snap.docs
      .map((d) => this.fromSnapshot(d.id, d.data()))
      .filter((d): d is DocWithId<CustomExerciseDoc> => d !== null);
  }

  private async resolveLibraryCursorSnapshot(
    ctx: FirestoreContext,
    gymId: string,
    startAfterId?: string | null,
  ): Promise<DocumentSnapshot | null> {
    const trimmed = startAfterId?.trim();
    if (!trimmed) return null;

    if (!LIBRARY_CURSOR_ID_PATTERN.test(trimmed)) {
      throw new InvalidPaginationCursorError();
    }

    const snap = await this.docRef(trimmed).get();
    if (!snap.exists) {
      throw new InvalidPaginationCursorError();
    }

    const doc = this.fromSnapshot(snap.id, snap.data());
    if (!doc) {
      throw new InvalidPaginationCursorError();
    }

    assertTenantAccess(ctx, doc.gymId);
    if (doc.gymId !== gymId) {
      throw new TenantIsolationError();
    }

    return snap;
  }

  /**
   * Cursor-paginated gym library browse/search.
   * Sorted by `nameLower` ascending with document id as a deterministic tie-breaker.
   * Uses `nameLower` prefix range when a query is provided.
   */
  async searchLibrary(
    ctx: FirestoreContext,
    gymId: string,
    options?: {
      query?: string;
      muscleGroup?: MuscleGroup | null;
      startAfterId?: string | null;
      limit?: number;
    },
  ): Promise<PaginatedResult<CustomExerciseDoc>> {
    assertTenantAccess(ctx, gymId);
    const limit = clampPageSize(options?.limit ?? BUILDER_LIBRARY_SEARCH_LIMIT);
    const token = options?.query ? primaryCatalogSearchToken(options.query) : null;
    const cursor = await this.resolveLibraryCursorSnapshot(
      ctx,
      gymId,
      options?.startAfterId,
    );

    let query: Query = this.collection().where("gymId", "==", gymId);

    if (options?.muscleGroup) {
      query = query.where("muscleGroup", "==", options.muscleGroup);
    }

    if (token) {
      query = query
        .where("nameLower", ">=", token)
        .where("nameLower", "<", catalogNamePrefixEnd(token));
    }

    query = query
      .orderBy("nameLower", "asc")
      .orderBy(FieldPath.documentId(), "asc")
      .limit(limit + 1);

    if (cursor) {
      query = query.startAfter(cursor);
    }

    const snap = await query.get();
    const docs = snap.docs
      .map((d) => this.fromSnapshot(d.id, d.data()))
      .filter((d): d is DocWithId<CustomExerciseDoc> => d !== null);

    const hasMore = docs.length > limit;
    const items = hasMore ? docs.slice(0, limit) : docs;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]!.id : null,
      hasMore,
    };
  }
  async getByIds(
    ctx: FirestoreContext,
    gymId: string,
    ids: string[],
  ): Promise<DocWithId<CustomExerciseDoc>[]> {
    assertTenantAccess(ctx, gymId);
    const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    if (unique.length === 0) return [];

    const rows: DocWithId<CustomExerciseDoc>[] = [];
    for (let index = 0; index < unique.length; index += FIRESTORE_IN_QUERY_LIMIT) {
      const batch = unique.slice(index, index + FIRESTORE_IN_QUERY_LIMIT);
      const snap = await this.collection()
        .where("gymId", "==", gymId)
        .where(FieldPath.documentId(), "in", batch)
        .get();

      for (const doc of snap.docs) {
        const row = this.fromSnapshot(doc.id, doc.data());
        if (row) rows.push(row);
      }
    }

    return rows.sort((a, b) => a.nameLower.localeCompare(b.nameLower));
  }

  async updateExerciseDefaults(
    ctx: FirestoreContext,
    gymId: string,
    id: string,
    input: UpdateExerciseDefaultsInput,
  ): Promise<DocWithId<CustomExerciseDoc>> {
    return this.update(ctx, gymId, id, omitUndefined({
      defaultSets: input.defaultSets,
      defaultReps: input.defaultReps,
      defaultTempo: input.defaultTempo,
      defaultRestSeconds: input.defaultRestSeconds,
      trackingType: input.trackingType,
    }) as Partial<WithFieldValue<CustomExerciseDoc>>);
  }

  async createExercise(
    ctx: FirestoreContext,
    gymId: string,
    id: string,
    input: CreateCustomExerciseInput,
  ): Promise<DocWithId<CustomExerciseDoc>> {
    const name = input.name.trim();
    return this.create(ctx, gymId, id, {
      gymId,
      name,
      nameLower: name.toLowerCase(),
      muscleGroup: input.muscleGroup,
      defaultSets: input.defaultSets ?? null,
      defaultReps: input.defaultReps ?? null,
      defaultTempo: input.defaultTempo ?? null,
      defaultRestSeconds: input.defaultRestSeconds ?? null,
      trackingType: input.trackingType ?? "WEIGHTED",
      isSeeded: input.isSeeded ?? false,
    } as WithFieldValue<CustomExerciseDoc>);
  }

  async deleteCustomExercise(
    ctx: FirestoreContext,
    gymId: string,
    id: string,
  ): Promise<boolean> {
    const doc = await this.getById(ctx, gymId, id);
    if (!doc || doc.isSeeded) return false;

    const catalogId = doc.catalogId?.trim();
    const isCatalogLinked =
      Boolean(catalogId) || resolveExerciseSource(doc) === "CATALOG";
    if (isCatalogLinked && catalogId) {
      await this.db
        .collection(COLLECTIONS.catalogImportLocks)
        .doc(catalogImportLockDocId(gymId, catalogId))
        .delete();
    }

    await this.delete(ctx, gymId, id);
    return true;
  }
}
