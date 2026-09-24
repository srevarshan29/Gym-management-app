import {
  type DocumentData,
  type DocumentSnapshot,
  type Firestore,
  FieldPath,
  type Query,
} from "firebase-admin/firestore";

import {
  CATALOG_SEARCH_PREFIX_MIN_LENGTH,
  catalogNamePrefixEnd,
  MAX_CATALOG_SEARCH_RESULTS,
  primaryCatalogSearchToken,
} from "@/lib/exercises/catalog-search";
import {
  decodeCatalogSearchCursor,
  paginateMergedCatalogSearch,
} from "@/lib/catalog/catalog-search-pagination";
import { COLLECTIONS } from "@/lib/firestore/collections";
import type { FirestoreContext } from "@/lib/firestore/context";
import { InvalidPaginationCursorError } from "@/lib/firestore/errors";
import {
  clampPageSize,
  type DocWithId,
  type PaginatedResult,
} from "@/lib/firestore/repositories/base";
import type { ExerciseCatalogDoc, MuscleGroup } from "@/lib/firestore/types";

const DEFAULT_CATALOG_PAGE_SIZE = 25;
const MAX_CATALOG_PAGE_SIZE = 50;
const CATALOG_CURSOR_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

function clampCatalogPageSize(limit?: number): number {
  if (limit === undefined || limit <= 0) return DEFAULT_CATALOG_PAGE_SIZE;
  return Math.min(limit, MAX_CATALOG_PAGE_SIZE);
}

function clampCatalogSearchLimit(limit?: number): number {
  if (limit === undefined || limit <= 0) return MAX_CATALOG_SEARCH_RESULTS;
  return Math.min(limit, MAX_CATALOG_SEARCH_RESULTS);
}

/**
 * Platform-scoped master exercise catalog — Admin SDK only (rules deny client access).
 * Read methods require staff, super-admin, or platform context.
 */
export class ExerciseCatalogRepository {
  constructor(private readonly db: Firestore) {}

  private collection() {
    return this.db.collection(COLLECTIONS.exerciseCatalog);
  }

  private docRef(catalogId: string) {
    return this.collection().doc(catalogId);
  }

  private fromSnapshot(
    id: string,
    data: DocumentData | undefined,
  ): DocWithId<ExerciseCatalogDoc> | null {
    if (!data) return null;
    return { id, ...(data as ExerciseCatalogDoc) };
  }

  private assertCatalogReadAccess(ctx: FirestoreContext): void {
    if (
      ctx.kind === "platform" ||
      ctx.kind === "super_admin" ||
      ctx.kind === "staff"
    ) {
      return;
    }
    throw new Error("Unauthorized catalog read.");
  }

  private async resolveCatalogCursorSnapshot(
    startAfterId?: string | null,
  ): Promise<DocumentSnapshot | null> {
    const trimmed = startAfterId?.trim();
    if (!trimmed) return null;

    if (!CATALOG_CURSOR_ID_PATTERN.test(trimmed)) {
      throw new InvalidPaginationCursorError();
    }

    const snap = await this.docRef(trimmed).get();
    if (!snap.exists) {
      throw new InvalidPaginationCursorError();
    }

    const doc = this.fromSnapshot(snap.id, snap.data());
    if (!doc || doc.catalogId !== snap.id) {
      throw new InvalidPaginationCursorError();
    }

    return snap;
  }

  async getByCatalogId(
    ctx: FirestoreContext,
    catalogId: string,
  ): Promise<DocWithId<ExerciseCatalogDoc> | null> {
    this.assertCatalogReadAccess(ctx);
    const snap = await this.docRef(catalogId).get();
    if (!snap.exists) return null;
    return this.fromSnapshot(snap.id, snap.data());
  }

  /**
   * Cursor-paginated catalog browse. Ordered by nameLower ascending with document id tie-breaker.
   * Pass `startAfterId` from a previous page's last item id.
   */
  async listPage(
    ctx: FirestoreContext,
    options?: {
      limit?: number;
      startAfterId?: string | null;
      muscleGroup?: MuscleGroup | null;
      activeOnly?: boolean;
    },
  ): Promise<PaginatedResult<ExerciseCatalogDoc>> {
    this.assertCatalogReadAccess(ctx);

    const limit = clampCatalogPageSize(options?.limit);
    const activeOnly = options?.activeOnly ?? true;
    const cursor = await this.resolveCatalogCursorSnapshot(options?.startAfterId);

    let query: Query = this.collection();

    if (activeOnly) {
      query = query.where("isActive", "==", true);
    }

    if (options?.muscleGroup) {
      query = query.where("muscleGroup", "==", options.muscleGroup);
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
      .filter((d): d is DocWithId<ExerciseCatalogDoc> => d !== null);

    const hasMore = docs.length > limit;
    const items = hasMore ? docs.slice(0, limit) : docs;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]!.id : null,
      hasMore,
    };
  }

  private async fetchNamePrefixSearchRows(
    ctx: FirestoreContext,
    options: {
      token: string;
      prefixEnd: string;
      muscleGroup?: MuscleGroup | null;
      cursor: DocumentSnapshot | null;
      limit: number;
    },
  ): Promise<DocWithId<ExerciseCatalogDoc>[]> {
    this.assertCatalogReadAccess(ctx);

    let query: Query = this.collection().where("isActive", "==", true);

    if (options.muscleGroup) {
      query = query.where("muscleGroup", "==", options.muscleGroup);
    }

    query = query
      .where("nameLower", ">=", options.token)
      .where("nameLower", "<", options.prefixEnd)
      .orderBy("nameLower", "asc")
      .orderBy(FieldPath.documentId(), "asc")
      .limit(options.limit);

    if (options.cursor) {
      query = query.startAfter(options.cursor);
    }

    const snap = await query.get();
    return snap.docs
      .map((d) => this.fromSnapshot(d.id, d.data()))
      .filter((d): d is DocWithId<ExerciseCatalogDoc> => d !== null);
  }

  private async fetchSearchPrefixRows(
    ctx: FirestoreContext,
    options: {
      token: string;
      muscleGroup?: MuscleGroup | null;
      cursor: DocumentSnapshot | null;
      limit: number;
    },
  ): Promise<DocWithId<ExerciseCatalogDoc>[]> {
    this.assertCatalogReadAccess(ctx);

    let query: Query = this.collection().where("isActive", "==", true);

    if (options.muscleGroup) {
      query = query.where("muscleGroup", "==", options.muscleGroup);
    }

    query = query
      .where("searchPrefixes", "array-contains", options.token)
      .orderBy("nameLower", "asc")
      .orderBy(FieldPath.documentId(), "asc")
      .limit(options.limit);

    if (options.cursor) {
      query = query.startAfter(options.cursor);
    }

    const snap = await query.get();
    return snap.docs
      .map((d) => this.fromSnapshot(d.id, d.data()))
      .filter((d): d is DocWithId<ExerciseCatalogDoc> => d !== null);
  }

  /**
   * Cursor-paginated prefix search over active catalog entries.
   * Merges `nameLower` prefix matches with optional `searchPrefixes` matches.
   */
  async searchByPrefix(
    ctx: FirestoreContext,
    options: {
      query: string;
      muscleGroup?: MuscleGroup | null;
      limit?: number;
      startAfterId?: string | null;
    },
  ): Promise<PaginatedResult<ExerciseCatalogDoc>> {
    this.assertCatalogReadAccess(ctx);

    const token = primaryCatalogSearchToken(options.query);
    if (!token) {
      return { items: [], nextCursor: null, hasMore: false };
    }

    const limit = clampCatalogSearchLimit(options.limit);
    const muscleGroup = options.muscleGroup ?? null;
    const decodedCursor = options.startAfterId?.trim()
      ? decodeCatalogSearchCursor(options.startAfterId, {
          query: options.query,
          muscleGroup,
        })
      : null;

    if (decodedCursor) {
      const boundarySnap = await this.resolveCatalogCursorSnapshot(
        decodedCursor.boundaryId,
      );
      if (!boundarySnap) {
        throw new InvalidPaginationCursorError();
      }
    }

    return paginateMergedCatalogSearch({
      limit,
      token,
      muscleGroup,
      usePrefixQuery: token.length >= CATALOG_SEARCH_PREFIX_MIN_LENGTH,
      decodedCursor,
      fetchNameRows: (cursor, batchLimit) =>
        this.fetchNamePrefixSearchRows(ctx, {
          token,
          prefixEnd: catalogNamePrefixEnd(token),
          muscleGroup,
          cursor,
          limit: batchLimit,
        }),
      fetchPrefixRows: (cursor, batchLimit) =>
        this.fetchSearchPrefixRows(ctx, {
          token,
          muscleGroup,
          cursor,
          limit: batchLimit,
        }),
      resolveCursorSnapshot: (catalogId) =>
        this.resolveCatalogCursorSnapshot(catalogId),
    });
  }
}

export { clampPageSize, MAX_CATALOG_SEARCH_RESULTS };
