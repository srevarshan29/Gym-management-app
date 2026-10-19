export class WorkoutEmptyConfirmationRequiredError extends Error {
  readonly code = "WORKOUT_EMPTY_CONFIRMATION_REQUIRED";

  constructor() {
    super("Finish early?");
    this.name = "WorkoutEmptyConfirmationRequiredError";
  }
}
