import { randomUUID } from "node:crypto";

import type { PlatformContext } from "@/lib/firestore/context";

/** Server-only context for auth lookups and platform operations. */
export const platformContext: PlatformContext = { kind: "platform" };

/** Generate a new Firestore document id (replaces Prisma cuid()). */
export function newDocId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 25);
}

/** Case-insensitive display name comparison (matches Postgres insensitive mode). */
export function displayNamesEqual(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;
}
