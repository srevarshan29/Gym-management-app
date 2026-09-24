import {
  type DocumentData,
  type Firestore,
  type Query,
  Timestamp,
  type Transaction,
  type WithFieldValue,
} from "firebase-admin/firestore";

import type { CollectionName } from "@/lib/firestore/collections";
import { DocumentNotFoundError, TenantIsolationError } from "@/lib/firestore/errors";
import { assertTenantAccess, type FirestoreContext } from "@/lib/firestore/context";
import { omitUndefined } from "@/lib/firestore/serialize";
import type { TenantDocument } from "@/lib/firestore/types";

export type DocWithId<T> = T & { id: string };

export type PaginatedResult<T> = {
  items: DocWithId<T>[];
  nextCursor: string | null;
  hasMore: boolean;
};

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 50;

export function clampPageSize(limit?: number): number {
  if (limit === undefined || limit <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(limit, MAX_PAGE_SIZE);
}

/**
 * Base repository for gym-scoped collections.
 * Enforces tenant isolation on every read/write (dev.md rule #1).
 */
export abstract class TenantRepository<T extends TenantDocument> {
  constructor(
    protected readonly db: Firestore,
    protected readonly collectionName: CollectionName,
  ) {}

  protected collection() {
    return this.db.collection(this.collectionName);
  }

  protected docRef(id: string) {
    return this.collection().doc(id);
  }

  protected fromSnapshot(
    id: string,
    data: DocumentData | undefined,
  ): DocWithId<T> | null {
    if (!data) return null;
    return { id, ...(data as T) };
  }

  protected assertDocBelongsToGym(
    ctx: FirestoreContext,
    doc: DocWithId<T> | null,
    gymId: string,
  ): DocWithId<T> {
    if (!doc) {
      throw new DocumentNotFoundError(this.collectionName, gymId);
    }
    assertTenantAccess(ctx, doc.gymId);
    if (doc.gymId !== gymId) {
      throw new TenantIsolationError();
    }
    return doc;
  }

  async getById(
    ctx: FirestoreContext,
    gymId: string,
    id: string,
  ): Promise<DocWithId<T> | null> {
    const snap = await this.docRef(id).get();
    if (!snap.exists) return null;
    const doc = this.fromSnapshot(snap.id, snap.data());
    if (!doc || doc.gymId !== gymId) return null;
    assertTenantAccess(ctx, doc.gymId);
    return doc;
  }

  async create(
    ctx: FirestoreContext,
    gymId: string,
    id: string,
    data: WithFieldValue<T>,
  ): Promise<DocWithId<T>> {
    assertTenantAccess(ctx, gymId);
    const payload = omitUndefined({ ...data, gymId }) as WithFieldValue<T>;
    if ((payload as T).gymId !== gymId) {
      throw new TenantIsolationError("create gymId does not match argument.");
    }
    const now = Timestamp.now();
    const withTimestamps = omitUndefined({
      ...payload,
      createdAt: (payload as { createdAt?: Timestamp }).createdAt ?? now,
      updatedAt: (payload as { updatedAt?: Timestamp }).updatedAt ?? now,
    });
    await this.docRef(id).set(withTimestamps);
    const created = await this.getById(ctx, gymId, id);
    if (!created) throw new DocumentNotFoundError(this.collectionName, id);
    return created;
  }

  async update(
    ctx: FirestoreContext,
    gymId: string,
    id: string,
    data: Partial<WithFieldValue<T>>,
  ): Promise<DocWithId<T>> {
    const existing = await this.getById(ctx, gymId, id);
    if (!existing) throw new DocumentNotFoundError(this.collectionName, id);

    const payload = omitUndefined({
      ...data,
      gymId: existing.gymId,
      updatedAt: Timestamp.now(),
    });
    await this.docRef(id).update(payload);
    const updated = await this.getById(ctx, gymId, id);
    if (!updated) throw new DocumentNotFoundError(this.collectionName, id);
    return updated;
  }

  async delete(ctx: FirestoreContext, gymId: string, id: string): Promise<void> {
    const existing = await this.getById(ctx, gymId, id);
    if (!existing) throw new DocumentNotFoundError(this.collectionName, id);
    await this.docRef(id).delete();
  }

  /**
   * Paginated list — never bulk-loads an entire collection (plan.md rule).
   * Pass `startAfterId` from a previous page's last item id.
   */
  async listByGym(
    ctx: FirestoreContext,
    gymId: string,
    options?: {
      limit?: number;
      startAfterId?: string | null;
      orderBy?: string;
      orderDirection?: "asc" | "desc";
    },
  ): Promise<PaginatedResult<T>> {
    assertTenantAccess(ctx, gymId);
    const limit = clampPageSize(options?.limit);
    const orderBy = options?.orderBy ?? "createdAt";
    const direction = options?.orderDirection ?? "desc";

    let query: Query = this.collection()
      .where("gymId", "==", gymId)
      .orderBy(orderBy, direction)
      .limit(limit + 1);

    if (options?.startAfterId) {
      const cursor = await this.docRef(options.startAfterId).get();
      if (cursor.exists) {
        query = query.startAfter(cursor);
      }
    }

    const snap = await query.get();
    const docs = snap.docs
      .map((d) => this.fromSnapshot(d.id, d.data()))
      .filter((d): d is DocWithId<T> => d !== null);

    const hasMore = docs.length > limit;
    const items = hasMore ? docs.slice(0, limit) : docs;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]!.id : null,
      hasMore,
    };
  }

  protected async runTransaction<R>(
    fn: (tx: Transaction) => Promise<R>,
  ): Promise<R> {
    return this.db.runTransaction(fn);
  }
}
