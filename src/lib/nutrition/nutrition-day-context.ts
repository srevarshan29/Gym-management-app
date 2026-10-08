import { getRepositories } from "@/lib/firestore";
import type { MemberContext } from "@/lib/firestore/context";
import type { NutritionLogDoc } from "@/lib/firestore/types";
import {
  buildMemberNutritionDayView,
  parseNutritionLogDate,
  type MemberNutritionDayView,
} from "@/lib/nutrition/member-day";
import type { ResolvedNutritionCalorieTarget } from "@/lib/nutrition/nutrition-calorie-target";
import { loadResolvedNutritionCalorieTarget } from "@/lib/nutrition/nutrition-target-loader";

export type MemberNutritionDayContext = {
  logDate: string;
  logs: Array<NutritionLogDoc & { id: string }>;
  target: ResolvedNutritionCalorieTarget;
};

export async function loadMemberNutritionDayContext(
  ctx: MemberContext,
  logDateInput: string,
): Promise<MemberNutritionDayContext> {
  const logDate = parseNutritionLogDate(logDateInput);
  const { nutritionLogs } = getRepositories();
  const [logs, target] = await Promise.all([
    nutritionLogs.listForMemberOnDate(ctx, ctx.gymId, ctx.memberId, logDate),
    loadResolvedNutritionCalorieTarget(ctx),
  ]);
  return { logDate, logs, target };
}

export function buildMemberNutritionDayFromContext(
  context: MemberNutritionDayContext,
  logs: Array<NutritionLogDoc & { id: string }>,
): MemberNutritionDayView {
  return buildMemberNutritionDayView(
    context.logDate,
    logs,
    context.target,
  );
}
