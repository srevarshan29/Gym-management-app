"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Upload } from "lucide-react";

import { MemberPhotoBanner } from "@/components/member-photo-banner";
import { FitnessProfileFields } from "@/components/fitness-profile-fields";
import { updateMemberPortalProfile } from "@/app/actions/member-portal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { memberGenderLabel } from "@/lib/member-gender";
import { useGuardedFormAction } from "@/hooks/use-guarded-form-action";
import type { ActionResult } from "@/lib/action-result";
import type { FitnessGoal, MemberGender } from "@prisma/client";

type Profile = {
  name: string;
  phone: string;
  photoUrl: string | null;
  gender: MemberGender;
  fitnessGoal: FitnessGoal | null;
  ageYears: number | null;
  heightCm: number | null;
  weightKg: number | null;
};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save profile"}
    </Button>
  );
}

export function MemberPortalProfileForm({ profile }: { profile: Profile }) {
  const guardedAction = useGuardedFormAction(updateMemberPortalProfile);
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    guardedAction,
    undefined,
  );
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(
    profile.photoUrl,
  );
  const [fitnessGoal, setFitnessGoal] = React.useState<FitnessGoal | "">(
    profile.fitnessGoal ?? "",
  );

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(state.message ?? "Saved.");
    else toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-3">
        <MemberPhotoBanner
          name={profile.name}
          photoUrl={photoPreview}
          gender={profile.gender}
          seed={profile.name}
        />
        <div className="flex justify-center sm:justify-start">
          <Label
            htmlFor="photo"
            className="flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium shadow-soft hover:bg-accent"
          >
            <Upload className="h-4 w-4" /> Change photo
          </Label>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => setPhotoPreview(reader.result as string);
              reader.readAsDataURL(file);
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-muted-foreground">Name</Label>
          <p className="text-sm font-medium">{profile.name}</p>
          <p className="text-xs text-muted-foreground">
            Contact the front desk to change your name.
          </p>
        </div>
        <div className="space-y-1">
          <Label className="text-muted-foreground">Phone</Label>
          <p className="font-mono text-sm font-medium">{profile.phone}</p>
        </div>
        <div className="space-y-1">
          <Label className="text-muted-foreground">Gender</Label>
          <p className="text-sm">{memberGenderLabel(profile.gender)}</p>
        </div>
      </div>

      <FitnessProfileFields
        fitnessGoal={fitnessGoal}
        onFitnessGoalChange={setFitnessGoal}
        defaultAgeYears={profile.ageYears}
        defaultHeightCm={profile.heightCm}
        defaultWeightKg={profile.weightKg}
      />

      <Submit />
    </form>
  );
}
