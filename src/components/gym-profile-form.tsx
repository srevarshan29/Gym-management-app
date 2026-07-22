"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Building2, Upload } from "lucide-react";

import { updateGymProfile } from "@/app/actions/gym-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ActionResult } from "@/lib/action-result";
import type { GymProfileData } from "@/lib/gym-profile";

export function GymProfileForm({ profile }: { profile: GymProfileData }) {
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    updateGymProfile,
    undefined,
  );
  const [logoPreview, setLogoPreview] = React.useState<string | null>(
    profile.logoUrl,
  );

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(state.message ?? "Gym profile updated.");
    else toast.error(state.error);
  }, [state]);

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 rounded-lg border">
          {logoPreview ? (
            <AvatarImage src={logoPreview} alt="Gym logo" className="object-contain" />
          ) : null}
          <AvatarFallback className="rounded-lg">
            <Building2 className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1.5">
          <Label
            htmlFor="logo"
            className="flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium shadow-soft hover:bg-accent"
          >
            <Upload className="h-4 w-4" /> Upload logo
          </Label>
          <input
            id="logo"
            name="logo"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onLogoChange}
          />
          <p className="text-xs text-muted-foreground">
            PNG or JPG, up to 5MB. Shown on receipts.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="gym-name">Gym name</Label>
          <Input
            id="gym-name"
            name="name"
            defaultValue={profile.name}
            placeholder="My Gym"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gym-phone">Contact phone</Label>
          <Input
            id="gym-phone"
            name="phone"
            defaultValue={profile.phone ?? ""}
            placeholder="+91 98765 43210"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="gym-address">Address</Label>
        <Input
          id="gym-address"
          name="address"
          defaultValue={profile.address ?? ""}
          placeholder="Street, city, state, PIN"
        />
      </div>

      <div className="rounded-lg border p-4">
        <p className="text-sm font-medium">Owner notifications</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Sent internally whenever a payment is logged.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="owner-phone">Owner phone (SMS)</Label>
            <Input
              id="owner-phone"
              name="ownerNotifyPhone"
              defaultValue={profile.ownerNotifyPhone ?? ""}
              placeholder="+91 98765 43210"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-email">Owner email</Label>
            <Input
              id="owner-email"
              name="ownerNotifyEmail"
              type="email"
              defaultValue={profile.ownerNotifyEmail ?? ""}
              placeholder="owner@example.com"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save gym profile"}
    </Button>
  );
}
