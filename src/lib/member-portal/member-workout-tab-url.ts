import type { MemberLibraryMuscleFilter } from "@/lib/member-portal/member-library-muscle-groups";

export type MemberWorkoutTab = "assigned" | "mine" | "library";

export function parseMemberWorkoutTab(
  value: string | null | undefined,
): MemberWorkoutTab {
  if (value === "mine" || value === "library" || value === "assigned") {
    return value;
  }
  return "assigned";
}

export type MemberWorkoutPageQuery = {
  tab?: MemberWorkoutTab;
  addTo?: string | null;
  created?: string | null;
  group?: MemberLibraryMuscleFilter | null;
};

export function memberWorkoutPageHref(query: MemberWorkoutPageQuery = {}): string {
  const params = new URLSearchParams();
  const tab = query.tab ?? "assigned";
  if (tab !== "assigned") {
    params.set("tab", tab);
  }
  const addTo = query.addTo?.trim();
  if (addTo) {
    params.set("addTo", addTo);
  }
  const created = query.created?.trim();
  if (created) {
    params.set("created", created);
  }
  const group = query.group;
  if (group) {
    params.set("group", group);
  }
  const qs = params.toString();
  return qs ? `/member/workout?${qs}` : "/member/workout";
}

export function memberPersonalWorkoutEditorHref(workoutId: string): string {
  return `/member/workout/personal/${encodeURIComponent(workoutId.trim())}`;
}

export function memberPersonalWorkoutAddExercisesHref(
  workoutId: string,
  group?: MemberLibraryMuscleFilter | null,
): string {
  const base = `/member/workout/personal/${encodeURIComponent(workoutId.trim())}/add-exercises`;
  if (!group) return base;
  return `${base}?group=${encodeURIComponent(group)}`;
}

export function memberExerciseLibraryDetailHref(
  catalogId: string,
  options?: {
    addToWorkoutId?: string | null;
    group?: MemberLibraryMuscleFilter | null;
  },
): string {
  const base = `/member/workout/library/${encodeURIComponent(catalogId)}`;
  const params = new URLSearchParams();
  const addTo = options?.addToWorkoutId?.trim();
  if (addTo) params.set("addTo", addTo);
  if (options?.group) params.set("group", options.group);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
