import { memberSignOutAction } from "@/app/actions/member-portal";
import { Button } from "@/components/ui/button";

export function MemberSignOutButton() {
  return (
    <form action={memberSignOutAction}>
      <Button type="submit" variant="outline" size="sm">
        Sign out
      </Button>
    </form>
  );
}
