/** Returns true when a search response should update UI state (not superseded). */
export function shouldApplyNutritionSearchResponse(
  requestSeq: number,
  latestSeq: number,
): boolean {
  return requestSeq === latestSeq && requestSeq > 0;
}
