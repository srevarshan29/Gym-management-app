import { Timestamp, type Firestore, type WithFieldValue } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import type { FirestoreContext } from "@/lib/firestore/context";
import { assertTenantAccess } from "@/lib/firestore/context";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import {
  TenantRepository,
  clampPageSize,
} from "@/lib/firestore/repositories/base";
import type { EmployeeDoc } from "@/lib/firestore/types";

export const EMPLOYEES_PAGE_SIZE = 50;

export type EmployeesPageResult = {
  items: DocWithId<EmployeeDoc>[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateEmployeeInput = {
  name: string;
  phone: string;
  position: string;
  joiningDate: Date;
  salary?: number | null;
  notes?: string | null;
};

export type UpdateEmployeeInput = Partial<CreateEmployeeInput>;

export class EmployeesRepository extends TenantRepository<EmployeeDoc> {
  constructor(db: Firestore) {
    super(db, COLLECTIONS.employees);
  }

  async countByGym(ctx: FirestoreContext, gymId: string): Promise<number> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .count()
      .get();
    return snap.data().count;
  }

  async listByName(
    ctx: FirestoreContext,
    gymId: string,
    options?: { limit?: number; startAfterId?: string | null },
  ) {
    assertTenantAccess(ctx, gymId);
    const limit = clampPageSize(options?.limit);
    let query = this.collection()
      .where("gymId", "==", gymId)
      .orderBy("name", "asc")
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
      .filter((d): d is DocWithId<EmployeeDoc> => d !== null);

    const hasMore = docs.length > limit;
    const items = hasMore ? docs.slice(0, limit) : docs;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]!.id : null,
    };
  }

  async listEmployeePage(
    ctx: FirestoreContext,
    gymId: string,
    options: { page?: number; pageSize?: number } = {},
  ): Promise<EmployeesPageResult> {
    assertTenantAccess(ctx, gymId);
    const pageSize = clampPageSize(options.pageSize ?? EMPLOYEES_PAGE_SIZE);
    const page = Math.max(1, Math.floor(options.page ?? 1));
    const total = await this.countByGym(ctx, gymId);

    const fetchLimit = page * pageSize;
    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .orderBy("name", "asc")
      .limit(fetchLimit)
      .get();
    const docs = snap.docs
      .map((d) => this.fromSnapshot(d.id, d.data()))
      .filter((d): d is DocWithId<EmployeeDoc> => d !== null);

    const offset = (page - 1) * pageSize;
    const items = docs.slice(offset, offset + pageSize);

    return { items, total, page, pageSize };
  }

  /** Cursor-paged export — never loads unbounded in one query. */
  async listAllByName(
    ctx: FirestoreContext,
    gymId: string,
    maxRows = 1000,
  ): Promise<DocWithId<EmployeeDoc>[]> {
    const all: DocWithId<EmployeeDoc>[] = [];
    let startAfterId: string | null = null;

    while (all.length < maxRows) {
      const batch = await this.listByName(ctx, gymId, {
        limit: clampPageSize(EMPLOYEES_PAGE_SIZE),
        startAfterId,
      });
      all.push(...batch.items);
      if (!batch.nextCursor) break;
      startAfterId = batch.nextCursor;
    }

    return all;
  }

  async createEmployee(
    ctx: FirestoreContext,
    gymId: string,
    id: string,
    input: CreateEmployeeInput,
  ): Promise<DocWithId<EmployeeDoc>> {
    return this.create(ctx, gymId, id, {
      gymId,
      name: input.name,
      phone: input.phone,
      position: input.position,
      joiningDate: Timestamp.fromDate(input.joiningDate),
      salary: input.salary ?? null,
      notes: input.notes ?? null,
    } as WithFieldValue<EmployeeDoc>);
  }

  async updateEmployee(
    ctx: FirestoreContext,
    gymId: string,
    id: string,
    input: UpdateEmployeeInput,
  ): Promise<DocWithId<EmployeeDoc>> {
    const patch: Partial<EmployeeDoc> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.position !== undefined) patch.position = input.position;
    if (input.joiningDate !== undefined) {
      patch.joiningDate = Timestamp.fromDate(input.joiningDate);
    }
    if (input.salary !== undefined) patch.salary = input.salary;
    if (input.notes !== undefined) patch.notes = input.notes;
    return this.update(ctx, gymId, id, patch);
  }
}
