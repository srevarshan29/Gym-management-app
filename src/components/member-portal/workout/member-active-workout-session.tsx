"use client";

import * as React from "react";

import { loadActiveWorkoutPreviousSetsAction } from "@/app/actions/workout-sessions";
import { WorkoutSessionView } from "@/components/member-portal/workout/workout-session-view";
import type {
  ActiveWorkoutSession,
  PreviousSetLog,
} from "@/lib/workout-tracking/types";

type MemberActiveWorkoutSessionProps = {
  session: ActiveWorkoutSession;
};

export function MemberActiveWorkoutSession({
  session,
}: MemberActiveWorkoutSessionProps) {
  const [previousSets, setPreviousSets] = React.useState<
    Record<string, PreviousSetLog[]>
  >({});
  const [previousSetsReady, setPreviousSetsReady] = React.useState(false);

  React.useEffect(() => {
    const sessionId = session.id;
    let cancelled = false;
    setPreviousSetsReady(false);

    void loadActiveWorkoutPreviousSetsAction(sessionId).then((result) => {
      if (cancelled) return;
      if (result.ok && result.data) {
        setPreviousSets(result.data);
      }
      setPreviousSetsReady(true);
    });

    return () => {
      cancelled = true;
      setPreviousSets({});
      setPreviousSetsReady(false);
    };
  }, [session.id]);

  return (
    <WorkoutSessionView
      session={session}
      previousSets={previousSets}
      previousSetsReady={previousSetsReady}
    />
  );
}
