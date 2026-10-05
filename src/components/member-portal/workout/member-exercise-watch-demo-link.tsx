import { ExternalLink } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { getSafeYouTubeWatchUrl } from "@/lib/exercises/youtube-url";
import { cn } from "@/lib/utils";

type MemberExerciseWatchDemoLinkProps = {
  youtubeUrl: string | null | undefined;
  compact?: boolean;
  className?: string;
};

export function MemberExerciseWatchDemoLink({
  youtubeUrl,
  compact = false,
  className,
}: MemberExerciseWatchDemoLinkProps) {
  const href = getSafeYouTubeWatchUrl(youtubeUrl);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        buttonVariants({
          variant: "ghost",
          size: compact ? "sm" : "default",
        }),
        "max-w-full shrink-0 gap-1.5 text-muted-foreground",
        compact ? "h-8 px-2 text-xs" : "h-9 px-3 text-sm",
        className,
      )}
    >
      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">Watch Demo</span>
    </a>
  );
}
