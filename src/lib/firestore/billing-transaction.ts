import {

  type DocumentReference,

  type Firestore,

  Timestamp,

  type Transaction,

} from "firebase-admin/firestore";



import { COLLECTIONS } from "@/lib/firestore/collections";

import { DocumentNotFoundError } from "@/lib/firestore/errors";

import type { GymDoc } from "@/lib/firestore/types";

import { getFirestoreDb } from "@/lib/firebase/admin";



export type BillingTransaction = {

  db: Firestore;

  tx: Transaction;

  gymId: string;

  gymRef: DocumentReference;

  /** Loaded once at transaction start; kept in sync by seq bump helpers. */

  gym: GymDoc;

};



export async function runBillingTransaction<T>(

  gymId: string,

  fn: (ctx: BillingTransaction) => Promise<T>,

): Promise<T> {

  const db = getFirestoreDb();

  return db.runTransaction(async (tx) => {

    const gymRef = db.collection(COLLECTIONS.gyms).doc(gymId);

    const gymSnap = await tx.get(gymRef);

    if (!gymSnap.exists) {

      throw new DocumentNotFoundError(COLLECTIONS.gyms, gymId);

    }

    const gym = gymSnap.data() as GymDoc;

    // #region agent log

    fetch("http://127.0.0.1:7469/ingest/49c9d7e5-cf6e-48b1-912f-8ac4d15f6801", {

      method: "POST",

      headers: {

        "Content-Type": "application/json",

        "X-Debug-Session-Id": "f932d8",

      },

      body: JSON.stringify({

        sessionId: "f932d8",

        runId: "pre-fix",

        hypothesisId: "A",

        location: "billing-transaction.ts:runBillingTransaction",

        message: "transaction gym read complete",

        data: { gymId, memberSeq: gym.memberSeq, receiptSeq: gym.receiptSeq },

        timestamp: Date.now(),

      }),

    }).catch(() => {});

    // #endregion

    return fn({ db, tx, gymId, gymRef, gym });

  });

}



/** Returns the gym snapshot already loaded for this transaction (no extra read). */

export async function readGymInTransaction(

  ctx: BillingTransaction,

): Promise<GymDoc> {

  return ctx.gym;

}



export async function bumpMemberSeq(ctx: BillingTransaction): Promise<number> {

  const next = ctx.gym.memberSeq + 1;

  ctx.gym.memberSeq = next;

  ctx.tx.update(ctx.gymRef, {

    memberSeq: next,

    updatedAt: Timestamp.now(),

  });

  // #region agent log

  fetch("http://127.0.0.1:7469/ingest/49c9d7e5-cf6e-48b1-912f-8ac4d15f6801", {

    method: "POST",

    headers: {

      "Content-Type": "application/json",

      "X-Debug-Session-Id": "f932d8",

    },

    body: JSON.stringify({

      sessionId: "f932d8",

      runId: "pre-fix",

      hypothesisId: "B",

      location: "billing-transaction.ts:bumpMemberSeq",

      message: "memberSeq bump write (no re-read)",

      data: { gymId: ctx.gymId, next },

      timestamp: Date.now(),

    }),

  }).catch(() => {});

  // #endregion

  return next;

}



export async function bumpReceiptSeq(ctx: BillingTransaction): Promise<number> {

  const next = ctx.gym.receiptSeq + 1;

  ctx.gym.receiptSeq = next;

  ctx.tx.update(ctx.gymRef, {

    receiptSeq: next,

    updatedAt: Timestamp.now(),

  });

  // #region agent log

  fetch("http://127.0.0.1:7469/ingest/49c9d7e5-cf6e-48b1-912f-8ac4d15f6801", {

    method: "POST",

    headers: {

      "Content-Type": "application/json",

      "X-Debug-Session-Id": "f932d8",

    },

    body: JSON.stringify({

      sessionId: "f932d8",

      runId: "pre-fix",

      hypothesisId: "A",

      location: "billing-transaction.ts:bumpReceiptSeq",

      message: "receiptSeq bump write (no re-read)",

      data: { gymId: ctx.gymId, next },

      timestamp: Date.now(),

    }),

  }).catch(() => {});

  // #endregion

  return next;

}



export function resetGymSequences(ctx: BillingTransaction): void {

  ctx.gym.memberSeq = 0;

  ctx.gym.receiptSeq = 0;

  ctx.tx.update(ctx.gymRef, {

    memberSeq: 0,

    receiptSeq: 0,

    updatedAt: Timestamp.now(),

  });

}


