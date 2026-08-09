"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Upload } from "lucide-react";

import { updateMemberPortalProfile } from "@/app/actions/member-portal";
import { MemberAvatar } from "@/components/member-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { memberGenderLabel } from "@/lib/member-gender";
import type { ActionResult } from "@/lib/action-result";
import type { MemberGender } from "@prisma/client";

type Profile = {
  name: string;
  phone: string;
  photoUrl: string | null;
  gender: MemberGender;
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
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    updateMemberPortalProfile,
    undefined,
  );
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(
    profile.photoUrl,
  );

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(state.message ?? "Saved.");
    else toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      <div className="flex items-center gap-4">
        <MemberAvatar
          name={profile.name}
          photoUrl={photoPreview}
          gender={profile.gender}
          seed={profile.name}
          size="lg"
        />
        <div className="space-y-1.5">
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

      <div className="rounded-lg border p-4">
        <p className="mb-3 text-sm font-medium">Body metrics (optional)</p>
        <p className="mb-4 text-xs text-muted-foreground">
          Used in a future update for personalised diet and workout suggestions.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="ageYears">Age (years)</Label>
            <Input
              id="ageYears"
              name="ageYears"
              type="number"
              min={1}
              max={120}
              defaultValue={profile.ageYears ?? ""}
              placeholder="—"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="heightCm">Height (cm)</Label>
            <Input
              id="heightCm"
              name="heightCm"
              type="number"
              min={50}
              max={300}
              defaultValue={profile.heightCm ?? ""}
              placeholder="—"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weightKg">Weight (kg)</Label>
            <Input
              id="weightKg"
              name="weightKg"
              type="number"
              min={20}
              max={500}
              step={0.1}
              defaultValue={
                profile.weightKg != null ? String(profile.weightKg) : ""
              }
              placeholder="—"
            />
          </div>
        </div>
      </div>

      <Submit />
    </form>
  );
}
