/**
 * One-time staff password reset. Dry-run unless every confirmation flag is set.
 *
 * Dry-run (no writes):
 *   node --env-file=.env --import tsx scripts/reset-staff-password.ts --email ram@gmail.com
 *
 * Apply (interactive hidden password prompt; updates passwordHash, credentialsVersion and updatedAt):
 *   node --env-file=.env --import tsx scripts/reset-staff-password.ts --email ram@gmail.com --apply --confirm-email ram@gmail.com --confirm-project PROJECT_ID --confirm-gym GYM_ID
 */
import bcrypt from "bcryptjs";
import { Timestamp } from "firebase-admin/firestore";

import { COLLECTIONS } from "../src/lib/firestore/collections";
import { getFirestoreDb } from "../src/lib/firebase/admin";
import {
  STAFF_PASSWORD_BCRYPT_ROUNDS,
  StaffPasswordResetError,
  assertExactlyOneStaffAccount,
  assertStaffPasswordResetConfirmation,
  staffPasswordResetPatch,
  validateStaffResetPassword,
  type StaffPasswordResetAccount,
} from "../src/lib/staff-auth/staff-password-reset";

function readFlag(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) return null;
  return value;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function promptHidden(label: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
      reject(
        new StaffPasswordResetError(
          "A hidden password prompt needs an interactive terminal.",
        ),
      );
      return;
    }

    process.stdout.write(label);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    let value = "";

    const onData = (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      if (text === "\u0003") {
        cleanup();
        reject(new StaffPasswordResetError("Password prompt cancelled."));
        return;
      }
      if (text === "\r" || text === "\n" || text === "\r\n") {
        cleanup();
        process.stdout.write("\n");
        resolve(value);
        return;
      }
      if (text === "\u007f" || text === "\b") {
        value = value.slice(0, -1);
        return;
      }
      if (text.startsWith("\u001b")) return;
      value += text;
    };

    const cleanup = () => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };

    process.stdin.on("data", onData);
  });
}

async function findAccounts(email: string): Promise<StaffPasswordResetAccount[]> {
  const snap = await getFirestoreDb()
    .collection(COLLECTIONS.users)
    .where("email", "==", email)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      email: typeof data.email === "string" ? data.email : "",
      gymId: typeof data.gymId === "string" ? data.gymId : null,
      role: typeof data.role === "string" ? data.role : "",
    };
  });
}

async function main(): Promise<void> {
  const email = readFlag("--email")?.trim() ?? "";
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() ?? "";
  if (!email) {
    throw new StaffPasswordResetError("Pass --email with the staff account email.");
  }
  if (!projectId) {
    throw new StaffPasswordResetError("FIREBASE_PROJECT_ID is not set.");
  }

  const account = assertExactlyOneStaffAccount(await findAccounts(email));
  if (account.email !== email) {
    throw new StaffPasswordResetError("Matched document email does not equal the requested email.");
  }

  const summary = {
    mode: hasFlag("--apply") ? "apply" : "dry-run",
    firebaseProjectId: projectId,
    userDocumentId: account.id,
    email: account.email,
    gymId: account.gymId,
    role: account.role,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (!hasFlag("--apply")) {
    console.log("Dry-run only. No document was updated.");
    return;
  }

  assertStaffPasswordResetConfirmation({
    email: account.email,
    projectId,
    gymId: account.gymId,
    confirmEmail: readFlag("--confirm-email")?.trim() ?? "",
    confirmProjectId: readFlag("--confirm-project")?.trim() ?? "",
    confirmGymId: readFlag("--confirm-gym")?.trim() ?? "",
  });

  const password = await promptHidden("New password (hidden): ");
  const confirm = await promptHidden("Confirm password (hidden): ");
  if (password !== confirm) {
    throw new StaffPasswordResetError("Password confirmation does not match.");
  }
  const passwordError = validateStaffResetPassword(password);
  if (passwordError) {
    throw new StaffPasswordResetError(passwordError);
  }

  const passwordHash = await bcrypt.hash(password, STAFF_PASSWORD_BCRYPT_ROUNDS);
  const db = getFirestoreDb();
  const userRef = db.collection(COLLECTIONS.users).doc(account.id);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) {
      throw new StaffPasswordResetError("Staff user no longer exists.");
    }

    const patch = staffPasswordResetPatch({
      passwordHash,
      updatedAt: new Date(),
      currentCredentialsVersion: snap.data()?.credentialsVersion,
    });

    tx.update(userRef, {
      passwordHash: patch.passwordHash,
      credentialsVersion: patch.credentialsVersion,
      updatedAt: Timestamp.fromDate(patch.updatedAt),
    });
  });

  console.log("Updated passwordHash, credentialsVersion and updatedAt only.");
}

main().catch((error: unknown) => {
  const message =
    error instanceof StaffPasswordResetError
      ? error.message
      : "Staff password reset failed.";
  console.error(message);
  process.exitCode = 1;
});