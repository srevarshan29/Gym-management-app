/** Default waiver + gym rules shown for new gyms until the owner edits Settings. */
export const DEFAULT_MEMBERSHIP_POLICY_TEXT = `By joining this gym, I acknowledge and agree to the following:

- I confirm I am physically fit to participate in gym activities, and I will consult a physician regarding my appropriate exercise regime if needed.
- I understand the gym facilities carry inherent risks, and I will test and satisfy myself about the safety of any equipment before use.
- I release the gym, its management, and staff from any claims, costs, or damages related to injury, loss, or damage arising from my use of the facilities, to the extent permitted by law.
- Membership is non-transferable and for my exclusive use only.
- I will wear appropriate sports attire and non-marking shoes, use a towel during workouts, and follow gym staff instructions.
- Outside food, drinks, and smoking are not permitted on the premises.
- The gym is not responsible for personal belongings; I will use lockers provided.
- Management reserves the right to ask any member to leave for violating these rules.`;

export function normalizeMembershipPolicyText(
  text: string | null | undefined,
): string | null {
  if (text == null) return null;
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isMembershipPolicyRequired(
  text: string | null | undefined,
): boolean {
  return normalizeMembershipPolicyText(text) !== null;
}

/** Settings textarea: unset (null) shows starter default; "" means owner disabled policy. */
export function membershipPolicyTextForSettings(
  dbValue: string | null | undefined,
): string {
  if (dbValue === "") return "";
  if (dbValue == null) return DEFAULT_MEMBERSHIP_POLICY_TEXT;
  return dbValue;
}

/** Persist from Settings form: empty string = explicitly disabled; non-empty = active policy. */
export function persistMembershipPolicyText(
  raw: string | undefined,
): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return "";
  return trimmed;
}
