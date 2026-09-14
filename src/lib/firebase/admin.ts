import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const globalForFirebase = globalThis as unknown as {
  firebaseApp: App | undefined;
  firestoreDb: Firestore | undefined;
};

function resolveProjectId(): string {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      "FIREBASE_PROJECT_ID is not set. Add it to .env (see .env.example).",
    );
  }
  return projectId;
}

function initFirebaseApp(): App {
  const existing = getApps();
  if (existing.length > 0) return existing[0]!;

  const projectId = resolveProjectId();

  // Emulator: Admin SDK auto-routes when FIRESTORE_EMULATOR_HOST is set.
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return initializeApp({ projectId });
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  // Local dev with `gcloud auth application-default login` or Cloud Run default creds.
  return initializeApp({ projectId });
}

/** Singleton Firebase Admin app (survives Next.js hot reload). */
export function getFirebaseApp(): App {
  if (!globalForFirebase.firebaseApp) {
    globalForFirebase.firebaseApp = initFirebaseApp();
  }
  return globalForFirebase.firebaseApp;
}

/** Singleton Firestore instance for server-side reads/writes. */
export function getFirestoreDb(): Firestore {
  if (!globalForFirebase.firestoreDb) {
    globalForFirebase.firestoreDb = getFirestore(getFirebaseApp());
  }
  return globalForFirebase.firestoreDb;
}

/** True when pointing at the local Firestore emulator. */
export function isFirestoreEmulator(): boolean {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}
