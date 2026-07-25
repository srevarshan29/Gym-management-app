import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PtBadge({ className }: { className?: string }) {
  return (
    <Badge variant="default" className={cn("px-1.5 py-0 text-[10px]", className)}>
      PT
    </Badge>
  );
}
