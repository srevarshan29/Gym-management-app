"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Upload } from "lucide-react";

import { createMember, updateMember } from "@/app/actions/members";
import { MemberAvatar } from "@/components/member-avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { MEMBER_GENDER_OPTIONS } from "@/lib/member-gender";
import { MembershipPolicyConsent } from "@/components/membership-policy-consent";
import { FitnessProfileFields } from "@/components/fitness-profile-fields";
import { useGuardedFormAction } from "@/hooks/use-guarded-form-action";
import type { ActionResult } from "@/lib/action-result";
import type { FitnessGoal, MemberGender } from "@prisma/client";

export type PackageOption = {
  id: string;
  name: string;
  price: number;
  durationLabel: string;
};

export type StaffOption = {
  id: string;
  name: string;
};

type CreateProps = {
  mode: "create";
  packages: PackageOption[];
  canRecordPayment: boolean;
  staffOptions: StaffOption[];
  initialName?: string;
  initialPhone?: string;
  initialEmail?: string;
  initialGender?: MemberGender;
  initialFitnessGoal?: FitnessGoal;
  initialAgeYears?: number | null;
  initialHeightCm?: number | null;
  initialWeightKg?: number | null;
  visitorId?: string;
  membershipPolicyText?: string | null;
};

type EditProps = {
  mode: "edit";
  member: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    photoUrl: string | null;
    gender: MemberGender;
    notes: string | null;
    isPt: boolean;
    trainerId: string | null;
    fitnessGoal: FitnessGoal | null;
    ageYears: number | null;
    heightCm: number | null;
    weightKg: number | null;
  };
  staffOptions: StaffOption[];
};

type Props = CreateProps | EditProps;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : label}
    </Button>
  );
}

export function MemberForm(props: Props) {
  const baseAction = props.mode === "create" ? createMember : updateMember;
  const guardedAction = useGuardedFormAction(baseAction);

  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    guardedAction,
    undefined,
  );

  const [packageId, setPackageId] = React.useState<string>(
    props.mode === "create" ? (props.packages[0]?.id ?? "") : "",
  );
  const [method, setMethod] = React.useState("CASH");
  const [logPayment, setLogPayment] = React.useState(false);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(
    props.mode === "edit" ? props.member.photoUrl : null,
  );
  const [gender, setGender] = React.useState<MemberGender>(
    props.mode === "edit"
      ? props.member.gender
      : props.mode === "create" && props.initialGender
        ? props.initialGender
        : "PREFER_NOT_TO_SAY",
  );
  const [displayName, setDisplayName] = React.useState(
    props.mode === "edit"
      ? props.member.name
      : props.mode === "create"
        ? (props.initialName ?? "New member")
        : "New member",
  );
  const [isPt, setIsPt] = React.useState(
    props.mode === "edit" ? props.member.isPt : false,
  );
  const [trainerId, setTrainerId] = React.useState(
    props.mode === "edit" ? props.member.trainerId ?? "" : "",
  );
  const [fitnessGoal, setFitnessGoal] = React.useState<FitnessGoal | "">(
    props.mode === "edit"
      ? (props.member.fitnessGoal ?? "")
      : props.mode === "create" && props.initialFitnessGoal
        ? props.initialFitnessGoal
        : "",
  );

  React.useEffect(() => {
    if (state && !state.ok) toast.error(state.error);
  }, [state]);

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be smaller than 5MB.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  const selectedPackage =
    props.mode === "create"
      ? props.packages.find((p) => p.id === packageId)
      : undefined;

  return (
    <form action={formAction} className="space-y-6">
      {props.mode === "edit" ? (
        <input type="hidden" name="id" value={props.member.id} />
      ) : null}
      {props.mode === "create" && props.visitorId ? (
        <input type="hidden" name="visitorId" value={props.visitorId} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Member details</CardTitle>
          <CardDescription>Basic contact information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
            <MemberAvatar
              name={displayName}
              photoUrl={photoPreview}
              gender={gender}
              seed={props.mode === "edit" ? props.member.id : displayName}
              size="md"
            />
            <div className="space-y-1.5">
              <Label
                htmlFor="photo"
                className="flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium shadow-soft hover:bg-accent"
              >
                <Upload className="h-4 w-4" /> Upload photo
              </Label>
              <input
                id="photo"
                name="photo"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPhotoChange}
              />
              <p className="text-xs text-muted-foreground">
                PNG or JPG, up to 5MB. Shown on the members list and profile.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={
                  props.mode === "edit"
                    ? props.member.name
                    : (props.initialName ?? "")
                }
                placeholder="Jane Doe"
                required
                onChange={(e) => setDisplayName(e.target.value || "New member")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <input type="hidden" name="gender" value={gender} />
              <Select
                value={gender}
                onValueChange={(value) => setGender(value as MemberGender)}
              >
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {MEMBER_GENDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used for the default avatar when no photo is uploaded.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={
                  props.mode === "edit"
                    ? props.member.phone
                    : (props.initialPhone ?? "")
                }
                placeholder="+91 98765 43210"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">
              {props.mode === "create" ? "Email" : "Email (optional)"}
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={
                props.mode === "edit"
                  ? (props.member.email ?? "")
                  : (props.initialEmail ?? "")
              }
              placeholder="jane@example.com"
              required={props.mode === "create"}
            />
            <p className="text-xs text-muted-foreground">
              {props.mode === "create"
                ? "Required for member portal sign-in and payment receipts."
                : "Used for member portal Google sign-in and email receipts. Leave blank if not available."}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={
                props.mode === "edit" ? (props.member.notes ?? "") : ""
              }
              placeholder="Any relevant notes about this member"
            />
          </div>

          <input type="hidden" name="isPt" value={isPt ? "1" : "0"} />
          <input type="hidden" name="trainerId" value={isPt ? trainerId : ""} />

          <div className="rounded-lg border p-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-primary"
                checked={isPt}
                onChange={(e) => {
                  setIsPt(e.target.checked);
                  if (!e.target.checked) setTrainerId("");
                }}
              />
              Personal training (PT) member
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              PT members appear on the PT Members page and can be assigned a
              trainer.
            </p>
            {isPt ? (
              <div className="mt-4 space-y-2">
                <Label>Trainer (optional)</Label>
                <Select
                  value={trainerId || "__none__"}
                  onValueChange={(value) =>
                    setTrainerId(value === "__none__" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No trainer assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No trainer</SelectItem>
                    {props.staffOptions.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <FitnessProfileFields
            fitnessGoal={fitnessGoal}
            onFitnessGoalChange={setFitnessGoal}
            fitnessGoalRequired={props.mode === "create"}
            defaultAgeYears={
              props.mode === "edit"
                ? props.member.ageYears
                : props.mode === "create"
                  ? props.initialAgeYears
                  : undefined
            }
            defaultHeightCm={
              props.mode === "edit"
                ? props.member.heightCm
                : props.mode === "create"
                  ? props.initialHeightCm
                  : undefined
            }
            defaultWeightKg={
              props.mode === "edit"
                ? props.member.weightKg
                : props.mode === "create"
                  ? props.initialWeightKg
                  : undefined
            }
          />
        </CardContent>
      </Card>

      {props.mode === "create" ? (
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>
              Assign a package. This creates the member&apos;s first
              subscription.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input type="hidden" name="packageId" value={packageId} />
            <input type="hidden" name="method" value={method} />
            <input
              type="hidden"
              name="logPayment"
              value={logPayment ? "1" : "0"}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Package</Label>
                {props.packages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active packages. Create one on the Packages page first.
                  </p>
                ) : (
                  <Select value={packageId} onValueChange={setPackageId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a package" />
                    </SelectTrigger>
                    <SelectContent>
                      {props.packages.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — {formatCurrency(p.price)} / {p.durationLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start date</Label>
                <Input id="startDate" name="startDate" type="date" />
              </div>
            </div>

            {props.canRecordPayment ? (
              <div className="rounded-lg border p-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input accent-primary"
                    checked={logPayment}
                    onChange={(e) => setLogPayment(e.target.checked)}
                  />
                  Record payment now
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Partial amounts are allowed — the balance can be paid in
                  installments.
                </p>
                {logPayment ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (INR)</Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={selectedPackage?.price}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Method</Label>
                      <Select value={method} onValueChange={setMethod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="CARD">Card</SelectItem>
                          <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Leave unchecked to add the member now and collect payment
                    later (they will appear under Payments &rarr; Pending).
                  </p>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {props.mode === "create" && props.membershipPolicyText ? (
        <MembershipPolicyConsent policyText={props.membershipPolicyText} />
      ) : null}

      <div className="flex justify-end gap-2">
        <SubmitButton
          label={props.mode === "create" ? "Add member" : "Save changes"}
        />
      </div>
    </form>
  );
}
