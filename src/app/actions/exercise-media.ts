"use server";



import { z } from "zod";



import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

import { completeGymExerciseMediaUpload } from "@/lib/exercises/media-storage";

import { getRepositories, platformContext } from "@/lib/firestore";

import { resolveExerciseSource } from "@/lib/exercises/source";

import { canUploadExerciseMedia } from "@/lib/permissions";

import { requireGym } from "@/lib/session";

import { validateImageUploadFile } from "@/lib/storage/image-validation";



const uploadExerciseMediaSchema = z.object({

  exerciseId: z.string().trim().min(1).max(80),

  pose: z.enum(["primary", "secondary", "thumbnail"]),

});



/**

 * Upload scaffolding for gym-owned exercise demonstration media.

 * Does not modify catalog sync paths or seeded exercises automatically.

 */

export async function uploadExerciseDemonstrationImage(

  _prev: ActionResult<{ publicUrl: string; pose: "primary" | "secondary" | "thumbnail" }> | undefined,

  formData: FormData,

): Promise<ActionResult<{ publicUrl: string; pose: "primary" | "secondary" | "thumbnail" }>> {

  const user = await requireGym();

  if (!canUploadExerciseMedia(user.role)) {

    return actionError("You do not have permission to upload exercise media.");

  }



  const parsed = uploadExerciseMediaSchema.safeParse({

    exerciseId: formData.get("exerciseId"),

    pose: formData.get("pose"),

  });

  if (!parsed.success) {

    return actionError(parsed.error.errors[0]?.message ?? "Invalid upload input.");

  }



  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {

    return actionError("Choose an image file to upload.");

  }



  const validatedFile = validateImageUploadFile(file);

  if (!validatedFile.ok) {

    return actionError(validatedFile.error);

  }



  const { customExercises } = getRepositories();

  const exercise = await customExercises.getById(

    platformContext,

    user.gymId,

    parsed.data.exerciseId,

  );

  if (!exercise) {

    return actionError("Exercise not found.");

  }

  if (exercise.isSeeded) {

    return actionError("Starter exercises cannot be modified through gym media upload.");

  }



  if (exercise.catalogId?.trim()) {

    return actionError("Catalog exercise media is managed by the platform catalog.");

  }



  if (resolveExerciseSource(exercise) === "CATALOG") {

    return actionError("Catalog exercise media is managed by the platform catalog.");

  }



  const result = await completeGymExerciseMediaUpload({

    gymId: user.gymId,

    exerciseId: parsed.data.exerciseId,

    pose: parsed.data.pose,

    file,

    existing: exercise.media ?? null,

    persistMedia: async (media) => {

      await customExercises.update(

        platformContext,

        user.gymId,

        parsed.data.exerciseId,

        { media },

      );

    },

  });



  if (!result.ok) {

    return actionError(result.error);

  }



  return actionOk("Exercise media uploaded.", {

    publicUrl: result.url,

    pose: result.pose,

  });

}


