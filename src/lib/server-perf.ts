/** Dev-only server phase timing when SERVER_PERF_LOG=true. */
export function isServerPerfLoggingEnabled(): boolean {
  return process.env.SERVER_PERF_LOG === "true";
}

export async function measureServerPhase<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!isServerPerfLoggingEnabled()) {
    return fn();
  }

  const start = performance.now();
  try {
    return await fn();
  } finally {
    const elapsedMs = Math.round(performance.now() - start);
    console.info(`[server-perf] ${label}: ${elapsedMs}ms`);
  }
}
