/**
 * Extends serverless invocation lifetime on Vercel so background work can finish
 * after the HTTP response is sent. Falls back to detached promise locally.
 */
export function scheduleBackgroundWork(work: () => Promise<void>): void {
  const promise = work().catch((err) => {
    console.error("[background-work] Task failed:", err);
  });

  if (process.env.VERCEL === "1") {
    void import("@vercel/functions")
      .then(({ waitUntil }) => {
        waitUntil(promise);
      })
      .catch((err) => {
        console.error(
          "[background-work] waitUntil unavailable; running detached promise:",
          err,
        );
      });
    return;
  }

  void promise;
}

export function schedulePaymentLoggedNotification(
  gymId: string,
  paymentId: string,
  notify: (gymId: string, paymentId: string) => Promise<void>,
): void {
  scheduleBackgroundWork(() => notify(gymId, paymentId));
}
