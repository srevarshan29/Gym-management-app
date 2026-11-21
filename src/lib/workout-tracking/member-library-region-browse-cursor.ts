import type { MemberLibraryMuscleFilter } from "@/lib/member-portal/member-library-muscle-groups";
import type { MuscleGroup } from "@/lib/firestore/types";

/** Serialized in region browse cursors (same fields as member catalog list items). */
export type MemberLibraryRegionBrowseItem = {
  catalogId: string;
  name: string;
  muscleGroup: MuscleGroup;
  primaryMuscles: string[];
  equipment: string | null;
  hasMedia: boolean;
  thumbnailUrl: string | null;
};

export const MEMBER_LIBRARY_REGION_CURSOR_PREFIX = "mbr1:";

export class MemberLibraryRegionPaginationError extends Error {
  override readonly name = "MemberLibraryRegionPaginationError";

  constructor(message: string) {
    super(message);
  }
}

export function isMemberLibraryRegionBrowseCursor(
  value: string | null | undefined,
): boolean {
  const raw = value?.trim();
  return Boolean(raw?.startsWith(MEMBER_LIBRARY_REGION_CURSOR_PREFIX));
}

export type MemberLibraryRegionBrowseState = {
  v: 1;
  muscleGroup: MuscleGroup;
  libraryGroup: MemberLibraryMuscleFilter;
  regionId: string;
  /** Firestore catalog continuation (last doc id in scan order). */
  firestoreCursor: string | null;
  scannedDocs: number;
  firestoreExhausted: boolean;
  scanCapReached: boolean;
  /** Region matches not yet returned to the client (scan order). */
  pending: MemberLibraryRegionBrowseItem[];
};

export function encodeMemberLibraryRegionBrowseCursor(
  state: MemberLibraryRegionBrowseState,
): string {
  const json = JSON.stringify(state);
  const payload = Buffer.from(json, "utf8").toString("base64url");
  return `${MEMBER_LIBRARY_REGION_CURSOR_PREFIX}${payload}`;
}

export function decodeMemberLibraryRegionBrowseCursor(
  value: string | null | undefined,
): MemberLibraryRegionBrowseState | null {
  const raw = value?.trim();
  if (!raw || !raw.startsWith(MEMBER_LIBRARY_REGION_CURSOR_PREFIX)) {
    return null;
  }
  try {
    const payload = raw.slice(MEMBER_LIBRARY_REGION_CURSOR_PREFIX.length);
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as MemberLibraryRegionBrowseState;
    if (parsed?.v !== 1 || !Array.isArray(parsed.pending)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createInitialMemberLibraryRegionBrowseState(input: {
  muscleGroup: MuscleGroup;
  libraryGroup: MemberLibraryMuscleFilter;
  regionId: string;
}): MemberLibraryRegionBrowseState {
  return {
    v: 1,
    muscleGroup: input.muscleGroup,
    libraryGroup: input.libraryGroup,
    regionId: input.regionId,
    firestoreCursor: null,
    scannedDocs: 0,
    firestoreExhausted: false,
    scanCapReached: false,
    pending: [],
  };
}

export function regionBrowseHasMore(
  state: MemberLibraryRegionBrowseState,
): boolean {
  if (state.pending.length > 0) return true;
  if (state.firestoreExhausted) return false;
  if (state.scanCapReached) return !state.firestoreExhausted;
  return true;
}