import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createExercise, updateExerciseDefaults } from "@/app/actions/exercises";
import {
  getSafeYouTubeWatchUrl,
  parseOptionalYouTubeUrl,
  validateYouTubeVideoUrl,
} from "@/lib/exercises/youtube-url";

const { requireGym, findByNameLower, createExerciseRepo, getById, updateExerciseDefaultsRepo } =
  vi.hoisted(() => ({
    requireGym: vi.fn(),
    findByNameLower: vi.fn(),
    createExerciseRepo: vi.fn(),
    getById: vi.fn(),
    updateExerciseDefaultsRepo: vi.fn(),
  }));

vi.mock("@/lib/session", () => ({ requireGym }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/firestore", () => ({
  getRepositories: () => ({
    customExercises: {
      findByNameLower,
      createExercise: createExerciseRepo,
      getById,
      updateExerciseDefaults: updateExerciseDefaultsRepo,
    },
  }),
  platformContext: { kind: "platform" },
  newDocId: () => "ex-new",
}));

describe("YouTube URL validation", () => {
  it("accepts youtube.com/watch URLs and normalizes them", () => {
    const result = validateYouTubeVideoUrl(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.normalizedUrl).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    expect(result.videoId).toBe("dQw4w9WgXcQ");
  });

  it("accepts youtu.be URLs and normalizes them", () => {
    const result = validateYouTubeVideoUrl("https://youtu.be/dQw4w9WgXcQ");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.normalizedUrl).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
  });

  it("rejects invalid URLs", () => {
    expect(validateYouTubeVideoUrl("https://example.com/video").ok).toBe(false);
    expect(validateYouTubeVideoUrl("<script>alert(1)</script>").ok).toBe(false);
    expect(validateYouTubeVideoUrl("https://www.youtube.com/watch").ok).toBe(false);
  });

  it("allows empty optional field", () => {
    const empty = parseOptionalYouTubeUrl("");
    expect(empty.ok).toBe(true);
    if (!empty.ok || empty.normalizedUrl !== null) {
      expect(empty).toEqual({ ok: true, normalizedUrl: null });
    }
    expect(parseOptionalYouTubeUrl(undefined).ok).toBe(true);
  });
});

describe("exercise actions persist validated YouTube URLs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireGym.mockResolvedValue({
      id: "staff-1",
      gymId: "gym-a",
      role: "OWNER",
    });
    findByNameLower.mockResolvedValue(null);
    createExerciseRepo.mockResolvedValue({});
    getById.mockResolvedValue({
      id: "ex-1",
      gymId: "gym-a",
      isSeeded: false,
      exerciseSource: "CUSTOM",
      trackingType: "WEIGHTED",
    });
    updateExerciseDefaultsRepo.mockResolvedValue({});
  });

  it("stores normalized URL on create when provided", async () => {
    const form = new FormData();
    form.set("name", "Cable Fly");
    form.set("muscleGroup", "CHEST");
    form.set("youtubeUrl", "https://youtu.be/dQw4w9WgXcQ");

    const result = await createExercise(undefined, form);
    expect(result.ok).toBe(true);
    expect(createExerciseRepo).toHaveBeenCalledWith(
      expect.anything(),
      "gym-a",
      "ex-new",
      expect.objectContaining({
        youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      }),
    );
  });

  it("rejects invalid URL on update", async () => {
    const result = await updateExerciseDefaults({
      id: "ex-1",
      youtubeUrl: "https://not-youtube.test/watch?v=dQw4w9WgXcQ",
    });
    expect(result.ok).toBe(false);
    expect(updateExerciseDefaultsRepo).not.toHaveBeenCalled();
  });
});

describe("member Watch Demo display", () => {
  it("renders nothing when URL is missing or unsafe", async () => {
    const mod = await import(
      "@/components/member-portal/workout/member-exercise-watch-demo-link"
    );
    expect(mod.MemberExerciseWatchDemoLink({ youtubeUrl: null })).toBeNull();
    expect(mod.MemberExerciseWatchDemoLink({ youtubeUrl: "" })).toBeNull();
    expect(
      mod.MemberExerciseWatchDemoLink({
        youtubeUrl: "https://evil.test/embed/x",
      }),
    ).toBeNull();
  });

  it("only exposes Watch Demo in member UI when a URL prop is passed", () => {
    const planView = readFileSync(
      resolve("src/components/member-portal/member-workout-plan-view.tsx"),
      "utf8",
    );
    expect(planView).toContain("MemberExerciseWatchDemoLink");
    expect(planView).toContain("exercise.youtubeUrl ?");
    expect(planView).not.toMatch(/Watch Demo[\s\S]*hasMedia/);

    const linkSource = readFileSync(
      resolve(
        "src/components/member-portal/workout/member-exercise-watch-demo-link.tsx",
      ),
      "utf8",
    );
    expect(linkSource).toContain('rel="noopener noreferrer"');
    expect(linkSource).toContain("getSafeYouTubeWatchUrl");
    expect(linkSource).not.toContain("<iframe");
    expect(getSafeYouTubeWatchUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
  });
});
