export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string };

export function actionError(error: string): ActionResult<never> {
  return { ok: false, error };
}

export function actionOk<T = undefined>(
  message?: string,
  data?: T,
): ActionResult<T> {
  return { ok: true, message, data };
}
