import type { UserDoc } from "@/lib/firestore/types";

/** True when the account can authenticate with email + password. */
export function staffAccountHasPassword(
  user: Pick<UserDoc, "passwordHash">,
): boolean {
  const hash = user.passwordHash;
  return typeof hash === "string" && hash.length > 0;
}