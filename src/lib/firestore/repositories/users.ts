import { Timestamp, type Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import type { FirestoreContext } from "@/lib/firestore/context";
import { DocumentNotFoundError } from "@/lib/firestore/errors";
import { displayNamesEqual } from "@/lib/firestore/helpers";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import { omitUndefined, serverTimestamps } from "@/lib/firestore/serialize";
import type { StaffRole, UserDoc } from "@/lib/firestore/types";

export type CreateUserInput = {
  id?: string;
  gymId: string | null;
  name: string;
  email: string;
  passwordHash: string;
  role: StaffRole;
};

export type StaffListItem = {
  id: string;
  name: string;
  email: string;
  role: Exclude<StaffRole, "SUPER_ADMIN">;
};

/**
 * Staff user accounts — platform-scoped reads for auth, gym-scoped for CRUD.
 * SUPER_ADMIN users have gymId: null.
 */
export class UsersRepository {
  constructor(private readonly db: Firestore) {}

  private col() {
    return this.db.collection(COLLECTIONS.users);
  }

  async findByEmail(
    _ctx: FirestoreContext,
    email: string,
  ): Promise<DocWithId<UserDoc> | null> {
    const snap = await this.col().where("email", "==", email).limit(1).get();
    const doc = snap.docs[0];
    if (!doc) return null;
    return { id: doc.id, ...(doc.data() as UserDoc) };
  }

  async findById(
    _ctx: FirestoreContext,
    userId: string,
  ): Promise<DocWithId<UserDoc> | null> {
    const snap = await this.col().doc(userId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...(snap.data() as UserDoc) };
  }

  async create(
    _ctx: FirestoreContext,
    input: CreateUserInput,
  ): Promise<DocWithId<UserDoc>> {
    const id = input.id ?? this.col().doc().id;
    const now = Timestamp.now();
    const data = omitUndefined({
      gymId: input.gymId,
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
      ...serverTimestamps(now),
    }) satisfies UserDoc;

    await this.col().doc(id).set(data);
    const created = await this.findById(_ctx, id);
    if (!created) throw new DocumentNotFoundError(COLLECTIONS.users, id);
    return created;
  }

  async updateName(
    ctx: FirestoreContext,
    gymId: string,
    userId: string,
    name: string,
  ): Promise<boolean> {
    const existing = await this.findById(ctx, userId);
    if (!existing || existing.gymId !== gymId) return false;
    await this.col().doc(userId).update({
      name,
      updatedAt: Timestamp.now(),
    });
    return true;
  }

  async updateRole(
    ctx: FirestoreContext,
    gymId: string,
    userId: string,
    role: Exclude<StaffRole, "SUPER_ADMIN">,
  ): Promise<boolean> {
    const existing = await this.findById(ctx, userId);
    if (!existing || existing.gymId !== gymId) return false;
    await this.col().doc(userId).update({
      role,
      updatedAt: Timestamp.now(),
    });
    return true;
  }

  async delete(ctx: FirestoreContext, gymId: string, userId: string): Promise<boolean> {
    const existing = await this.findById(ctx, userId);
    if (!existing || existing.gymId !== gymId) return false;
    await this.col().doc(userId).delete();
    return true;
  }

  async listStaffByGym(
    _ctx: FirestoreContext,
    gymId: string,
  ): Promise<StaffListItem[]> {
    const snap = await this.col()
      .where("gymId", "==", gymId)
      .orderBy("createdAt", "asc")
      .get();

    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as UserDoc) }))
      .filter((u) => u.role !== "SUPER_ADMIN")
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as StaffListItem["role"],
      }))
      .sort((a, b) => {
        const roleOrder = { OWNER: 0, ADMIN: 1, STAFF: 2 };
        const roleDiff = roleOrder[a.role] - roleOrder[b.role];
        if (roleDiff !== 0) return roleDiff;
        return a.name.localeCompare(b.name);
      });
  }

  async countByGym(_ctx: FirestoreContext, gymId: string): Promise<number> {
    const snap = await this.col().where("gymId", "==", gymId).count().get();
    return snap.data().count;
  }

  async findOwnerByGym(
    _ctx: FirestoreContext,
    gymId: string,
  ): Promise<Pick<DocWithId<UserDoc>, "id" | "name" | "email"> | null> {
    const snap = await this.col()
      .where("gymId", "==", gymId)
      .where("role", "==", "OWNER")
      .orderBy("createdAt", "asc")
      .limit(1)
      .get();
    const doc = snap.docs[0];
    if (!doc) return null;
    const data = doc.data() as UserDoc;
    return { id: doc.id, name: data.name, email: data.email };
  }

  async isDisplayNameTakenInGym(
    _ctx: FirestoreContext,
    gymId: string,
    name: string,
    excludeUserId?: string,
  ): Promise<boolean> {
    const snap = await this.col().where("gymId", "==", gymId).get();
    return snap.docs.some((d) => {
      if (excludeUserId && d.id === excludeUserId) return false;
      const data = d.data() as UserDoc;
      return displayNamesEqual(data.name, name);
    });
  }

  async getStaffOptions(
    _ctx: FirestoreContext,
    gymId: string,
  ): Promise<Array<{ id: string; name: string }>> {
    const snap = await this.col()
      .where("gymId", "==", gymId)
      .orderBy("name", "asc")
      .get();
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as UserDoc) }))
      .filter((u) => u.role !== "SUPER_ADMIN")
      .map((u) => ({ id: u.id, name: u.name }));
  }

  async validateTrainerForGym(
    ctx: FirestoreContext,
    gymId: string,
    trainerId: string,
  ): Promise<boolean> {
    const user = await this.findById(ctx, trainerId);
    return user !== null && user.gymId === gymId && user.role !== "SUPER_ADMIN";
  }
}
