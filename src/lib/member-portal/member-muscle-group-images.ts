import type { MemberLibraryMuscleFilter } from "@/lib/member-portal/member-library-muscle-groups";

/** Static anatomical illustrations under public/images/muscle-groups/. */
export const MEMBER_MUSCLE_GROUP_IMAGE_SRC: Record<
  MemberLibraryMuscleFilter,
  string
> = {
  CHEST: "/images/muscle-groups/chest.png",
  BACK: "/images/muscle-groups/back.png",
  SHOULDERS: "/images/muscle-groups/shoulders.png",
  ARMS: "/images/muscle-groups/arms.png",
  LEGS: "/images/muscle-groups/legs.png",
  FULL_BODY: "/images/muscle-groups/full-body.png",
};

export function memberMuscleGroupImageSrc(
  group: MemberLibraryMuscleFilter,
): string {
  return MEMBER_MUSCLE_GROUP_IMAGE_SRC[group];
}
