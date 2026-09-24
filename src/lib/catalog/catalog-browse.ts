import type { StaffContext } from "@/lib/firestore/context";
import type { MuscleGroup } from "@/lib/muscle-groups";
import {
  toCatalogBrowseItem,
  type CatalogBrowsePage,
} from "@/lib/catalog/catalog-browse-types";
import type { FirestoreRepositories } from "@/lib/firestore/repositories";

export type BrowseExerciseCatalogInput = {
  query?: string;
  muscleGroup?: MuscleGroup | null;
  startAfterId?: string | null;
  limit?: number;
};

export async function browseExerciseCatalog(params: {
  ctx: StaffContext;
  repos: Pick<FirestoreRepositories, "exerciseCatalog" | "customExercises">;
  input?: BrowseExerciseCatalogInput;
}): Promise<CatalogBrowsePage> {
  const { ctx, repos, input = {} } = params;
  const trimmedQuery = input.query?.trim() ?? "";

  const page = trimmedQuery
    ? await repos.exerciseCatalog.searchByPrefix(ctx, {
        query: trimmedQuery,
        muscleGroup: input.muscleGroup ?? null,
        startAfterId: input.startAfterId ?? null,
        limit: input.limit,
      })
    : await repos.exerciseCatalog.listPage(ctx, {
        muscleGroup: input.muscleGroup ?? null,
        startAfterId: input.startAfterId ?? null,
        limit: input.limit,
        activeOnly: true,
      });

  const importedCatalogIds = await repos.customExercises.findImportedCatalogIds(
    ctx,
    ctx.gymId,
    page.items.map((item) => item.catalogId),
  );

  return {
    items: page.items.map((item) => toCatalogBrowseItem(item, importedCatalogIds)),
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
  };
}
