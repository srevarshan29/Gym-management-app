"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";

import { submitPublicRegistration } from "@/app/actions/public-registration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActionResult } from "@/lib/action-result";
import { MEMBER_GENDER_OPTIONS } from "@/lib/member-gender";
import { MembershipPolicyConsent } from "@/components/membership-policy-consent";
import { FitnessProfileFields } from "@/components/fitness-profile-fields";
import type { FitnessGoal, MemberGender } from "@prisma/client";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Submitting..." : "Submit registration"}
    </Button>
  );
}

export function PublicRegistrationForm({
  token,
  gymName,
  membershipPolicyText,
}: {
  token: string;
  gymName: string;
  membershipPolicyText: string | null;
}) {
  const formLoadedAt = React.useRef(String(Date.now()));
  const [gender, setGender] = React.useState<MemberGender>("PREFER_NOT_TO_SAY");
  const [fitnessGoal, setFitnessGoal] = React.useState<FitnessGoal | "">("");
  const [submitted, setSubmitted] = React.useState(false);

  const action = submitPublicRegistration.bind(null, token);
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    action,
    undefined,
  );

  React.useEffect(() => {
    if (state?.ok) {
      setSubmitted(true);
    }
  }, [state]);

  if (submitted) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Thank you!
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {state && state.ok
            ? (state.message ?? "Front desk will confirm your registration.")
            : "Front desk will confirm your registration."}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="formLoadedAt" value={formLoadedAt.current} />
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />
      <input type="hidden" name="gender" value={gender} />

      <div className="mb-2 text-center">
        <p className="text-sm text-muted-foreground">Register at</p>
        <p className="font-display text-lg font-semibold">{gymName}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" placeholder="Jane Doe" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone number</Label>
        <Input
          id="phone"
          name="phone"
          placeholder="+91 98765 43210"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gender">Gender</Label>
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
      </div>

      <FitnessProfileFields
        fitnessGoal={fitnessGoal}
        onFitnessGoalChange={setFitnessGoal}
        fitnessGoalRequired
      />

      {membershipPolicyText ? (
        <MembershipPolicyConsent policyText={membershipPolicyText} />
      ) : null}

      {state && !state.ok ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
