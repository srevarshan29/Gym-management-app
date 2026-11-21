import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import { omitUndefined, serverTimestamps } from "@/lib/firestore/serialize";
import {
  nextCredentialsVersion,
  resolveCredentialsVersion,
} from "@/lib/staff-auth/credentials-version";
import type { StaffPasswordResetCompletionOutcome } from "@/lib/staff-auth/self-service-password-reset";
import { isStaffPasswordResetTokenExpired } from "@/lib/staff-auth/self-service-password-reset";

export type StaffPasswordResetTokenDoc = {
  userId: string;
  email: string;
  gymId: string | null;
  credentialsVersion: number;
  expiresAt: Timestamp;
  usedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export class StaffPasswordResetTokensRepository {
  constructor(private readonly db: Firestore) {}

  private col() {
    return this.db.collection(COLLECTIONS.staffPasswordResetTokens);
  }

  async createToken(input: {
    tokenHash: string;
    userId: string;
    email: string;
    gymId: string | null;
    expiresAt: Date;
    createdAt: Date;
  }): Promise<{ credentialsVersion: number }> {
    const now = Timestamp.fromDate(input.createdAt);
    const tokenRef = this.col().doc(input.tokenHash);
    const userRef = this.db.collection(COLLECTIONS.users).doc(input.userId);

    return this.db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        throw new Error("Staff user not found for password reset token.");
      }

      const user = userSnap.data() as {
        email?: string;
        gymId?: string | null;
        credentialsVersion?: number;
      };

      if (user.email !== input.email) {
        throw new Error("Staff user email mismatch for password reset token.");
      }

      const userGymId =
        typeof user.gymId === "string" || user.gymId === null ? user.gymId : null;
      const inputGymId =
        typeof input.gymId === "string" || input.gymId === null ? input.gymId : null;
      if (userGymId !== inputGymId) {
        throw new Error("Staff user gym mismatch for password reset token.");
      }

      const credentialsVersion = resolveCredentialsVersion(user.credentialsVersion);

      tx.set(
        tokenRef,
        omitUndefined({
          userId: input.userId,
          email: input.email,
          gymId: input.gymId,
          credentialsVersion,
          expiresAt: Timestamp.fromDate(input.expiresAt),
          usedAt: null,
          ...serverTimestamps(now),
        }) satisfies StaffPasswordResetTokenDoc,
      );

      return { credentialsVersion };
    });
  }

  async redeemToken(
    tokenHash: string,
    passwordHash: string,
    now: Date,
  ): Promise<StaffPasswordResetCompletionOutcome> {
    const tokenRef = this.col().doc(tokenHash);
    const userCol = this.db.collection(COLLECTIONS.users);

    return this.db.runTransaction(async (tx) => {
      const tokenSnap = await tx.get(tokenRef);
      if (!tokenSnap.exists) {
        return "invalid_token";
      }

      const token = tokenSnap.data() as StaffPasswordResetTokenDoc;
      if (token.usedAt) {
        return "used_token";
      }
      if (isStaffPasswordResetTokenExpired(token, now)) {
        return "expired_token";
      }

      const userRef = userCol.doc(token.userId);
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        return "invalid_token";
      }

      const user = userSnap.data() as {
        email?: string;
        gymId?: string | null;
        credentialsVersion?: number;
      };
      if (user.email !== token.email) {
        return "invalid_token";
      }
      const userGymId =
        typeof user.gymId === "string" || user.gymId === null ? user.gymId : null;
      const tokenGymId =
        typeof token.gymId === "string" || token.gymId === null ? token.gymId : null;
      if (userGymId !== tokenGymId) {
        return "invalid_token";
      }

      const userCredentialsVersion = resolveCredentialsVersion(user.credentialsVersion);
      const tokenCredentialsVersion = resolveCredentialsVersion(token.credentialsVersion);
      if (tokenCredentialsVersion !== userCredentialsVersion) {
        return "invalid_token";
      }

      tx.update(tokenRef, {
        usedAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });
      tx.update(userRef, {
        passwordHash,
        credentialsVersion: nextCredentialsVersion(user.credentialsVersion),
        updatedAt: Timestamp.fromDate(now),
      });

      return "success";
    });
  }

  /** Test helper: read token without exposing raw token values elsewhere. */
  async getByHash(tokenHash: string): Promise<StaffPasswordResetTokenDoc | null> {
    const snap = await this.col().doc(tokenHash).get();
    if (!snap.exists) return null;
    return snap.data() as StaffPasswordResetTokenDoc;
  }

  async deleteByHash(tokenHash: string): Promise<void> {
    await this.col().doc(tokenHash).delete();
  }

  async markUsed(tokenHash: string, now: Date): Promise<void> {
    await this.col().doc(tokenHash).update({
      usedAt: Timestamp.fromDate(now),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}