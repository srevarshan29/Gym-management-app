import type { DocumentSnapshot } from "firebase-admin/firestore";

import { primaryCatalogSearchToken } from "@/lib/exercises/catalog-search";
import { InvalidPaginationCursorError } from "@/lib/firestore/errors";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { ExerciseCatalogDoc, MuscleGroup } from "@/lib/firestore/types";

const CATALOG_CURSOR_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;
const CATALOG_SEARCH_CURSOR_VERSION = 1;

export type CatalogSearchCursorV1 = {
  v: typeof CATALOG_SEARCH_CURSOR_VERSION;
  token: string;
  muscleGroup: MuscleGroup | null;
  boundaryNameLower: string;
  boundaryId: string;
  nameAfterId: string | null;
  prefixAfterId: string | null;
};

export function compareCatalogDocs(
  a: Pick<ExerciseCatalogDoc, "nameLower"> & { id: string },
  b: Pick<ExerciseCatalogDoc, "nameLower"> & { id: string },
): number {
  const byName = a.nameLower.localeCompare(b.nameLower);
  return byName !== 0 ? byName : a.id.localeCompare(b.id);
}

function isAfterBoundary(
  doc: Pick<ExerciseCatalogDoc, "nameLower"> & { id: string },
  boundary: Pick<CatalogSearchCursorV1, "boundaryNameLower" | "boundaryId">,
): boolean {
  const byName = doc.nameLower.localeCompare(boundary.boundaryNameLower);
  if (byName !== 0) return byName > 0;
  return doc.id.localeCompare(boundary.boundaryId) > 0;
}

function assertCatalogCursorId(id: string | null | undefined, label: string): string | null {
  const trimmed = id?.trim();
  if (!trimmed) return null;
  if (!CATALOG_CURSOR_ID_PATTERN.test(trimmed)) {
    throw new InvalidPaginationCursorError(`Invalid ${label} in pagination cursor.`);
  }
  return trimmed;
}

export function encodeCatalogSearchCursor(payload: CatalogSearchCursorV1): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCatalogSearchCursor(
  raw: string,
  options: {
    query: string;
    muscleGroup?: MuscleGroup | null;
  },
): CatalogSearchCursorV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    throw new InvalidPaginationCursorError();
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as CatalogSearchCursorV1).v !== CATALOG_SEARCH_CURSOR_VERSION
  ) {
    throw new InvalidPaginationCursorError();
  }

  const cursor = parsed as CatalogSearchCursorV1;
  const expectedToken = primaryCatalogSearchToken(options.query);
  if (!expectedToken || cursor.token !== expectedToken) {
    throw new InvalidPaginationCursorError(
      "Pagination cursor does not match the current search query.",
    );
  }

  const expectedMuscleGroup = options.muscleGroup ?? null;
  if (cursor.muscleGroup !== expectedMuscleGroup) {
    throw new InvalidPaginationCursorError(
      "Pagination cursor does not match the current muscle group filter.",
    );
  }

  const boundaryId = assertCatalogCursorId(cursor.boundaryId, "boundaryId");
  const boundaryNameLower =
    typeof cursor.boundaryNameLower === "string" ? cursor.boundaryNameLower : "";
  if (!boundaryId || !boundaryNameLower) {
    throw new InvalidPaginationCursorError();
  }

  return {
    v: CATALOG_SEARCH_CURSOR_VERSION,
    token: cursor.token,
    muscleGroup: cursor.muscleGroup,
    boundaryNameLower,
    boundaryId,
    nameAfterId: assertCatalogCursorId(cursor.nameAfterId, "nameAfterId"),
    prefixAfterId: assertCatalogCursorId(cursor.prefixAfterId, "prefixAfterId"),
  };
}

export type MergeCatalogSearchPageParams = {
  limit: number;
  token: string;
  muscleGroup?: MuscleGroup | null;
  usePrefixQuery: boolean;
  decodedCursor: CatalogSearchCursorV1 | null;
  fetchNameRows: (
    cursor: DocumentSnapshot | null,
    batchLimit: number,
  ) => Promise<DocWithId<ExerciseCatalogDoc>[]>;
  fetchPrefixRows: (
    cursor: DocumentSnapshot | null,
    batchLimit: number,
  ) => Promise<DocWithId<ExerciseCatalogDoc>[]>;
  resolveCursorSnapshot: (catalogId: string | null) => Promise<DocumentSnapshot | null>;
};

export async function paginateMergedCatalogSearch(
  params: MergeCatalogSearchPageParams,
): Promise<{
  items: DocWithId<ExerciseCatalogDoc>[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const limit = params.limit;
  const boundary = params.decodedCursor;
  const batchSize = Math.max(limit + 1, 10);

  let nameAfterId = params.decodedCursor?.nameAfterId ?? null;
  let prefixAfterId = params.decodedCursor?.prefixAfterId ?? null;
  let nameLastConsumedId = nameAfterId;
  let prefixLastConsumedId = prefixAfterId;

  let nameBuffer: DocWithId<ExerciseCatalogDoc>[] = [];
  let prefixBuffer: DocWithId<ExerciseCatalogDoc>[] = [];
  let nameIndex = 0;
  let prefixIndex = 0;
  let nameExhausted = false;
  let prefixExhausted = !params.usePrefixQuery;

  const emitted: DocWithId<ExerciseCatalogDoc>[] = [];
  const emittedIds = new Set<string>();
  let hasMore = false;

  async function refillNameBuffer(): Promise<void> {
    if (nameExhausted) return;
    const cursor = await params.resolveCursorSnapshot(nameAfterId);
    const batch = await params.fetchNameRows(cursor, batchSize);
    if (batch.length === 0) {
      nameExhausted = true;
      return;
    }
    nameAfterId = batch[batch.length - 1]!.id;
    nameBuffer.push(...batch);
    if (batch.length < batchSize) {
      nameExhausted = true;
    }
  }

  async function refillPrefixBuffer(): Promise<void> {
    if (prefixExhausted) return;
    const cursor = await params.resolveCursorSnapshot(prefixAfterId);
    const batch = await params.fetchPrefixRows(cursor, batchSize);
    if (batch.length === 0) {
      prefixExhausted = true;
      return;
    }
    prefixAfterId = batch[batch.length - 1]!.id;
    prefixBuffer.push(...batch);
    if (batch.length < batchSize) {
      prefixExhausted = true;
    }
  }

  function consumeNameHead(): DocWithId<ExerciseCatalogDoc> | null {
    if (nameIndex >= nameBuffer.length) return null;
    const doc = nameBuffer[nameIndex]!;
    nameIndex += 1;
    nameLastConsumedId = doc.id;
    return doc;
  }

  function consumePrefixHead(): DocWithId<ExerciseCatalogDoc> | null {
    if (prefixIndex >= prefixBuffer.length) return null;
    const doc = prefixBuffer[prefixIndex]!;
    prefixIndex += 1;
    prefixLastConsumedId = doc.id;
    return doc;
  }

  function peekNameHead(): DocWithId<ExerciseCatalogDoc> | null {
    if (nameIndex >= nameBuffer.length) return null;
    return nameBuffer[nameIndex]!;
  }

  function peekPrefixHead(): DocWithId<ExerciseCatalogDoc> | null {
    if (prefixIndex >= prefixBuffer.length) return null;
    return prefixBuffer[prefixIndex]!;
  }

  function pickNextCandidate(): DocWithId<ExerciseCatalogDoc> | null {
    const nameHead = peekNameHead();
    const prefixHead = peekPrefixHead();
    if (!nameHead && !prefixHead) return null;

    if (!nameHead) return prefixHead;
    if (!prefixHead) return nameHead;
    return compareCatalogDocs(nameHead, prefixHead) <= 0 ? nameHead : prefixHead;
  }

  function consumeCandidate(doc: DocWithId<ExerciseCatalogDoc>): void {
    if (peekNameHead()?.id === doc.id) {
      consumeNameHead();
    }
    if (peekPrefixHead()?.id === doc.id) {
      consumePrefixHead();
    }
  }

  while (true) {
    if (nameIndex >= nameBuffer.length && !nameExhausted) {
      await refillNameBuffer();
    }
    if (prefixIndex >= prefixBuffer.length && !prefixExhausted) {
      await refillPrefixBuffer();
    }

    const next = pickNextCandidate();
    if (!next) {
      break;
    }

    if (boundary && !isAfterBoundary(next, boundary)) {
      consumeCandidate(next);
      continue;
    }
    if (emittedIds.has(next.id)) {
      consumeCandidate(next);
      continue;
    }

    if (emitted.length < limit) {
      consumeCandidate(next);
      emittedIds.add(next.id);
      emitted.push(next);
      continue;
    }

    hasMore = true;
    break;
  }

  if (!hasMore || emitted.length === 0) {
    return { items: emitted, nextCursor: null, hasMore: false };
  }

  const lastItem = emitted[emitted.length - 1]!;
  const nextCursor = encodeCatalogSearchCursor({
    v: CATALOG_SEARCH_CURSOR_VERSION,
    token: params.token,
    muscleGroup: params.muscleGroup ?? null,
    boundaryNameLower: lastItem.nameLower,
    boundaryId: lastItem.id,
    nameAfterId: nameLastConsumedId,
    prefixAfterId: prefixLastConsumedId,
  });

  return {
    items: emitted,
    nextCursor,
    hasMore: true,
  };
}
