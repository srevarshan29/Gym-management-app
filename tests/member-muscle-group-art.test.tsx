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
  it("defines six library muscle groups", () => {
    expect(MEMBER_LIBRARY_MUSCLE_GROUPS).toHaveLength(6);
    expect(MEMBER_LIBRARY_MUSCLE_FILTERS).toEqual([
      "CHEST",
      "BACK",
      "SHOULDERS",
      "ARMS",
      "LEGS",
      "FULL_BODY",
    ]);
  });

  it("renders local muscle-group PNG for every filter", () => {
    for (const group of MEMBER_LIBRARY_MUSCLE_FILTERS) {
      const html = renderToStaticMarkup(
        <MemberMuscleGroupArt group={group} />,
      );
      expect(html).toContain(MEMBER_MUSCLE_GROUP_IMAGE_SRC[group]);
      expect(html).toContain("<img");
      expect(html).toContain("member-muscle-group-art");
    }
  });

  it("uses distinct image paths for chest and back", () => {
    const back = renderToStaticMarkup(<MemberMuscleGroupArt group="BACK" />);
    const chest = renderToStaticMarkup(<MemberMuscleGroupArt group="CHEST" />);
    expect(back).toContain("/images/muscle-groups/back.png");
    expect(chest).toContain("/images/muscle-groups/chest.png");
    expect(back).not.toEqual(chest);
  });
});
