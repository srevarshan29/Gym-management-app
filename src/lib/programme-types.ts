export type MemberOption = {
  id: string;
  name: string;
};

export type WorkoutPlanListItem = {
  id: string;
  memberId: string;
  memberName: string;
  title: string;
  durationWeeks: number | null;
  focusGoal: string | null;
  exerciseCount: number;
  isLegacy: boolean;
};
