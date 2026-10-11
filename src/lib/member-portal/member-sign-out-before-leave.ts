import { isPersonalWorkoutEditorRoute } from "@/lib/member-portal/personal-workout-editor-route";

/** Flush personal workout editor autosave before sign-out when on the editor route. */
export async function prepareMemberSignOutLeave(
  pathname: string,
  runRegisteredBeforeLeave: () => Promise<boolean>,
): Promise<boolean> {
  if (!isPersonalWorkoutEditorRoute(pathname)) {
    return true;
  }
  return runRegisteredBeforeLeave();
}
