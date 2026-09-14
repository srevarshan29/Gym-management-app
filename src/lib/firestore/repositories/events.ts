import { Timestamp, type Firestore, type WithFieldValue } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import type { FirestoreContext } from "@/lib/firestore/context";
import { assertTenantAccess } from "@/lib/firestore/context";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import {
  TenantRepository,
  clampPageSize,
} from "@/lib/firestore/repositories/base";
import type { EventDoc } from "@/lib/firestore/types";

export const EVENTS_PORTAL_LIMIT = 50;

export type CreateEventInput = {
  title: string;
  eventDate: Date;
  location: string;
  description?: string | null;
};

export type UpdateEventInput = Partial<CreateEventInput>;

export class EventsRepository extends TenantRepository<EventDoc> {
  constructor(db: Firestore) {
    super(db, COLLECTIONS.events);
  }

  async countByGym(ctx: FirestoreContext, gymId: string): Promise<number> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .count()
      .get();
    return snap.data().count;
  }

  /** Upcoming first, then past — matches legacy Prisma sort for portal. */
  async listForPortal(
    ctx: FirestoreContext,
    gymId: string,
    limit = EVENTS_PORTAL_LIMIT,
  ): Promise<DocWithId<EventDoc>[]> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .orderBy("eventDate", "asc")
      .limit(clampPageSize(limit))
      .get();
    return this.sortUpcomingThenPast(
      snap.docs
        .map((d) => this.fromSnapshot(d.id, d.data()))
        .filter((d): d is DocWithId<EventDoc> => d !== null),
    );
  }

  /** Cursor-paged export — never loads unbounded in one query. */
  async listAllForExport(
    ctx: FirestoreContext,
    gymId: string,
    maxRows = 1000,
  ): Promise<DocWithId<EventDoc>[]> {
    const all: DocWithId<EventDoc>[] = [];
    let startAfterId: string | null = null;

    while (all.length < maxRows) {
      const batch = await this.listByGym(ctx, gymId, {
        orderBy: "eventDate",
        orderDirection: "asc",
        limit: clampPageSize(EVENTS_PORTAL_LIMIT),
        startAfterId,
      });
      all.push(...batch.items);
      if (!batch.nextCursor) break;
      startAfterId = batch.nextCursor;
    }

    return this.sortUpcomingThenPast(all);
  }

  private sortUpcomingThenPast(
    rows: DocWithId<EventDoc>[],
  ): DocWithId<EventDoc>[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = rows.filter(
      (r) => r.eventDate.toDate().getTime() >= today.getTime(),
    );
    const past = rows
      .filter((r) => r.eventDate.toDate().getTime() < today.getTime())
      .reverse();
    return [...upcoming, ...past];
  }

  async listByEventDate(
    ctx: FirestoreContext,
    gymId: string,
    options?: { limit?: number; startAfterId?: string | null },
  ) {
    return this.listByGym(ctx, gymId, {
      orderBy: "eventDate",
      orderDirection: "asc",
      limit: options?.limit,
      startAfterId: options?.startAfterId,
    });
  }

  async createEvent(
    ctx: FirestoreContext,
    gymId: string,
    id: string,
    input: CreateEventInput,
  ): Promise<DocWithId<EventDoc>> {
    return this.create(ctx, gymId, id, {
      gymId,
      title: input.title,
      eventDate: Timestamp.fromDate(input.eventDate),
      location: input.location,
      description: input.description ?? null,
    } as WithFieldValue<EventDoc>);
  }

  async updateEvent(
    ctx: FirestoreContext,
    gymId: string,
    id: string,
    input: UpdateEventInput,
  ): Promise<DocWithId<EventDoc>> {
    const patch: Partial<EventDoc> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.location !== undefined) patch.location = input.location;
    if (input.description !== undefined) patch.description = input.description;
    if (input.eventDate !== undefined) {
      patch.eventDate = Timestamp.fromDate(input.eventDate);
    }
    return this.update(ctx, gymId, id, patch);
  }
}
