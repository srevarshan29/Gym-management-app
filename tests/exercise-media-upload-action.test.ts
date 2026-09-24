import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";



const {

  requireGym,

  getById,

  completeGymExerciseMediaUpload,

} = vi.hoisted(() => ({

  requireGym: vi.fn(),

  getById: vi.fn(),

  completeGymExerciseMediaUpload: vi.fn(),

}));



import { uploadExerciseDemonstrationImage } from "@/app/actions/exercise-media";

import type { CustomExerciseDoc } from "@/lib/firestore/types";



vi.mock("@/lib/session", () => ({

  requireGym,

}));



vi.mock("@/lib/firestore", () => ({

  getRepositories: () => ({

    customExercises: {

      getById,

    },

  }),

  platformContext: { kind: "platform" },

}));



vi.mock("@/lib/exercises/media-storage", () => ({

  completeGymExerciseMediaUpload,

}));



function exerciseDoc(

  overrides: Partial<CustomExerciseDoc> = {},

): CustomExerciseDoc {

  return {

    gymId: "gym-a",

    name: "Custom Move",

    nameLower: "custom move",

    muscleGroup: "CHEST",

    defaultSets: 3,

    defaultReps: "10",

    defaultTempo: null,

    defaultRestSeconds: 60,

    trackingType: "WEIGHTED",

    isSeeded: false,

    exerciseSource: "CUSTOM",

    catalogId: null,

    importedCatalogVersion: null,

    media: null,

    createdAt: {} as never,

    updatedAt: {} as never,

    ...overrides,

  };

}



function formData(input: Record<string, string | File>) {

  const data = new FormData();

  for (const [key, value] of Object.entries(input)) {

    data.set(key, value);

  }

  return data;

}



function jpegFile(size = 1024) {

  return new File([new Uint8Array(size)], "demo.jpg", { type: "image/jpeg" });

}



beforeEach(() => {

  process.env.SUPABASE_URL = "https://example.supabase.co";

  process.env.SUPABASE_STORAGE_BUCKET = "gym-assets";



  requireGym.mockReset();

  getById.mockReset();

  completeGymExerciseMediaUpload.mockReset();



  requireGym.mockResolvedValue({

    gymId: "gym-a",

    role: "OWNER",

  });

});



afterEach(() => {

  delete process.env.SUPABASE_URL;

  delete process.env.SUPABASE_STORAGE_BUCKET;

});



const PUBLIC_BASE =

  "https://example.supabase.co/storage/v1/object/public/gym-assets";



describe("uploadExerciseDemonstrationImage", () => {

  it("rejects staff uploads server-side", async () => {

    requireGym.mockResolvedValueOnce({ gymId: "gym-a", role: "STAFF" });



    const result = await uploadExerciseDemonstrationImage(

      undefined,

      formData({

        exerciseId: "ex-1",

        pose: "primary",

        file: jpegFile(),

      }),

    );



    expect(result.ok).toBe(false);

    if (!result.ok) {

      expect(result.error).toContain("permission");

    }

    expect(getById).not.toHaveBeenCalled();

  });



  it("rejects member uploads server-side", async () => {

    requireGym.mockResolvedValueOnce({ gymId: "gym-a", role: "MEMBER" });



    const result = await uploadExerciseDemonstrationImage(

      undefined,

      formData({

        exerciseId: "ex-1",

        pose: "primary",

        file: jpegFile(),

      }),

    );



    expect(result.ok).toBe(false);

    expect(getById).not.toHaveBeenCalled();

  });



  it("rejects seeded exercise uploads", async () => {

    getById.mockResolvedValueOnce(

      exerciseDoc({ isSeeded: true, exerciseSource: "SEEDED" }),

    );



    const result = await uploadExerciseDemonstrationImage(

      undefined,

      formData({

        exerciseId: "seed-1",

        pose: "primary",

        file: jpegFile(),

      }),

    );



    expect(result.ok).toBe(false);

    if (!result.ok) {

      expect(result.error).toContain("Starter exercises");

    }

    expect(completeGymExerciseMediaUpload).not.toHaveBeenCalled();

  });



  it("rejects catalog exercise uploads to protect catalog media", async () => {

    getById.mockResolvedValueOnce(

      exerciseDoc({

        exerciseSource: "CATALOG",

        catalogId: "dev-push-up",

      }),

    );



    const result = await uploadExerciseDemonstrationImage(

      undefined,

      formData({

        exerciseId: "ex-catalog",

        pose: "primary",

        file: jpegFile(),

      }),

    );



    expect(result.ok).toBe(false);

    if (!result.ok) {

      expect(result.error).toContain("platform catalog");

    }

    expect(completeGymExerciseMediaUpload).not.toHaveBeenCalled();

  });



  it("rejects legacy catalogId-only documents regardless of exerciseSource", async () => {

    getById.mockResolvedValueOnce(

      exerciseDoc({

        exerciseSource: "CUSTOM",

        catalogId: "dev-push-up",

      }),

    );



    const result = await uploadExerciseDemonstrationImage(

      undefined,

      formData({

        exerciseId: "legacy-catalog",

        pose: "primary",

        file: jpegFile(),

      }),

    );



    expect(result.ok).toBe(false);

    if (!result.ok) {

      expect(result.error).toContain("platform catalog");

    }

    expect(completeGymExerciseMediaUpload).not.toHaveBeenCalled();

  });



  it("rejects exercises that do not belong to the current gym", async () => {

    getById.mockResolvedValueOnce(null);



    const result = await uploadExerciseDemonstrationImage(

      undefined,

      formData({

        exerciseId: "missing",

        pose: "primary",

        file: jpegFile(),

      }),

    );



    expect(result.ok).toBe(false);

    if (!result.ok) {

      expect(result.error).toContain("not found");

    }

    expect(getById).toHaveBeenCalledWith(

      { kind: "platform" },

      "gym-a",

      "missing",

    );

  });



  it("rejects unsupported file types before storage upload", async () => {

    getById.mockResolvedValueOnce(exerciseDoc());



    const result = await uploadExerciseDemonstrationImage(

      undefined,

      formData({

        exerciseId: "ex-1",

        pose: "primary",

        file: new File(["bad"], "demo.svg", { type: "image/svg+xml" }),

      }),

    );



    expect(result.ok).toBe(false);

    expect(completeGymExerciseMediaUpload).not.toHaveBeenCalled();

  });



  it("uploads custom exercise media using the session gym id", async () => {

    getById.mockResolvedValueOnce(exerciseDoc({ id: "ex-1" } as never));

    completeGymExerciseMediaUpload.mockResolvedValueOnce({

      ok: true,

      url: `${PUBLIC_BASE}/gyms/gym-a/exercises/ex-1/primary.jpg`,

      pose: "primary",

      media: {

        primaryImageUrl: `${PUBLIC_BASE}/gyms/gym-a/exercises/ex-1/primary.jpg`,

        secondaryImageUrl: null,

        thumbnailUrl: null,

        animationUrl: null,

        videoUrl: null,

      },

    });



    const result = await uploadExerciseDemonstrationImage(

      undefined,

      formData({

        exerciseId: "ex-1",

        pose: "primary",

        file: jpegFile(),

      }),

    );



    expect(result.ok).toBe(true);

    expect(completeGymExerciseMediaUpload).toHaveBeenCalledWith(

      expect.objectContaining({

        gymId: "gym-a",

        exerciseId: "ex-1",

        pose: "primary",

        file: expect.any(File),

        existing: null,

      }),

    );

  });



  it("supports secondary pose uploads for custom exercises", async () => {

    getById.mockResolvedValueOnce(exerciseDoc());

    completeGymExerciseMediaUpload.mockResolvedValueOnce({

      ok: true,

      url: `${PUBLIC_BASE}/gyms/gym-a/exercises/ex-1/secondary.jpg`,

      pose: "secondary",

      media: {

        primaryImageUrl: null,

        secondaryImageUrl: `${PUBLIC_BASE}/gyms/gym-a/exercises/ex-1/secondary.jpg`,

        thumbnailUrl: null,

        animationUrl: null,

        videoUrl: null,

      },

    });



    const result = await uploadExerciseDemonstrationImage(

      undefined,

      formData({

        exerciseId: "ex-1",

        pose: "secondary",

        file: jpegFile(),

      }),

    );



    expect(result.ok).toBe(true);

    expect(completeGymExerciseMediaUpload).toHaveBeenCalledWith(

      expect.objectContaining({ pose: "secondary" }),

    );

  });



  it("surfaces orchestration failures safely", async () => {

    getById.mockResolvedValueOnce(exerciseDoc());

    completeGymExerciseMediaUpload.mockResolvedValueOnce({

      ok: false,

      error:

        "Uploaded media URL failed security validation. The image was not saved.",

    });



    const result = await uploadExerciseDemonstrationImage(

      undefined,

      formData({

        exerciseId: "ex-1",

        pose: "primary",

        file: jpegFile(),

      }),

    );



    expect(result.ok).toBe(false);

    if (!result.ok) {

      expect(result.error).toContain("security validation");

      expect(result.error).not.toContain("service-role-key");

    }

  });

});


