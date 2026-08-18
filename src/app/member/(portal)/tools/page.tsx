import { ToolsIndexList, ToolsSubNav } from "@/components/member-portal/tools/tools-nav";

export default function MemberToolsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold">Tools</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Calculators, payments, diet, and gym events.
        </p>
      </div>
      <ToolsSubNav activeHref="/member/tools" />
      <ToolsIndexList />
    </div>
  );
}
