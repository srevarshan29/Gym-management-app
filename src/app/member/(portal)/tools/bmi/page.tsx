import { BmiCalculator } from "@/components/member-portal/tools/bmi-calculator";
import { ToolsSubNav } from "@/components/member-portal/tools/tools-nav";
import { getMemberCalculatorProfile } from "@/lib/member-portal/calculator-profile";

export default async function MemberBmiCalculatorPage() {
  const profile = await getMemberCalculatorProfile();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold">BMI Calculator</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Body mass index from your height and weight.
        </p>
      </div>
      <ToolsSubNav activeHref="/member/tools/bmi" />
      <BmiCalculator
        initialWeightKg={profile?.weightKg}
        initialHeightCm={profile?.heightCm}
      />
    </div>
  );
}
