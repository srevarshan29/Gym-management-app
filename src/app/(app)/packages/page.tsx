import { requireGym } from "@/lib/session";
import { canManagePackages } from "@/lib/permissions";
import { getRepositories, platformContext } from "@/lib/firestore";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { PackageDialog } from "@/components/package-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function durationLabel(value: number, unit: "MONTHS" | "DAYS") {
  const noun = unit === "MONTHS" ? "month" : "day";
  return `${value} ${noun}${value === 1 ? "" : "s"}`;
}

export default async function PackagesPage() {
  const user = await requireGym();
  const canManage = canManagePackages(user.role);

  const { packages } = getRepositories();
  const rows = await packages.listByGym(platformContext, user.gymId);
  const packagesWithCounts = await Promise.all(
    rows.map(async (pkg) => ({
      ...pkg,
      subscriptionCount: await packages.countSubscriptions(
        platformContext,
        user.gymId,
        pkg.id,
      ),
    })),
  );

  return (
    <div>
      <PageHeader
        title="Packages"
        description="Create and manage membership packages."
      >
        {canManage ? <PackageDialog /> : null}
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>All packages</CardTitle>
          <CardDescription>
            {packagesWithCounts.length} package
            {packagesWithCounts.length === 1 ? "" : "s"} defined.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {packagesWithCounts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No packages yet.
              {canManage ? " Create your first package to get started." : ""}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage ? (
                    <TableHead className="text-right">Actions</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {packagesWithCounts.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">{pkg.name}</TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(pkg.price)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {durationLabel(pkg.durationValue, pkg.durationUnit)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {pkg.subscriptionCount}
                    </TableCell>
                    <TableCell>
                      {pkg.isActive ? (
                        <Badge variant="active">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    {canManage ? (
                      <TableCell className="text-right">
                        <PackageDialog
                          pkg={{
                            id: pkg.id,
                            name: pkg.name,
                            price: pkg.price,
                            durationValue: pkg.durationValue,
                            durationUnit: pkg.durationUnit,
                            isActive: pkg.isActive,
                          }}
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
