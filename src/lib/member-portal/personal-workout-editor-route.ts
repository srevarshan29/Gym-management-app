/** Personal workout editor: `/member/workout/personal/[id]` (not add-exercises). */
const PERSONAL_WORKOUT_EDITOR_PATH =
  /^\/member\/workout\/personal\/[^/]+$/;

export function isPersonalWorkoutEditorRoute(pathname: string): boolean {
  return PERSONAL_WORKOUT_EDITOR_PATH.test(pathname);
}
