import { LockedLink } from "@/components/navigation/locked-link";
import { Button } from "@/components/ui/button";

export function PaginationBar({
  page,
  pageSize,
  total,
  makeHref,
}: {
  page: number;
  pageSize: number;
  total: number;
  makeHref: (page: number) => string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  if (total <= pageSize) return null;

  const from = (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-2 text-sm text-muted-foreground">
      <p>
        Showing {from}–{to} of {total}
      </p>
      <div className="flex gap-2">
        {current > 1 ? (
          <Button asChild variant="outline" size="sm">
            <LockedLink href={makeHref(current - 1)}>Previous</LockedLink>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
        )}
        {current < totalPages ? (
          <Button asChild variant="outline" size="sm">
            <LockedLink href={makeHref(current + 1)}>Next</LockedLink>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
