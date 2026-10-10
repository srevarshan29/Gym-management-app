import { cn } from "@/lib/utils";

type MemberWorkoutThemeProps = {
  children: React.ReactNode;
  className?: string;
};

export function MemberWorkoutTheme({
  children,
  className,
}: MemberWorkoutThemeProps) {
  return (
    <div className={cn("member-workout-theme space-y-4 p-4 sm:p-5", className)}>
      {children}
    </div>
  );
}
