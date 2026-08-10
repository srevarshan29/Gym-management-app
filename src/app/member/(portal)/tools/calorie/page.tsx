import { CalorieCalculator } from "@/components/member-portal/tools/calorie-calculator";
import { ToolsSubNav } from "@/components/member-portal/tools/tools-nav";
import { getMemberCalculatorProfile } from "@/lib/member-portal/calculator-profile";

export default async function MemberCalorieCalculatorPage() {
  const profile = await getMemberCalculatorProfile();

  if (!profile) {
    return (
      <p className="text-muted-foreground">Unable to load your profile.</p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold">Calorie Calculator</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Daily calorie target based on your stats and fitness goal.
        </p>
      </div>
      <ToolsSubNav activeHref="/member/tools/calorie" />
      <CalorieCalculator
        initialWeightKg={profile.weightKg}
        initialHeightCm={profile.heightCm}
        initialAgeYears={profile.ageYears}
        initialFitnessGoal={profile.fitnessGoal}
        gender={profile.gender}
      />
    </div>
  );
}
