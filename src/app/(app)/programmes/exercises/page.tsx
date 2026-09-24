import { requireGym } from "@/lib/session";
import {
  canBrowseExerciseCatalog,
  canImportExerciseCatalog,
  canManageExerciseLibrary,
  canUploadExerciseMedia,
} from "@/lib/permissions";
import { browseExerciseLibrary } from "@/lib/workout-tracking/exercise-library";
import { PageHeader } from "@/components/page-header";
import { AddExerciseDialog } from "@/components/workout/add-exercise-dialog";
import { CatalogBrowser } from "@/components/workout/catalog-browser";
import { ExerciseLibraryBrowse } from "@/components/workout/exercise-library-browse";
import { LockedLink } from "@/components/navigation/locked-link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function ExerciseLibraryPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const user = await requireGym();
  const canManage = canManageExerciseLibrary(user.role);
  const canBrowse = canBrowseExerciseCatalog(user.role);
  const canImport = canImportExerciseCatalog(user.role);
  const canUploadMedia = canUploadExerciseMedia(user.role);
  const tab = searchParams?.tab === "catalog" && canBrowse ? "catalog" : "library";

  const library =
    tab === "library"
      ? await browseExerciseLibrary(user.gymId)
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exercise library"
        description="Starter exercises, custom entries, and catalog imports for building member plans."
      >
        {canManage ? <AddExerciseDialog /> : null}
      </PageHeader>

      <Tabs value={tab}>
        <TabsList>
          <TabsTrigger value="library" asChild>
            <LockedLink href="/programmes/exercises?tab=library">My library</LockedLink>
          </TabsTrigger>
          {canBrowse ? (
            <TabsTrigger value="catalog" asChild>
              <LockedLink href="/programmes/exercises?tab=catalog">
                Browse catalog
              </LockedLink>
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="library" className="mt-4 space-y-4">
          {library ? (
            <ExerciseLibraryBrowse
              initialItems={library.items}
              initialNextCursor={library.nextCursor}
              totalCount={library.totalCount}
              userRole={user.role}
              canManage={canManage}
              canRefreshCatalog={canImport}
              canUploadMedia={canUploadMedia}
            />
          ) : null}
        </TabsContent>

        {canBrowse ? (
          <TabsContent value="catalog" className="mt-4">
            <CatalogBrowser canImport={canImport} />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
