export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export function actionError(message: string): ActionResult {
  return { ok: false, error: message };
}

export function actionOk(): ActionResult {
  return { ok: true };
}
