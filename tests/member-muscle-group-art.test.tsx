import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { MemberMuscleGroupArt } from "@/components/member-portal/workout/member-muscle-group-art";
import {
  MEMBER_LIBRARY_MUSCLE_FILTERS,
  MEMBER_LIBRARY_MUSCLE_GROUPS,
} from "@/lib/member-portal/member-library-muscle-groups";
import { MEMBER_MUSCLE_GROUP_IMAGE_SRC } from "@/lib/member-portal/member-muscle-group-images";

describe("MemberMuscleGroupArt", () => {
  it("defines eight library muscle groups", () => {
    expect(MEMBER_LIBRARY_MUSCLE_GROUPS).toHaveLength(8);
    expect(MEMBER_LIBRARY_MUSCLE_FILTERS).toEqual([
      "CHEST",
      "BACK",
      "SHOULDERS",
      "ARMS",
      "LEGS",
      "CORE",
      "FULL_BODY",
      "CARDIO",
    ]);
  });

  it("renders local muscle-group PNG when artwork exists", () => {
    for (const group of MEMBER_LIBRARY_MUSCLE_FILTERS) {
      const html = renderToStaticMarkup(
        <MemberMuscleGroupArt group={group} />,
      );
      expect(html).toContain("member-muscle-group-art");
      const src = MEMBER_MUSCLE_GROUP_IMAGE_SRC[group];
      if (src) {
        expect(html).toContain(src);
        expect(html).toContain("<img");
      } else {
        expect(html).not.toContain("<img");
        expect(html).toContain("member-muscle-group-art--icon");
      }
    }
  });

  it("maps core and cardio to supplied region artwork", () => {
    expect(MEMBER_MUSCLE_GROUP_IMAGE_SRC.CORE).toBe(
      "/images/muscle-groups/regions/core/gymdesk-core.webp",
    );
    expect(MEMBER_MUSCLE_GROUP_IMAGE_SRC.CARDIO).toBe(
      "/images/muscle-groups/regions/cardio/gymdesk-cardio.webp",
    );
    const core = renderToStaticMarkup(<MemberMuscleGroupArt group="CORE" />);
    const cardio = renderToStaticMarkup(<MemberMuscleGroupArt group="CARDIO" />);
    expect(core).toContain("gymdesk-core.webp");
    expect(cardio).toContain("gymdesk-cardio.webp");
    expect(core).not.toContain("gymdesk-cardio");
    expect(cardio).not.toContain("gymdesk-core");
  });

  it("uses distinct image paths for chest and back", () => {
    const back = renderToStaticMarkup(<MemberMuscleGroupArt group="BACK" />);
    const chest = renderToStaticMarkup(<MemberMuscleGroupArt group="CHEST" />);
    expect(back).toContain("/images/muscle-groups/back.png");
    expect(chest).toContain("/images/muscle-groups/chest.png");
    expect(back).not.toEqual(chest);
  });
});
