import type {
  ExerciseDifficulty,
  ExerciseMediaMetadata,
  ExerciseProvider,
  ExerciseProviderMetadata,
} from "@/lib/exercises/catalog-types";
import type { MuscleGroup } from "@/lib/muscle-groups";

/** Change-control manifest committed alongside bundled catalog JSON. */
export type CatalogManifest = {
  catalogVersion: string;
  provider: ExerciseProvider;
  exerciseCount: number;
  sha256OfJson: string;
  syncedAt: string | null;
};

/** One exercise row in `data/catalog/exercises.json` (pre-sync input). */
export type CatalogExerciseInput = {
  catalogId: string;
  name: string;
  muscleGroup: MuscleGroup;
  description?: string | null;
  instructions: string[];
  tips?: string[] | null;
  equipment?: string | null;
  bodyPart?: string | null;
  difficulty?: ExerciseDifficulty | null;
  movementPattern?: string | null;
  primaryMuscles?: string[];
  secondaryMuscles?: string[] | null;
  safetyNotes?: string[] | null;
  category?: string | null;
  isBodyweight?: boolean;
  media?: Partial<ExerciseMediaMetadata> | null;
  /** Optional local image filenames under `data/catalog/images/{catalogId}/`. */
  mediaAssets?: Partial<
    Record<"primary" | "secondary" | "thumbnail", string>
  > | null;
  provider?: Partial<ExerciseProviderMetadata> | null;
  isActive?: boolean;
};

/** Validated exercise ready to map into Firestore `ExerciseCatalogDoc` fields. */
export type ValidatedCatalogExercise = {
  catalogId: string;
  name: string;
  nameLower: string;
  muscleGroup: MuscleGroup;
  description: string | null;
  instructions: string[];
  tips: string[] | null;
  equipment: string | null;
  bodyPart: string | null;
  difficulty: ExerciseDifficulty | null;
  movementPattern: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[] | null;
  safetyNotes: string[] | null;
  category: string | null;
  isBodyweight: boolean;
  media: ExerciseMediaMetadata;
  /** Sync-only local asset filenames; omitted from Firestore writes. */
  mediaAssets?: Partial<
    Record<"primary" | "secondary" | "thumbnail", string>
  > | null;
  provider: ExerciseProviderMetadata;
  catalogVersion: string;
  searchPrefixes: string[];
  isActive: boolean;
};

export type CatalogSyncStatus = "complete" | "partial" | "pending";

export type CatalogSyncFailurePhase =
  | "manifest"
  | "validation"
  | "media"
  | "firestore";

export type CatalogSyncFailureRecord = {
  catalogId: string | null;
  phase: CatalogSyncFailurePhase;
  message: string;
};

/** Platform metadata written to `catalogSyncMeta/active` after a successful sync. */
export type CatalogSyncMetaDoc = {
  catalogVersion: string;
  exerciseCount: number;
  jsonSha256: string;
  mediaObjectCount: number;
  syncedAt: string;
  status: CatalogSyncStatus;
  lastRun: {
    dryRun: boolean;
    startedAt: string;
    finishedAt: string;
    created: number;
    updated: number;
    deactivated: number;
    unchanged: number;
    failures: CatalogSyncFailureRecord[];
    warnings: string[];
    scriptVersion: string;
  };
};

export type CatalogSyncPlanAction = "create" | "update" | "deactivate" | "unchanged";

export type CatalogSyncPlanItem = {
  catalogId: string;
  action: CatalogSyncPlanAction;
  warnings: string[];
};

export type CatalogSyncPlan = {
  items: CatalogSyncPlanItem[];
  wouldCreate: number;
  wouldUpdate: number;
  wouldDeactivate: number;
  unchanged: number;
};

export type CatalogBundleValidationSuccess = {
  ok: true;
  manifest: CatalogManifest;
  exercises: ValidatedCatalogExercise[];
  warnings: string[];
};

export type CatalogBundleValidationFailure = {
  ok: false;
  errors: string[];
  warnings: string[];
  failures: CatalogSyncFailureRecord[];
};

export type CatalogBundleValidationResult =
  | CatalogBundleValidationSuccess
  | CatalogBundleValidationFailure;

export type CatalogSyncReport = {
  dryRun: boolean;
  catalogVersion: string | null;
  totalInputExercises: number;
  validExercises: number;
  invalidExercises: number;
  duplicateCatalogIds: string[];
  duplicateNameLowers: string[];
  wouldCreate: number;
  wouldUpdate: number;
  wouldDeactivate: number;
  unchanged: number;
  /** Populated after a successful write run. */
  appliedCreate?: number;
  appliedUpdate?: number;
  appliedDeactivate?: number;
  syncCompleted?: boolean;
  environment?: string;
  batchesProcessed: number;
  mediaObjectCount?: number;
  mediaUploaded?: number;
  mediaSkipped?: number;
  errors: string[];
  warnings: string[];
  failures: CatalogSyncFailureRecord[];
};
