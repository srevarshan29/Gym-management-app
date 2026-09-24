/**
 * Monotonic guard for overlapping async work (e.g. debounced search).
 * Only the most recent `start()` completion should update UI state.
 */
export class AsyncRequestSequence {
  private latest = 0;

  /** Begin a new logical request and return its id. */
  start(): number {
    this.latest += 1;
    return this.latest;
  }

  /** Current request id without starting a new one (e.g. pagination append). */
  current(): number {
    return this.latest;
  }

  /** True when `id` is still the most recent started request. */
  isCurrent(id: number): boolean {
    return id === this.latest;
  }
}
