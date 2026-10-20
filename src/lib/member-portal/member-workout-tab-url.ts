import {
  parseMemberLibraryMuscleGroup,
  type MemberLibraryMuscleFilter,
} from "@/lib/member-portal/member-library-muscle-groups";

/** Top-level workout page sections (Phase 1). */
export type MemberWorkoutTab = "plan" | "exercises";

export type MemberPlanFilter = "all" | "trainer" | "mine";

/** @deprecated Use MemberWorkoutTab — kept for imports migrating from legacy tabs. */
export type MemberWorkoutTopTab = MemberWorkoutTab;

/** Legacy `tab` query values still accepted in URLs. */
export type MemberWorkoutTabQuery =
  | MemberWorkoutTab
  | "assigned"
  | "mine"
  | "library";

export function parseMemberWorkoutTab(
  value: string | null | undefined,
): MemberWorkoutTab {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "library" || normalized === "exercises") {
    return "exercises";
  }
  return "plan";
}

export function parseMemberPlanFilter(
  tab: string | null | undefined,
  planFilter: string | null | undefined,
): MemberPlanFilter {
  const tabNorm = tab?.trim().toLowerCase();
  if (tabNorm === "assigned") return "trainer";
  if (tabNorm === "mine") return "mine";

  const filterNorm = planFilter?.trim().toLowerCase();
  if (filterNorm === "trainer" || filterNorm === "mine" || filterNorm === "all") {
    return filterNorm;
  }
  /** Bare `/member/workout` and other URLs without an explicit plan filter. */
  return "trainer";
}

export type MemberWorkoutPageQuery = {
  tab?: MemberWorkoutTabQuery | null;
  planFilter?: MemberPlanFilter | null;
  addTo?: string | null;
  created?: string | null;
  group?: MemberLibraryMuscleFilter | null;
};

function resolveTopTabAndFilter(query: MemberWorkoutPageQuery): {
  topTab: MemberWorkoutTab;
  planFilter: MemberPlanFilter;
} {
  const rawTab = query.tab ?? "plan";
  const topTab = parseMemberWorkoutTab(rawTab);
  if (topTab === "exercises") {
    return { topTab, planFilter: "all" };
  }
  const planFilter = parseMemberPlanFilter(rawTab, query.planFilter ?? null);
  return { topTab, planFilter };
}

/** Sync workout tab query in the URL without a Next.js RSC navigation. */
export function syncMemberWorkoutPageUrl(query: MemberWorkoutPageQuery = {}): void {
  if (typeof window === "undefined") return;
  const href = memberWorkoutPageHref(query);
  window.history.replaceState(window.history.state, "", href);
}

/** Read tab query from the live URL (use after `syncMemberWorkoutPageUrl` or bfcache). */
export function readMemberWorkoutPageQueryFromLocation(): MemberWorkoutPageQuery & {
  topTab: MemberWorkoutTab;
  planFilter: MemberPlanFilter;
} {
  if (typeof window === "undefined") {
    return { topTab: "plan", planFilter: "trainer" };
  }
  const params = new URLSearchParams(window.location.search);
  const rawTab = params.get("tab");
  const topTab = parseMemberWorkoutTab(rawTab);
  const planFilter =
    topTab === "exercises"
      ? "all"
      : parseMemberPlanFilter(rawTab, params.get("planFilter"));
  return {
    tab: rawTab as MemberWorkoutTabQuery | null,
    planFilter,
    topTab,
    addTo: params.get("addTo"),
    created: params.get("created"),
    group: parseMemberLibraryMuscleGroup(params.get("group")),
  };
}

export function memberWorkoutPageHref(query: MemberWorkoutPageQuery = {}): string {
  const params = new URLSearchParams();
  const { topTab, planFilter } = resolveTopTabAndFilter(query);

  if (topTab === "exercises") {
    params.set("tab", "library");
  } else if (planFilter === "trainer") {
    params.set("tab", "assigned");
  } else if (planFilter === "mine") {
    params.set("tab", "mine");
  } else if (query.tab === "plan") {
    params.set("tab", "plan");
    params.set("planFilter", "all");
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

/** Shared Exercises tab in selection mode (`addTo` workout id). */
export function memberPersonalWorkoutAddExercisesHref(
  workoutId: string,
  group?: MemberLibraryMuscleFilter | null,
): string {
  return memberWorkoutPageHref({
    tab: "library",
    addTo: workoutId.trim(),
    group: group ?? null,
  });
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
