import { Timestamp } from "firebase-admin/firestore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getMemberWorkoutPlanDetail } from "@/lib/workout-plans";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { CustomExerciseDoc, WorkoutPlanDoc } from "@/lib/firestore/types";
import {
  resolveDemonstrationImageUrl,
  resolveSecondaryDemonstrationImageUrl,
} from "@/lib/exercises/media-validation";
import {
  EMPTY_MEMBER_EXERCISE_MEDIA,
  loadMemberExerciseMediaByIds,
  resolveMemberExerciseMedia,
} from "@/lib/workout-tracking/member-exercise-media";
import { getActiveWorkoutSession } from "@/lib/workout-tracking/sessions";
import { logWorkoutSetRecord } from "@/lib/firestore/workout-session-operations";

const PUBLIC_BASE =
  "https://example.supabase.co/storage/v1/object/public/gym-assets";

const GYM_A = "gym-a";
const GYM_B = "gym-b";
const MEMBER_ID = "member-1";

const mockWorkoutPlans = {
  findByMemberId: vi.fn(),
  getById: vi.fn(),
};

const mockWorkoutSessions = {
  findActiveSession: vi.fn(),
  upsertSetLogInTransaction: vi.fn(),
};

const mockCustomExercises = {
  getByIds: vi.fn(),
};

vi.mock("@/lib/firebase/admin", () => ({
  getFirestoreDb: vi.fn(() => ({
    runTransaction: vi.fn(async (callback: (tx: unknown) => Promise<void>) =>
      callback({}),
    ),
  })),
}));

vi.mock("@/lib/firestore", () => ({
  getRepositories: () => ({
    workoutPlans: mockWorkoutPlans,
    workoutSessions: mockWorkoutSessions,
    customExercises: mockCustomExercises,
  }),
  platformContext: { kind: "platform" },
}));

beforeEach(() => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_STORAGE_BUCKET = "gym-assets";
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_STORAGE_BUCKET;
});

function gymUrl(
  gymId: string,
  exerciseId: string,
  pose: "primary" | "secondary" | "thumbnail",
) {
  return `${PUBLIC_BASE}/gyms/${gymId}/exercises/${exerciseId}/${pose}.webp`;
}

function catalogUrl(catalogId: string, pose: "primary" | "secondary") {
  return `${PUBLIC_BASE}/catalog/${catalogId}/${pose}.webp`;
}

function exerciseDoc(
  overrides: Partial<CustomExerciseDoc> & {
    id: string;
    gymId?: string;
  },
): DocWithId<CustomExerciseDoc> {
  const now = Timestamp.fromDate(new Date("2026-09-20T00:00:00.000Z"));
  return {
    id: overrides.id,
    gymId: overrides.gymId ?? GYM_A,
    name: overrides.name ?? "Exercise",
    nameLower: (overrides.name ?? "Exercise").toLowerCase(),
    muscleGroup: overrides.muscleGroup ?? "CHEST",
    defaultSets: 3,
    defaultReps: "8",
    defaultTempo: null,
    defaultRestSeconds: 90,
    trackingType: "WEIGHTED",
    isSeeded: overrides.isSeeded ?? false,
    exerciseSource: overrides.exerciseSource ?? "CUSTOM",
    catalogId: overrides.catalogId ?? null,
    importedCatalogVersion: overrides.importedCatalogVersion ?? null,
    media: overrides.media ?? {
      primaryImageUrl: null,
      secondaryImageUrl: null,
      thumbnailUrl: null,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function samplePlan(): WorkoutPlanDoc & { id: string } {
  return {
    id: "plan-1",
    gymId: GYM_A,
    memberId: MEMBER_ID,
    memberName: "Alice",
    title: "Strength plan",
    durationWeeks: 8,
    focusGoal: null,
    level: null,
    weeklySchedule: null,
    days: [
      {
        id: "day-1",
        label: "Day 1",
        sortOrder: 0,
        exercises: [
          {
            id: "row-a",
            exerciseId: "ex-custom",
            customName: null,
            sortOrder: 0,
            targetSets: 3,
            targetReps: "8",
            tempo: null,
            restSeconds: 90,
            targetWeightKg: 60,
            trackingTypeOverride: null,
          },
          {
            id: "row-b",
            exerciseId: "ex-catalog",
            customName: null,
            sortOrder: 1,
            targetSets: 3,
            targetReps: "10",
            tempo: null,
            restSeconds: 60,
            targetWeightKg: null,
            trackingTypeOverride: null,
          },
          {
            id: "row-c",
            exerciseId: null,
            customName: "Band finisher",
            sortOrder: 2,
            targetSets: 2,
            targetReps: "15",
            tempo: null,
            restSeconds: 45,
            targetWeightKg: null,
            trackingTypeOverride: null,
          },
        ],
      },
    ],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
}

describe("loadMemberExerciseMediaByIds", () => {
  it("returns sanitized custom gym exercise media for authorized gym reads", async () => {
    mockCustomExercises.getByIds.mockResolvedValue([
      exerciseDoc({
        id: "ex-custom",
        media: {
          primaryImageUrl: gymUrl(GYM_A, "ex-custom", "primary"),
          secondaryImageUrl: gymUrl(GYM_A, "ex-custom", "secondary"),
          thumbnailUrl: null,
        },
      }),
    ]);

    const mediaById = await loadMemberExerciseMediaByIds(GYM_A, ["ex-custom"]);
    const entry = mediaById.get("ex-custom");

    expect(entry?.hasMedia).toBe(true);
    expect(resolveDemonstrationImageUrl(entry?.media)).toContain("ex-custom/primary");
  });

  it("returns sanitized catalog exercise media for imported library exercises", async () => {
    mockCustomExercises.getByIds.mockResolvedValue([
      exerciseDoc({
        id: "ex-catalog",
        exerciseSource: "CATALOG",
        catalogId: "dev-push-up",
        media: {
          primaryImageUrl: catalogUrl("dev-push-up", "primary"),
          secondaryImageUrl: catalogUrl("dev-push-up", "secondary"),
          thumbnailUrl: null,
        },
      }),
    ]);

    const mediaById = await loadMemberExerciseMediaByIds(GYM_A, ["ex-catalog"]);
    const entry = mediaById.get("ex-catalog");

    expect(entry?.hasMedia).toBe(true);
    expect(resolveDemonstrationImageUrl(entry?.media)).toContain("/catalog/dev-push-up/");
  });

  it("rejects cross-gym media URLs during read-time sanitization", async () => {
    mockCustomExercises.getByIds.mockResolvedValue([
      exerciseDoc({
        id: "ex-custom",
        media: {
          primaryImageUrl: gymUrl(GYM_B, "ex-custom", "primary"),
          secondaryImageUrl: null,
          thumbnailUrl: null,
        },
      }),
    ]);

    const mediaById = await loadMemberExerciseMediaByIds(GYM_A, ["ex-custom"]);
    const entry = mediaById.get("ex-custom");

    expect(entry?.hasMedia).toBe(false);
    expect(resolveDemonstrationImageUrl(entry?.media)).toBeNull();
  });

  it("sanitizes external and invalid media safely", async () => {
    mockCustomExercises.getByIds.mockResolvedValue([
      exerciseDoc({
        id: "ex-custom",
        media: {
          primaryImageUrl: "https://evil.example/photo.jpg",
          secondaryImageUrl: "//bad.example/x.webp",
          thumbnailUrl: null,
        },
      }),
    ]);

    const mediaById = await loadMemberExerciseMediaByIds(GYM_A, ["ex-custom"]);
    const entry = mediaById.get("ex-custom");

    expect(entry?.hasMedia).toBe(false);
    expect(entry?.media.primaryImageUrl).toBeNull();
    expect(entry?.media.secondaryImageUrl).toBeNull();
  });

  it("uses primary image when valid and secondary as fallback", async () => {
    mockCustomExercises.getByIds.mockResolvedValue([
      exerciseDoc({
        id: "ex-primary",
        media: {
          primaryImageUrl: gymUrl(GYM_A, "ex-primary", "primary"),
          secondaryImageUrl: gymUrl(GYM_A, "ex-primary", "secondary"),
          thumbnailUrl: null,
        },
      }),
      exerciseDoc({
        id: "ex-secondary",
        media: {
          primaryImageUrl: "https://evil.example/photo.jpg",
          secondaryImageUrl: gymUrl(GYM_A, "ex-secondary", "secondary"),
          thumbnailUrl: null,
        },
      }),
    ]);

    const mediaById = await loadMemberExerciseMediaByIds(GYM_A, [
      "ex-primary",
      "ex-secondary",
    ]);

    expect(resolveDemonstrationImageUrl(mediaById.get("ex-primary")?.media)).toContain(
      "primary.webp",
    );
    expect(resolveDemonstrationImageUrl(mediaById.get("ex-secondary")?.media)).toContain(
      "secondary.webp",
    );
    expect(
      resolveSecondaryDemonstrationImageUrl(
        mediaById.get("ex-primary")?.media,
        gymUrl(GYM_A, "ex-primary", "primary"),
      ),
    ).toContain("secondary.webp");
  });

  it("returns empty media for missing exercises and custom-name rows", () => {
    expect(resolveMemberExerciseMedia(null, new Map())).toEqual(
      EMPTY_MEMBER_EXERCISE_MEDIA,
    );
    expect(resolveMemberExerciseMedia("missing", new Map())).toEqual(
      EMPTY_MEMBER_EXERCISE_MEDIA,
    );
  });
});

describe("getMemberWorkoutPlanDetail member media", () => {
  it("includes sanitized media on library exercises for the assigned member plan", async () => {
    mockWorkoutPlans.findByMemberId.mockResolvedValue(samplePlan());
    mockCustomExercises.getByIds.mockResolvedValue([
      exerciseDoc({
        id: "ex-custom",
        media: {
          primaryImageUrl: gymUrl(GYM_A, "ex-custom", "primary"),
          secondaryImageUrl: null,
          thumbnailUrl: null,
        },
      }),
      exerciseDoc({
        id: "ex-catalog",
        exerciseSource: "CATALOG",
        catalogId: "dev-push-up",
        media: {
          primaryImageUrl: catalogUrl("dev-push-up", "primary"),
          secondaryImageUrl: null,
          thumbnailUrl: null,
        },
      }),
    ]);

    const plan = await getMemberWorkoutPlanDetail(GYM_A, MEMBER_ID);
    const custom = plan?.days[0]?.exercises.find((row) => row.id === "row-a");
    const catalog = plan?.days[0]?.exercises.find((row) => row.id === "row-b");
    const customName = plan?.days[0]?.exercises.find((row) => row.id === "row-c");

    expect(custom?.hasMedia).toBe(true);
    expect(catalog?.hasMedia).toBe(true);
    expect(customName?.hasMedia).toBe(false);
    expect(customName?.media).toBeTruthy();
    expect(mockCustomExercises.getByIds).toHaveBeenCalledWith(
      { kind: "platform" },
      GYM_A,
      expect.arrayContaining(["ex-custom", "ex-catalog"]),
    );
  });

  it("does not expose media for plans outside the member lookup", async () => {
    mockWorkoutPlans.findByMemberId.mockResolvedValue(null);

    const plan = await getMemberWorkoutPlanDetail(GYM_A, "member-other");
    expect(plan).toBeNull();
    expect(mockCustomExercises.getByIds).not.toHaveBeenCalled();
  });
});

describe("getActiveWorkoutSession member media", () => {
  it("hydrates sanitized media on active session exercises", async () => {
    mockWorkoutSessions.findActiveSession.mockResolvedValue({
      id: "session-1",
      gymId: GYM_A,
      memberId: MEMBER_ID,
      workoutPlanId: "plan-1",
      startedAt: Timestamp.now(),
      durationSeconds: null,
      status: "IN_PROGRESS",
      exercises: [
        {
          id: "sess-ex-a",
          workoutPlanExerciseId: "row-a",
          sortOrder: 0,
          exerciseId: "ex-custom",
          customName: null,
          trackingTypeOverride: null,
          targetReps: "8",
          sets: [],
        },
      ],
    });
    mockWorkoutPlans.getById.mockResolvedValue(samplePlan());
    mockCustomExercises.getByIds.mockResolvedValue([
      exerciseDoc({
        id: "ex-custom",
        media: {
          primaryImageUrl: gymUrl(GYM_A, "ex-custom", "primary"),
          secondaryImageUrl: null,
          thumbnailUrl: null,
        },
      }),
      exerciseDoc({
        id: "ex-catalog",
        exerciseSource: "CATALOG",
        catalogId: "dev-push-up",
        media: {
          primaryImageUrl: catalogUrl("dev-push-up", "primary"),
          secondaryImageUrl: null,
          thumbnailUrl: null,
        },
      }),
    ]);

    const active = await getActiveWorkoutSession(GYM_A, MEMBER_ID);
    expect(active?.exercises[0]?.hasMedia).toBe(true);
    expect(resolveDemonstrationImageUrl(active?.exercises[0]?.media)).toContain(
      "ex-custom/primary",
    );
  });
});

describe("member workout tracking compatibility", () => {
  it("keeps set logging behavior unchanged after media hydration", async () => {
    mockWorkoutSessions.findActiveSession.mockResolvedValue({
      id: "session-1",
      gymId: GYM_A,
      memberId: MEMBER_ID,
      workoutPlanId: "plan-1",
      startedAt: Timestamp.now(),
      durationSeconds: null,
      status: "IN_PROGRESS",
      exercises: [
        {
          id: "sess-ex-a",
          workoutPlanExerciseId: "row-a",
          sortOrder: 0,
          exerciseId: "ex-custom",
          customName: null,
          trackingTypeOverride: null,
          targetReps: "8",
          sets: [],
        },
      ],
    });
    mockWorkoutPlans.getById.mockResolvedValue(samplePlan());
    mockCustomExercises.getByIds.mockResolvedValue([
      exerciseDoc({
        id: "ex-custom",
        media: {
          primaryImageUrl: gymUrl(GYM_A, "ex-custom", "primary"),
          secondaryImageUrl: null,
          thumbnailUrl: null,
        },
      }),
    ]);

    const result = await logWorkoutSetRecord(
      { kind: "member", gymId: GYM_A, memberId: MEMBER_ID },
      {
        sessionExerciseId: "sess-ex-a",
        setNumber: 1,
        weightKg: 80,
      },
    );

    expect(result.set.weightKg).toBe(80);
    expect(mockWorkoutSessions.upsertSetLogInTransaction).toHaveBeenCalled();
  });
});

describe("member demonstration dialog layout contract", () => {
  it("uses overflow-safe dialog and media container classes", async () => {
    const component = await import(
      "@/components/member-portal/workout/member-exercise-demonstration-dialog"
    );
    expect(component.MemberExerciseDemonstrationDialog).toBeTypeOf("function");

    const source = await import(
      "node:fs/promises"
    ).then((fs) =>
      fs.readFile(
        "src/components/member-portal/workout/member-exercise-demonstration-dialog.tsx",
        "utf8",
      ),
    );

    expect(source).toContain("max-h-[90vh]");
    expect(source).toContain("overflow-hidden");
    expect(source).toContain("max-w-full");
    expect(source).toContain("w-[calc(100%-2rem)]");
  });
});
