import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const browseMemberExerciseLibraryAction = vi.fn();

vi.mock("@/app/actions/member-exercise-library", () => ({
  browseMemberExerciseLibraryAction: (...args: unknown[]) =>
    browseMemberExerciseLibraryAction(...args),
}));

vi.mock("@/app/actions/member-personal-workouts", () => ({
  addExercisesToPersonalWorkoutAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { MemberExerciseLibraryPanel } from "@/components/member-portal/workout/member-exercise-library-panel";
import { CHEST_MUSCLE_REGION_CONFIG } from "@/lib/member-portal/chest-muscle-regions";

describe("MemberExerciseLibraryPanel library views", () => {
  beforeEach(() => {
    browseMemberExerciseLibraryAction.mockReset();
    browseMemberExerciseLibraryAction.mockResolvedValue({
      ok: true,
      data: { items: [], nextCursor: null, hasMore: false },
    });
  });

  it("renders back regions when Back is selected (direct load)", () => {
    const html = renderToStaticMarkup(
      <MemberExerciseLibraryPanel initialGroup="BACK" />,
    );
    expect(html).toContain("Lats");
    expect(html).toContain("Spinal Erectors");
    expect(html).toContain("Trapezius");
    const overview = html.split('data-member-region-card="')[0] ?? "";
    expect(overview).toContain("/images/muscle-groups/back.png");
    for (const regionImage of [
      "lats.png",
      "upper-trapezius.png",
      "lower-trapezius.png",
      "spinal-erectors.png",
      "teres-major.png",
    ]) {
      expect(overview).not.toContain(regionImage);
    }
    const cards = [
      ...html.matchAll(
        /data-member-region-card="([^"]+)"([\s\S]*?)(?=data-member-region-card=|Browse all)/g,
      ),
    ];
    expect(cards.map((match) => match[1])).toEqual([
      "lats",
      "spinal-erectors",
      "trapezius",
    ]);
    const cardImages: Record<string, string> = {
      lats: "/images/muscle-groups/regions/back/lats.png",
      "spinal-erectors": "/images/muscle-groups/regions/back/spinal-erectors.png",
      trapezius: "/images/muscle-groups/regions/back/upper-trapezius.png",
    };
    for (const match of cards) {
      const body = match[2] ?? "";
      const images = body.match(/<img\b/g) ?? [];
      expect(images).toHaveLength(1);
      expect(body).toContain(cardImages[match[1]!]!);
    }
    expect(html).not.toContain("lower-trapezius.png");
    expect(html).not.toContain("teres-major.png");
  });

  it("renders chest regions when Chest is selected (direct load)", () => {
    const html = renderToStaticMarkup(
      <MemberExerciseLibraryPanel initialGroup="CHEST" />,
    );
    expect(html).toContain("Upper Chest");
    expect(html).toContain("Mid Chest");
    expect(html).toContain("Lower Chest");
    expect(html).not.toContain("Press &amp; fly movements");
    for (const region of CHEST_MUSCLE_REGION_CONFIG) {
      expect(html).toContain(region.imageSrc);
    }
  });

  it("renders the muscle group grid on the library home", () => {
    const html = renderToStaticMarkup(<MemberExerciseLibraryPanel />);
    expect(html).toContain("Exercise library");
    expect(html).toContain("Full Body");
    expect(html).not.toContain("Upper Chest");
  });

  it("renders arm regions when Arms is selected", () => {
    const html = renderToStaticMarkup(
      <MemberExerciseLibraryPanel initialGroup="ARMS" />,
    );
    expect(html).toContain("Biceps");
    expect(html).toContain("Brachialis");
    expect(html).toContain("Triceps");
    expect(html).toContain("Brachioradialis");
    expect(html).toContain("/images/muscle-groups/regions/Arms/Biceps.jpeg");
    expect(html).toContain("/images/muscle-groups/regions/Arms/tricep.jpeg");
  });

  it("renders leg regions when Legs is selected", () => {
    const html = renderToStaticMarkup(
      <MemberExerciseLibraryPanel initialGroup="LEGS" />,
    );
    expect(html).toContain("Quadriceps");
    expect(html).toContain("Hamstrings");
    expect(html).toContain("Glutes");
    expect(html).toContain("Calves");
    expect(html).toContain("/images/muscle-groups/regions/legs/Quadriceps.jpeg");
    expect(html).toContain("/images/muscle-groups/regions/legs/hamstrings.jpeg");
    expect(html).toContain("/images/muscle-groups/regions/legs/Glutes.jpeg");
    expect(html).toContain("/images/muscle-groups/regions/legs/Calves.jpeg");
    expect(html).toContain("Browse all leg exercises");
  });

  it("renders core regions when Core is selected", () => {
    const html = renderToStaticMarkup(
      <MemberExerciseLibraryPanel initialGroup="CORE" />,
    );
    const overview = html.split('data-member-region-card="')[0] ?? "";
    expect(overview).toContain(
      "/images/muscle-groups/regions/core/gymdesk-core.webp",
    );
    expect(overview).not.toContain("gymdesk-cardio");
    expect(html).toContain("Front Abs");
    expect(html).toContain("Side Abs");
    expect(html).toContain("Deep Core");
    expect(html).toContain("Lower Back");
    expect(html).toContain("/images/muscle-groups/regions/core/front%20Abs.jpeg");
    expect(html).toContain("/images/muscle-groups/regions/core/side%20Abs.jpeg");
    expect(html).toContain("/images/muscle-groups/regions/core/Deep%20core.jpeg");
    expect(html).toContain("/images/muscle-groups/regions/core/lower%20back.jpeg");
    expect(html).toContain("Browse all core exercises");
  });

  it("renders an exercise list when a chest region is selected", () => {
    const html = renderToStaticMarkup(
      <MemberExerciseLibraryPanel
        initialGroup="CHEST"
        initialChestRegion="UPPER"
      />,
    );
    expect(html).toContain("Upper Chest");
    expect(html).not.toContain("Mid Chest");
    expect(html).toContain("Filter in this list");
  });
});
