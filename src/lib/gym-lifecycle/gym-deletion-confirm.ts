export type ImmediateDeletionConfirmInput = {
  gymName: string;
  gymId: string;
  confirmName: string;
  confirmId: string;
  confirmPhrase: string;
};

export const IMMEDIATE_DELETION_CONFIRM_PHRASE = "DELETE IMMEDIATELY";

export function validateImmediateDeletionConfirmation(
  input: ImmediateDeletionConfirmInput,
): { ok: true } | { ok: false; error: string } {
  if (input.confirmName.trim() !== input.gymName.trim()) {
    return { ok: false, error: "Gym name confirmation does not match." };
  }
  if (input.confirmId.trim() !== input.gymId.trim()) {
    return { ok: false, error: "Gym ID confirmation does not match." };
  }
  if (input.confirmPhrase.trim() !== IMMEDIATE_DELETION_CONFIRM_PHRASE) {
    return {
      ok: false,
      error: `Type "${IMMEDIATE_DELETION_CONFIRM_PHRASE}" to confirm immediate deletion.`,
    };
  }
  return { ok: true };
}