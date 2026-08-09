"use server";



import { cookies } from "next/headers";



import { memberSignIn, memberSignOut, memberAuth } from "@/member-auth";

import { requireMember, resolveMemberLoginRedirect } from "@/lib/member-session";

import { getGymByRegistrationToken } from "@/lib/member-portal/access";

import {

  MEMBER_PORTAL_GYM_TOKEN_COOKIE,

  MEMBER_PORTAL_GYM_TOKEN_MAX_AGE_SEC,

} from "@/lib/member-portal/constants";

import { prisma } from "@/lib/prisma";

import { uploadMemberPhoto } from "@/lib/storage";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

import { revalidatePath } from "next/cache";

import { z } from "zod";



export async function startMemberGoogleSignIn(gymToken: string): Promise<void> {

  const gym = await getGymByRegistrationToken(gymToken);

  if (!gym) {

    throw new Error("Invalid gym login link.");

  }



  if (

    !process.env.MEMBER_AUTH_GOOGLE_CLIENT_ID ||

    !process.env.MEMBER_AUTH_GOOGLE_CLIENT_SECRET

  ) {

    throw new Error(

      "Member portal sign-in is not configured. Contact your gym.",

    );

  }



  const cookieStore = await cookies();

  cookieStore.set(MEMBER_PORTAL_GYM_TOKEN_COOKIE, gymToken, {

    httpOnly: true,

    sameSite: "lax",

    path: "/",

    maxAge: MEMBER_PORTAL_GYM_TOKEN_MAX_AGE_SEC,

    secure: process.env.NODE_ENV === "production",

  });



  await memberSignIn("google", { redirectTo: "/member" });

}



export async function memberSignOutAction(): Promise<void> {
  const session = await memberAuth();
  const redirectTo = await resolveMemberLoginRedirect(session?.user?.gymId);
  await memberSignOut({ redirectTo });
}



const profileSchema = z.object({

  ageYears: z

    .string()

    .optional()

    .or(z.literal(""))

    .transform((v) => (v === "" || v == null ? null : Number(v)))

    .refine((v) => v == null || (Number.isInteger(v) && v >= 1 && v <= 120), {

      message: "Enter a valid age.",

    }),

  heightCm: z

    .string()

    .optional()

    .or(z.literal(""))

    .transform((v) => (v === "" || v == null ? null : Number(v)))

    .refine((v) => v == null || (Number.isInteger(v) && v >= 50 && v <= 300), {

      message: "Enter height in cm (50–300).",

    }),

  weightKg: z

    .string()

    .optional()

    .or(z.literal(""))

    .transform((v) => (v === "" || v == null ? null : Number(v)))

    .refine((v) => v == null || (v >= 20 && v <= 500), {

      message: "Enter weight in kg (20–500).",

    }),

});



export async function updateMemberPortalProfile(

  _prev: ActionResult | undefined,

  formData: FormData,

): Promise<ActionResult> {

  const session = await requireMember();

  const parsed = profileSchema.safeParse({

    ageYears: formData.get("ageYears"),

    heightCm: formData.get("heightCm"),

    weightKg: formData.get("weightKg"),

  });

  if (!parsed.success) {

    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");

  }



  await prisma.member.updateMany({

    where: { id: session.memberId, gymId: session.gymId },

    data: {

      ageYears: parsed.data.ageYears,

      heightCm: parsed.data.heightCm,

      weightKg: parsed.data.weightKg,

    },

  });



  const photo = formData.get("photo");

  if (photo instanceof File && photo.size > 0) {

    const result = await uploadMemberPhoto(photo, session.memberId);

    if ("error" in result) {

      return actionOk(`Profile saved, but photo upload failed: ${result.error}`);

    }

    await prisma.member.updateMany({

      where: { id: session.memberId, gymId: session.gymId },

      data: { photoUrl: result.url },

    });

  }



  revalidatePath("/member/profile");

  return actionOk("Profile updated.");

}

