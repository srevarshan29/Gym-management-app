export function verifyCronSecret(request: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    console.error("[cron] CRON_SECRET is not configured.");
    return false;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${expected}`) {
    return true;
  }

  return false;
}
