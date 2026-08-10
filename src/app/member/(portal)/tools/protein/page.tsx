import { ProteinCalculator } from "@/components/member-portal/tools/protein-calculator";
import { ToolsSubNav } from "@/components/member-portal/tools/tools-nav";
import { getMemberCalculatorProfile } from "@/lib/member-portal/calculator-profile";

export default async function MemberProteinCalculatorPage() {
  const profile = await getMemberCalculatorProfile();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold">Protein Calculator</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Daily protein range based on your body weight.
        </p>
      </div>
      <ToolsSubNav activeHref="/member/tools/protein" />
      <ProteinCalculator initialWeightKg={profile?.weightKg} />
    </div>
  );
}
