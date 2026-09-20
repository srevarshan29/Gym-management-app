import { Timestamp, type Firestore } from "firebase-admin/firestore";

import {
  resetGymSequences,
  runBillingTransaction,
} from "@/lib/firestore/billing-transaction";
import { COLLECTIONS } from "@/lib/firestore/collections";
import type { FirestoreContext } from "@/lib/firestore/context";
import { assertMemberSelfAccess, assertTenantAccess } from "@/lib/firestore/context";
import { DocumentNotFoundError } from "@/lib/firestore/errors";
import {
  buildMemberSearchTokens,
  tokenizeSearchQuery,
} from "@/lib/firestore/member-search";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import { omitUndefined, touchUpdatedAt } from "@/lib/firestore/serialize";
import { queryPageByNumber } from "@/lib/firestore/pagination";
import type { FitnessGoal, MemberDoc, MemberGender } from "@/lib/firestore/types";
import { normalizeMemberEmail } from "@/lib/member-portal/constants";
import { statusFromEndDate } from "@/lib/subscription";
import type { MemberListItem } from "@/lib/queries";
import type { MemberGender as PrismaMemberGender } from "@prisma/client";

export type MemberAuthMatch = {
  id: string;
  gymId: string;
  name: string;
  memberNumber: number;
};

export type UpdateMemberInput = {
  name: string;
  phone: string;
  email: string | null;
  gender: MemberGender;
  notes: string | null;
  isPt: boolean;
  trainerId: string | null;
  fitnessGoal: FitnessGoal | null;
  ageYears: number | null;
  heightCm: number | null;
  weightKg: number | null;
};

export const MEMBERS_DIRECTORY_PAGE_SIZE = 50;

export class MembersRepository {
  constructor(private readonly db: Firestore) {}

  private col() {
    return this.db.collection(COLLECTIONS.members);
  }

  async findByIdAndGym(
    ctx: FirestoreContext,
    memberId: string,
    gymId: string,
  ): Promise<DocWithId<MemberDoc> | null> {
    assertTenantAccess(ctx, gymId);
    assertMemberSelfAccess(ctx, memberId);
    const snap = await this.col().doc(memberId).get();
    if (!snap.exists) return null;
    const data = snap.data() as MemberDoc;
    if (data.gymId !== gymId) return null;
    return { id: snap.id, ...data };
  }

  async findPortalMember(
    ctx: FirestoreContext,
    memberId: string,
    gymId: string,
  ): Promise<MemberAuthMatch | null> {
    const member = await this.findByIdAndGym(ctx, memberId, gymId);
    if (!member?.portalEnabledAt) return null;
    return {
      id: member.id,
      gymId: member.gymId,
      name: member.name,
      memberNumber: member.memberNumber,
    };
  }

  async findByEmail(
    _ctx: FirestoreContext,
    gymId: string,
    email: string,
    options?: {
      excludeMemberId?: string;
      portalEnabledOnly?: boolean;
    },
  ): Promise<MemberAuthMatch[]> {
    const normalizedEmail = normalizeMemberEmail(email);
    if (!normalizedEmail) return [];

    const snap = await this.col()
      .where("gymId", "==", gymId)
      .where("email", "==", normalizedEmail)
      .get();

    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as MemberDoc) }))
      .filter((m) => {
        if (options?.excludeMemberId && m.id === options.excludeMemberId) {
          return false;
        }
        if (options?.portalEnabledOnly && !m.portalEnabledAt) {
          return false;
        }
        return true;
      })
      .map((m) => ({
        id: m.id,
        gymId: m.gymId,
        name: m.name,
        memberNumber: m.memberNumber,
      }));
  }

  async findByPhone(
    ctx: FirestoreContext,
    gymId: string,
    phone: string,
    excludeMemberId?: string,
  ): Promise<DocWithId<MemberDoc> | null> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.col()
      .where("gymId", "==", gymId)
      .where("phone", "==", phone)
      .limit(1)
      .get();
    const doc = snap.docs[0];
    if (!doc) return null;
    if (excludeMemberId && doc.id === excludeMemberId) return null;
    return { id: doc.id, ...(doc.data() as MemberDoc) };
  }

  async countByGym(_ctx: FirestoreContext, gymId: string): Promise<number> {
    const snap = await this.col().where("gymId", "==", gymId).count().get();
    return snap.data().count;
  }

  async countPtMembers(_ctx: FirestoreContext, gymId: string): Promise<number> {
    const snap = await this.col()
      .where("gymId", "==", gymId)
      .where("isPt", "==", true)
      .count()
      .get();
    return snap.data().count;
  }

  async listExportBatch(
    ctx: FirestoreContext,
    gymId: string,
    options: {
      limit: number;
      startAfterId?: string | null;
    },
  ): Promise<{ rows: DocWithId<MemberDoc>[]; nextCursor: string | null }> {
    assertTenantAccess(ctx, gymId);
    let query = this.col()
      .where("gymId", "==", gymId)
      .orderBy("createdAt", "desc");

    if (options.startAfterId) {
      const cursor = await this.col().doc(options.startAfterId).get();
      if (cursor.exists) {
        query = query.startAfter(cursor);
      }
    }

    const snap = await query.limit(options.limit + 1).get();
    const docs = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as MemberDoc),
    }));
    const hasMore = docs.length > options.limit;
    const rows = hasMore ? docs.slice(0, options.limit) : docs;
    return {
      rows,
      nextCursor: hasMore ? rows[rows.length - 1]!.id : null,
    };
  }

  async updatePortalProfile(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    input: {
      fitnessGoal: FitnessGoal | null;
      ageYears: number | null;
      heightCm: number | null;
      weightKg: number | null;
    },
  ): Promise<boolean> {
    const existing = await this.findByIdAndGym(ctx, memberId, gymId);
    if (!existing) return false;

    await this.col()
      .doc(memberId)
      .update(
        omitUndefined({
          fitnessGoal: input.fitnessGoal,
          ageYears: input.ageYears,
          heightCm: input.heightCm,
          weightKg: input.weightKg,
          ...touchUpdatedAt(),
        }),
      );
    return true;
  }

  async countWithEmailByGym(
    _ctx: FirestoreContext,
    gymId: string,
  ): Promise<number> {
    const snap = await this.col()
      .where("gymId", "==", gymId)
      .where("email", ">", "")
      .count()
      .get();
    return snap.data().count;
  }

  async update(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    input: UpdateMemberInput,
  ): Promise<boolean> {
    const existing = await this.findByIdAndGym(ctx, memberId, gymId);
    if (!existing) return false;

    const searchTokens = buildMemberSearchTokens(
      input.name,
      input.phone,
      existing.memberNumber,
    );

    await this.col()
      .doc(memberId)
      .update(
        omitUndefined({
          name: input.name,
          nameLower: input.name.trim().toLowerCase(),
          phone: input.phone,
          phoneDigits: input.phone.replace(/\D/g, ""),
          searchTokens,
          email: input.email,
          gender: input.gender,
          notes: input.notes,
          isPt: input.isPt,
          trainerId: input.trainerId,
          fitnessGoal: input.fitnessGoal,
          ageYears: input.ageYears,
          heightCm: input.heightCm,
          weightKg: input.weightKg,
          ...touchUpdatedAt(),
        }),
      );
    return true;
  }

  async updatePhotoUrl(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    photoUrl: string,
  ): Promise<void> {
    const existing = await this.findByIdAndGym(ctx, memberId, gymId);
    if (!existing) return;
    await this.col().doc(memberId).update({
      photoUrl,
      ...touchUpdatedAt(),
    });
  }

  async enablePortal(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
  ): Promise<boolean> {
    const existing = await this.findByIdAndGym(ctx, memberId, gymId);
    if (!existing) return false;
    if (existing.portalEnabledAt) return true;
    await this.col().doc(memberId).update({
      portalEnabledAt: Timestamp.now(),
      ...touchUpdatedAt(),
    });
    return true;
  }

  async delete(ctx: FirestoreContext, gymId: string, memberId: string): Promise<boolean> {
    const existing = await this.findByIdAndGym(ctx, memberId, gymId);
    if (!existing) return false;
    await this.deleteMemberGraph(gymId, memberId);
    return true;
  }

  async deleteAllByGym(ctx: FirestoreContext, gymId: string): Promise<number> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.col().where("gymId", "==", gymId).get();
    for (const doc of snap.docs) {
      await this.deleteMemberGraph(gymId, doc.id);
    }
    await runBillingTransaction(gymId, async (btx) => {
      resetGymSequences(btx);
    });
    return snap.size;
  }

  private async deleteMemberGraph(gymId: string, memberId: string): Promise<void> {
    const batchDelete = async (collection: string, field: string, value: string) => {
      const snap = await this.db
        .collection(collection)
        .where("gymId", "==", gymId)
        .where(field, "==", value)
        .get();
      const batch = this.db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      if (!snap.empty) await batch.commit();
    };

    const payments = await this.db
      .collection(COLLECTIONS.payments)
      .where("gymId", "==", gymId)
      .where("memberId", "==", memberId)
      .get();
    for (const pay of payments.docs) {
      const receipts = await this.db
        .collection(COLLECTIONS.receipts)
        .where("gymId", "==", gymId)
        .where("paymentId", "==", pay.id)
        .get();
      const batch = this.db.batch();
      receipts.docs.forEach((r) => batch.delete(r.ref));
      batch.delete(pay.ref);
      await batch.commit();
    }

    await batchDelete(COLLECTIONS.subscriptions, "memberId", memberId);
    await this.col().doc(memberId).delete();
  }

  private toListItem(
    m: DocWithId<MemberDoc>,
    trainerName: string | null,
  ): MemberListItem {
    const endDate = m.currentEndDate?.toDate() ?? null;
    const status = statusFromEndDate(endDate);
    return {
      id: m.id,
      memberNumber: m.memberNumber,
      name: m.name,
      phone: m.phone,
      photoUrl: m.photoUrl,
      gender: m.gender as PrismaMemberGender,
      createdAt: m.createdAt.toDate(),
      packageName: m.currentPackageName,
      currentSubscriptionId: m.currentSubscriptionId,
      startDate: m.currentStartDate?.toDate() ?? null,
      endDate,
      status,
      subsAmount: null,
      paidAmount: null,
      pendingAmount: m.pendingAmountTotal,
      addedByName: m.addedByName,
      isPt: m.isPt,
      trainerId: m.trainerId,
      trainerName,
    };
  }

  async listDirectoryPage(
    ctx: FirestoreContext,
    gymId: string,
    options: { page?: number; pageSize?: number; q?: string } = {},
  ): Promise<{
    rows: MemberListItem[];
    totalMembers: number;
    matchingCount: number;
    page: number;
    pageSize: number;
  }> {
    assertTenantAccess(ctx, gymId);
    const pageSize = options.pageSize ?? MEMBERS_DIRECTORY_PAGE_SIZE;
    const page = Math.max(1, Math.floor(options.page ?? 1));
    const tokens = tokenizeSearchQuery(options.q ?? "");

    const totalMembers = await this.countByGym(ctx, gymId);

    let candidates: DocWithId<MemberDoc>[];

    if (tokens.length === 0) {
      const pageSnaps = await queryPageByNumber(
        this.col().where("gymId", "==", gymId).orderBy("createdAt", "desc"),
        page,
        pageSize,
      );
      candidates = pageSnaps.map((d) => ({
        id: d.id,
        ...(d.data() as MemberDoc),
      }));
    } else {
      const snap = await this.col()
        .where("gymId", "==", gymId)
        .where("searchTokens", "array-contains", tokens[0]!)
        .get();
      candidates = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as MemberDoc) }))
        .filter((m) =>
          tokens.every((t) =>
            m.searchTokens.some((token) => token.includes(t)),
          ),
        )
        .sort(
          (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis(),
        );
    }

    const matchingCount = tokens.length === 0 ? totalMembers : candidates.length;
    const pageMembers = tokens.length === 0 ? candidates : candidates.slice(
      (page - 1) * pageSize,
      page * pageSize,
    );

    const rows = pageMembers.map((m) => this.toListItem(m, null));

    return { rows, totalMembers, matchingCount, page, pageSize };
  }

  async listMemberOptions(
    ctx: FirestoreContext,
    gymId: string,
    maxRows = 1000,
  ): Promise<{ id: string; name: string }[]> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.col()
      .where("gymId", "==", gymId)
      .orderBy("createdAt", "asc")
      .limit(maxRows)
      .get();
    return snap.docs
      .map((d) => ({
        id: d.id,
        name: (d.data() as MemberDoc).name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async listAllPtMembers(
    ctx: FirestoreContext,
    gymId: string,
    maxRows = 500,
  ): Promise<DocWithId<MemberDoc>[]> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.col()
      .where("gymId", "==", gymId)
      .where("isPt", "==", true)
      .orderBy("name", "asc")
      .limit(maxRows)
      .get();
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as MemberDoc),
    }));
  }

  async updatePtTrainer(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    trainerId: string | null,
  ): Promise<boolean> {
    const existing = await this.findByIdAndGym(ctx, memberId, gymId);
    if (!existing || !existing.isPt) return false;
    await this.col().doc(memberId).update({
      trainerId,
      ...touchUpdatedAt(),
    });
    return true;
  }

  async listAllWithStatus(
    ctx: FirestoreContext,
    gymId: string,
  ): Promise<MemberListItem[]> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.col()
      .where("gymId", "==", gymId)
      .orderBy("createdAt", "desc")
      .limit(500)
      .get();
    return snap.docs.map((d) =>
      this.toListItem({ id: d.id, ...(d.data() as MemberDoc) }, null),
    );
  }
}
