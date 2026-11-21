import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { populateCatalogMediaFromAssets } from "@/lib/catalog/catalog-media-population";
import {
  loadCatalogBundleFiles,
  validateCatalogBundle,
} from "@/lib/catalog/bundle-validation";
import { sha256Hex } from "@/lib/catalog/hash";
import { CATALOG_IMAGES_DIR } from "@/lib/catalog/paths";
import {
  computeCatalogSyncPlan,
  fingerprintCatalogExercise,
  type ExistingCatalogSnapshot,
} from "@/lib/catalog/sync-plan";
import type { CatalogSyncEnvironment } from "@/lib/catalog/sync-environment";
import { formatCatalogSyncEnvironment } from "@/lib/catalog/format-environment";
import { syncCatalogMediaAssets } from "@/lib/catalog/catalog-media-sync";
import { existingSnapshotFromCatalogDoc } from "@/lib/catalog/sync-writer";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { normalizeExerciseCatalogBrowseTags } from "@/lib/firestore/exercise-catalog-normalize";
import type { Firestore } from "firebase-admin/firestore";
import type { ExerciseCatalogDoc } from "@/lib/firestore/types";
import type { ValidatedCatalogExercise } from "@/lib/catalog/types";
import type { ExerciseMediaMetadata } from "@/lib/exercises/catalog-types";
import type { MuscleGroup } from "@/lib/muscle-groups";

export const DEFAULT_PREFLIGHT_REPORT_PATH = resolve(
  process.cwd(),
  "data/catalog/sync-preflight-report.json",
);

type MediaPose = "primaryImageUrl" | "secondaryImageUrl" | "thumbnailUrl";

const MEDIA_POSES: MediaPose[] = [
  "primaryImageUrl",
  "secondaryImageUrl",
  "thumbnailUrl",
];

export type ComparableCatalogContent = {
  catalogId: string;
  catalogVersion: string;
  name: string;
  nameLower: string;
  muscleGroup: MuscleGroup;
  fullBody: boolean;
  cardio: boolean;
  description: string | null;
  instructions: string[];
  tips: string[] | null;
  equipment: string | null;
  bodyPart: string | null;
  difficulty: string | null;
  movementPattern: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[] | null;
  safetyNotes: string[] | null;
  category: string | null;
  isBodyweight: boolean;
  isActive: boolean;
  searchPrefixes: string[];
  media: ExerciseMediaMetadata;
};

export type FieldChange<T = unknown> = {
  catalogId: string;
  field: string;
  before: T;
  after: T;
};

export type MediaUrlChange = {
  catalogId: string;
  pose: MediaPose;
  status: "added" | "changed" | "removed" | "unchanged";
  before: string | null;
  after: string | null;
};

export type CatalogRecordPreflightDetail = {
  catalogId: string;
  action: "create" | "update" | "unchanged" | "deactivate";
  fieldChanges: FieldChange[];
  mediaChanges: MediaUrlChange[];
};

export type CatalogSyncPreflightReport = {
  generatedAt: string;
  environment: CatalogSyncEnvironment;
  environmentLabel: string;
  bundle: {
    catalogVersion: string;
    exerciseCount: number;
    validExercises: number;
    sha256OfJson: string;
    manifestPath: string;
    exercisesPath: string;
  };
  firestore: {
    documentCount: number;
    activeCount: number;
    inactiveCount: number;
  };
  plan: {
    wouldCreate: number;
    wouldUpdate: number;
    wouldUnchanged: number;
    wouldDeactivate: number;
  };
  catalogIds: {
    wouldCreate: string[];
    wouldUpdate: string[];
    wouldUnchanged: string[];
    wouldDeactivate: string[];
  };
  changesByField: Record<string, FieldChange[]>;
  classification: {
    muscleGroup: FieldChange<MuscleGroup>[];
    fullBody: FieldChange<boolean>[];
    cardio: FieldChange<boolean>[];
  };
  mediaSummary: {
    added: number;
    changed: number;
    removed: number;
    unchanged: number;
    recordsWithMediaChanges: number;
  };
  records: CatalogRecordPreflightDetail[];
  warnings: string[];
  ok: boolean;
  error?: string;
};

function stableStringArray(values: string[] | null | undefined): string[] {
  if (!values) return [];
  return [...values].sort();
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

function mediaUrl(
  media: ExerciseMediaMetadata,
  pose: MediaPose,
): string | null {
  const raw = media[pose];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

export function compareMediaUrls(
  catalogId: string,
  before: ExerciseMediaMetadata,
  after: ExerciseMediaMetadata,
): MediaUrlChange[] {
  const changes: MediaUrlChange[] = [];
  for (const pose of MEDIA_POSES) {
    const prev = mediaUrl(before, pose);
    const next = mediaUrl(after, pose);
  let status: MediaUrlChange["status"];
    if (prev === next) {
      status = "unchanged";
    } else if (prev == null && next != null) {
      status = "added";
    } else if (prev != null && next == null) {
      status = "removed";
    } else {
      status = "changed";
    }
    changes.push({ catalogId, pose, status, before: prev, after: next });
  }
  return changes;
}

export function plannedComparableContent(
  exercise: ValidatedCatalogExercise,
): ComparableCatalogContent {
  return {
    catalogId: exercise.catalogId,
    catalogVersion: exercise.catalogVersion,
    name: exercise.name,
    nameLower: exercise.nameLower,
    muscleGroup: exercise.muscleGroup,
    fullBody: exercise.fullBody,
    cardio: exercise.cardio,
    description: exercise.description,
    instructions: exercise.instructions,
    tips: exercise.tips,
    equipment: exercise.equipment,
    bodyPart: exercise.bodyPart,
    difficulty: exercise.difficulty,
    movementPattern: exercise.movementPattern,
    primaryMuscles: exercise.primaryMuscles,
    secondaryMuscles: exercise.secondaryMuscles,
    safetyNotes: exercise.safetyNotes,
    category: exercise.category,
    isBodyweight: exercise.isBodyweight,
    isActive: exercise.isActive,
    searchPrefixes: exercise.searchPrefixes,
    media: exercise.media,
  };
}

export function existingComparableContent(
  doc: ExerciseCatalogDoc,
): ComparableCatalogContent {
  const normalized = normalizeExerciseCatalogBrowseTags(doc);
  return {
    catalogId: doc.catalogId,
    catalogVersion: doc.catalogVersion,
    name: doc.name,
    nameLower: doc.nameLower,
    muscleGroup: doc.muscleGroup,
    fullBody: normalized.fullBody,
    cardio: normalized.cardio,
    description: doc.description,
    instructions: doc.instructions ?? [],
    tips: doc.tips,
    equipment: doc.equipment,
    bodyPart: doc.bodyPart,
    difficulty: doc.difficulty,
    movementPattern: doc.movementPattern,
    primaryMuscles: doc.primaryMuscles ?? [],
    secondaryMuscles: doc.secondaryMuscles,
    safetyNotes: doc.safetyNotes,
    category: doc.category,
    isBodyweight: doc.isBodyweight,
    isActive: doc.isActive,
    searchPrefixes: doc.searchPrefixes ?? [],
    media: doc.media,
  };
}

const COMPARABLE_SCALAR_FIELDS = [
  "name",
  "nameLower",
  "catalogVersion",
  "muscleGroup",
  "fullBody",
  "cardio",
  "description",
  "equipment",
  "bodyPart",
  "difficulty",
  "movementPattern",
  "category",
  "isBodyweight",
  "isActive",
] as const satisfies readonly (keyof ComparableCatalogContent)[];

export function diffComparableCatalogContent(
  catalogId: string,
  before: ComparableCatalogContent | null,
  after: ComparableCatalogContent,
): { fieldChanges: FieldChange[]; mediaChanges: MediaUrlChange[] } {
  const fieldChanges: FieldChange[] = [];
  const mediaChanges: MediaUrlChange[] = [];

  if (!before) {
    for (const field of COMPARABLE_SCALAR_FIELDS) {
      fieldChanges.push({
        catalogId,
        field,
        before: null,
        after: after[field],
      });
    }
    for (const field of ["instructions", "tips", "primaryMuscles", "secondaryMuscles", "safetyNotes"] as const) {
      fieldChanges.push({
        catalogId,
        field,
        before: null,
        after: after[field],
      });
    }
    mediaChanges.push(
      ...compareMediaUrls(
        catalogId,
        {
          primaryImageUrl: null,
          secondaryImageUrl: null,
          thumbnailUrl: null,
          animationUrl: null,
          videoUrl: null,
        },
        after.media,
      ).filter((row) => row.status !== "unchanged"),
    );
    return { fieldChanges, mediaChanges };
  }

  for (const field of COMPARABLE_SCALAR_FIELDS) {
    const prev = before[field];
    const next = after[field];
    if (prev !== next) {
      fieldChanges.push({ catalogId, field, before: prev, after: next });
    }
  }

  const arrayFields = [
    "instructions",
    "tips",
    "primaryMuscles",
    "secondaryMuscles",
    "safetyNotes",
    "searchPrefixes",
  ] as const;

  for (const field of arrayFields) {
    const prev = before[field];
    const next = after[field];
    const prevNorm =
      field === "primaryMuscles" ||
      field === "searchPrefixes"
        ? stableStringArray(prev as string[])
        : field === "secondaryMuscles"
          ? stableStringArray(prev as string[] | null)
          : prev;
    const nextNorm =
      field === "primaryMuscles" ||
      field === "searchPrefixes"
        ? stableStringArray(next as string[])
        : field === "secondaryMuscles"
          ? stableStringArray(next as string[] | null)
          : next;
    if (stableJson(prevNorm) !== stableJson(nextNorm)) {
      fieldChanges.push({ catalogId, field, before: prev, after: next });
    }
  }

  if (stableJson(before.media) !== stableJson(after.media)) {
    mediaChanges.push(
      ...compareMediaUrls(catalogId, before.media, after.media).filter(
        (row) => row.status !== "unchanged",
      ),
    );
  }

  return { fieldChanges, mediaChanges };
}

export async function readExerciseCatalogDocuments(
  db: Firestore,
): Promise<Map<string, ExerciseCatalogDoc & { id: string }>> {
  const snap = await db.collection(COLLECTIONS.exerciseCatalog).get();
  const map = new Map<string, ExerciseCatalogDoc & { id: string }>();
  for (const doc of snap.docs) {
    const data = doc.data() as ExerciseCatalogDoc;
    if (doc.id !== data.catalogId) {
      throw new Error(
        `Firestore catalog document id "${doc.id}" does not match catalogId "${data.catalogId}".`,
      );
    }
    map.set(doc.id, { id: doc.id, ...data });
  }
  return map;
}

function groupChangesByField(records: CatalogRecordPreflightDetail[]): Record<string, FieldChange[]> {
  const byField: Record<string, FieldChange[]> = {};
  for (const record of records) {
    if (record.action !== "update" && record.action !== "create") continue;
    for (const change of record.fieldChanges) {
      if (!byField[change.field]) byField[change.field] = [];
      byField[change.field]!.push(change);
    }
  }
  for (const field of Object.keys(byField)) {
    byField[field]!.sort((a, b) => a.catalogId.localeCompare(b.catalogId));
  }
  return byField;
}

function summarizeMedia(records: CatalogRecordPreflightDetail[]): CatalogSyncPreflightReport["mediaSummary"] {
  let added = 0;
  let changed = 0;
  let removed = 0;
  let unchanged = 0;
  let recordsWithMediaChanges = 0;
  for (const record of records) {
    if (record.mediaChanges.length === 0) continue;
    recordsWithMediaChanges += 1;
    for (const row of record.mediaChanges) {
      if (row.status === "added") added += 1;
      else if (row.status === "changed") changed += 1;
      else if (row.status === "removed") removed += 1;
      else unchanged += 1;
    }
  }
  return { added, changed, removed, unchanged, recordsWithMediaChanges };
}

export type RunCatalogSyncPreflightOptions = {
  db: Firestore;
  environment: CatalogSyncEnvironment;
  manifestPath?: string;
  exercisesPath?: string;
  imagesRoot?: string;
};

export async function runCatalogSyncPreflight(
  options: RunCatalogSyncPreflightOptions,
): Promise<CatalogSyncPreflightReport> {
  const bundle = loadCatalogBundleFiles({
    manifestPath: options.manifestPath,
    exercisesPath: options.exercisesPath,
  });
  const validation = validateCatalogBundle(bundle);

  if (!validation.ok) {
    return {
      generatedAt: new Date().toISOString(),
      environment: options.environment,
      environmentLabel: formatCatalogSyncEnvironment(options.environment),
      bundle: {
        catalogVersion: "",
        exerciseCount: Array.isArray(bundle.exercisesRaw)
          ? bundle.exercisesRaw.length
          : 0,
        validExercises: 0,
        sha256OfJson: sha256Hex(bundle.exercisesJson),
        manifestPath: bundle.manifestPath,
        exercisesPath: bundle.exercisesPath,
      },
      firestore: { documentCount: 0, activeCount: 0, inactiveCount: 0 },
      plan: {
        wouldCreate: 0,
        wouldUpdate: 0,
        wouldUnchanged: 0,
        wouldDeactivate: 0,
      },
      catalogIds: {
        wouldCreate: [],
        wouldUpdate: [],
        wouldUnchanged: [],
        wouldDeactivate: [],
      },
      changesByField: {},
      classification: { muscleGroup: [], fullBody: [], cardio: [] },
      mediaSummary: {
        added: 0,
        changed: 0,
        removed: 0,
        unchanged: 0,
        recordsWithMediaChanges: 0,
      },
      records: [],
      warnings: validation.warnings,
      ok: false,
      error: validation.errors.join(" "),
    };
  }

  const imagesRoot = options.imagesRoot ?? CATALOG_IMAGES_DIR;
  const mediaSync = await syncCatalogMediaAssets({
    exercises: validation.exercises,
    imagesRoot,
    uploadMedia: false,
    dryRun: true,
  });

  const existingDocs = await readExerciseCatalogDocuments(options.db);
  const existingSnapshots: ExistingCatalogSnapshot[] = [];
  for (const doc of existingDocs.values()) {
    existingSnapshots.push(existingSnapshotFromCatalogDoc(doc));
  }

  const plan = computeCatalogSyncPlan(mediaSync.exercises, existingSnapshots);
  const plannedById = new Map(
    mediaSync.exercises.map((row) => [row.catalogId, row]),
  );

  const records: CatalogRecordPreflightDetail[] = [];

  for (const item of plan.items) {
    if (item.action === "deactivate") {
      records.push({
        catalogId: item.catalogId,
        action: "deactivate",
        fieldChanges: [],
        mediaChanges: [],
      });
      continue;
    }

    const planned = plannedById.get(item.catalogId);
    if (!planned) continue;
    const after = plannedComparableContent(planned);
    const existing = existingDocs.get(item.catalogId);
    const before = existing ? existingComparableContent(existing) : null;

    const { fieldChanges, mediaChanges } = diffComparableCatalogContent(
      item.catalogId,
      item.action === "create" ? null : before,
      after,
    );

    records.push({
      catalogId: item.catalogId,
      action: item.action,
      fieldChanges:
        item.action === "unchanged"
          ? []
          : fieldChanges,
      mediaChanges:
        item.action === "unchanged" ? [] : mediaChanges,
    });
  }

  records.sort((a, b) => a.catalogId.localeCompare(b.catalogId));

  const changesByField = groupChangesByField(records);
  const classification = {
    muscleGroup: (changesByField.muscleGroup ?? []) as FieldChange<MuscleGroup>[],
    fullBody: (changesByField.fullBody ?? []) as FieldChange<boolean>[],
    cardio: (changesByField.cardio ?? []) as FieldChange<boolean>[],
  };

  let activeCount = 0;
  let inactiveCount = 0;
  for (const doc of existingDocs.values()) {
    if (doc.isActive) activeCount += 1;
    else inactiveCount += 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    environment: {
      projectId: options.environment.projectId,
      firestoreEmulatorHost: options.environment.firestoreEmulatorHost,
      isEmulator: options.environment.isEmulator,
      allowProduction: options.environment.allowProduction,
    },
    environmentLabel: formatCatalogSyncEnvironment(options.environment),
    bundle: {
      catalogVersion: validation.manifest.catalogVersion,
      exerciseCount: validation.manifest.exerciseCount,
      validExercises: validation.exercises.length,
      sha256OfJson: sha256Hex(bundle.exercisesJson),
      manifestPath: bundle.manifestPath,
      exercisesPath: bundle.exercisesPath,
    },
    firestore: {
      documentCount: existingDocs.size,
      activeCount,
      inactiveCount,
    },
    plan: {
      wouldCreate: plan.wouldCreate,
      wouldUpdate: plan.wouldUpdate,
      wouldUnchanged: plan.unchanged,
      wouldDeactivate: plan.wouldDeactivate,
    },
    catalogIds: {
      wouldCreate: plan.items
        .filter((i) => i.action === "create")
        .map((i) => i.catalogId),
      wouldUpdate: plan.items
        .filter((i) => i.action === "update")
        .map((i) => i.catalogId),
      wouldUnchanged: plan.items
        .filter((i) => i.action === "unchanged")
        .map((i) => i.catalogId),
      wouldDeactivate: plan.items
        .filter((i) => i.action === "deactivate")
        .map((i) => i.catalogId),
    },
    changesByField,
    classification,
    mediaSummary: summarizeMedia(records),
    records,
    warnings: validation.warnings,
    ok: true,
  };
}

export function formatCatalogSyncPreflightSummary(
  report: CatalogSyncPreflightReport,
): string {
  const lines = [
    "Catalog sync preflight (read-only)",
    "==================================",
    report.ok ? "Status: OK" : `Status: FAILED — ${report.error ?? "unknown"}`,
    "",
    report.environmentLabel,
    "",
    `Local bundle: ${report.bundle.validExercises} valid / ${report.bundle.exerciseCount} manifest (${report.bundle.catalogVersion})`,
    `Firestore exerciseCatalog: ${report.firestore.documentCount} docs (${report.firestore.activeCount} active, ${report.firestore.inactiveCount} inactive)`,
    "",
    "Planned sync actions",
    `  Would create:      ${report.plan.wouldCreate}`,
    `  Would update:      ${report.plan.wouldUpdate}`,
    `  Unchanged:         ${report.plan.wouldUnchanged}`,
    `  Would deactivate:  ${report.plan.wouldDeactivate}`,
    "",
    "Classification field changes (update/create)",
    `  muscleGroup: ${report.classification.muscleGroup.length}`,
    `  fullBody:    ${report.classification.fullBody.length}`,
    `  cardio:      ${report.classification.cardio.length}`,
    "",
    "Media URL delta (non-unchanged poses)",
    `  Records with media changes: ${report.mediaSummary.recordsWithMediaChanges}`,
    `  Added:    ${report.mediaSummary.added}`,
    `  Changed:  ${report.mediaSummary.changed}`,
    `  Removed:  ${report.mediaSummary.removed}`,
  ];
  return lines.join("\n");
}

export function writeCatalogSyncPreflightReport(
  report: CatalogSyncPreflightReport,
  outputPath: string = DEFAULT_PREFLIGHT_REPORT_PATH,
): void {
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}