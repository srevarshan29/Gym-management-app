"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  ArrowRight,
  Dumbbell,
  Lock,
  Mail,
  Phone,
  Shield,
  User,
  Users,
} from "lucide-react";

import { submitPublicRegistration } from "@/app/actions/public-registration";
import { FitnessProfileFields } from "@/components/fitness-profile-fields";
import { MembershipPolicyConsent } from "@/components/membership-policy-consent";
import {
  RegistrationInput,
  RegistrationSelectWrapper,
} from "@/components/public-registration/registration-field";
import {
  RegistrationShell,
  RegistrationStepPanel,
} from "@/components/public-registration/registration-shell";
import { RegistrationStepCard } from "@/components/public-registration/registration-step-card";
import { RegistrationStepIndicator } from "@/components/public-registration/registration-step-indicator";
import { RegistrationSuccess } from "@/components/public-registration/registration-success";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGuardedFormAction } from "@/hooks/use-guarded-form-action";
import type { ActionResult } from "@/lib/action-result";
import { signupBodyMetricsSchema } from "@/lib/fitness-goal";
import { MEMBER_GENDER_OPTIONS } from "@/lib/member-gender";
import { isMembershipPolicyRequired } from "@/lib/membership-policy";
import type { FitnessGoal, MemberGender } from "@prisma/client";

type StepId = 1 | 2 | 3;

function ActionButton({
  isFinalStep,
  pendingLabel,
  continueLabel,
  submitLabel,
}: {
  isFinalStep: boolean;
  pendingLabel: string;
  continueLabel: string;
  submitLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type={isFinalStep ? "submit" : "button"} className="w-full" disabled={pending}>
      {pending
        ? pendingLabel
        : isFinalStep
          ? submitLabel
          : continueLabel}
      {!pending && !isFinalStep ? <ArrowRight className="h-4 w-4" /> : null}
      {!pending && isFinalStep ? <ArrowRight className="h-4 w-4" /> : null}
    </Button>
  );
}

function validateOptionalBodyMetrics(form: HTMLFormElement): string | null {
  const values = {
    ageYears: (form.elements.namedItem("ageYears") as HTMLInputElement)?.value ?? "",
    heightCm: (form.elements.namedItem("heightCm") as HTMLInputElement)?.value ?? "",
    weightKg: (form.elements.namedItem("weightKg") as HTMLInputElement)?.value ?? "",
  };

  const result = signupBodyMetricsSchema.safeParse(values);
  if (result.success) return null;
  return result.error.errors[0]?.message ?? "Invalid body stats.";
}

export function PublicRegistrationForm({
  token,
  gymName,
  logoUrl,
  membershipPolicyText,
}: {
  token: string;
  gymName: string;
  logoUrl?: string | null;
  membershipPolicyText: string | null;
}) {
  const formLoadedAt = React.useRef(String(Date.now()));
  const formRef = React.useRef<HTMLFormElement>(null);
  const step1Ref = React.useRef<HTMLDivElement>(null);
  const [step, setStep] = React.useState<StepId>(1);
  const [gender, setGender] = React.useState<MemberGender>("PREFER_NOT_TO_SAY");
  const [fitnessGoal, setFitnessGoal] = React.useState<FitnessGoal | "">("");
  const [stepError, setStepError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  const hasPolicy = isMembershipPolicyRequired(membershipPolicyText);
  const totalSteps = hasPolicy ? 3 : 2;
  const isFinalStep = step === totalSteps;

  const action = submitPublicRegistration.bind(null, token);
  const guardedAction = useGuardedFormAction(action);
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    guardedAction,
    undefined,
  );

  React.useEffect(() => {
    if (state?.ok) {
      setSubmitted(true);
    }
  }, [state]);

  function handleContinue() {
    setStepError(null);

    if (step === 1) {
      const panel = step1Ref.current;
      if (!panel) return;
      const inputs = panel.querySelectorAll<HTMLInputElement>("input, select");
      for (const input of inputs) {
        if (!input.checkValidity()) {
          input.reportValidity();
          return;
        }
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!fitnessGoal) {
        setStepError("Select a fitness goal.");
        return;
      }

      const form = formRef.current;
      if (form) {
        const metricsError = validateOptionalBodyMetrics(form);
        if (metricsError) {
          setStepError(metricsError);
          return;
        }
      }

      if (hasPolicy) {
        setStep(3);
        return;
      }
    }
  }

  function handleBack() {
    setStepError(null);
    if (step > 1) {
      setStep((step - 1) as StepId);
    }
  }

  if (submitted) {
    return (
      <RegistrationSuccess
        message={
          state && state.ok
            ? (state.message ??
              "Our front desk team will confirm your registration shortly.")
            : "Our front desk team will confirm your registration shortly."
        }
      />
    );
  }

  return (
    <RegistrationShell
      gymName={gymName}
      logoUrl={logoUrl}
      showBack={step > 1}
      onBack={handleBack}
    >
      <RegistrationStepIndicator currentStep={step} totalSteps={totalSteps} />

      <form ref={formRef} action={formAction} className="space-y-4">
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

        <RegistrationStepPanel hidden={step !== 1}>
          <div ref={step1Ref}>
            <RegistrationStepCard icon={User} title="Personal Information">
              <RegistrationInput
                id="name"
                name="name"
                label="Full name"
                icon={User}
                placeholder="Jane Doe"
                required
              />
              <RegistrationInput
                id="phone"
                name="phone"
                label="Phone number"
                icon={Phone}
                placeholder="+91 98765 43210"
                required
              />
              <RegistrationInput
                id="email"
                name="email"
                type="email"
                label="Email"
                icon={Mail}
                placeholder="you@example.com"
                required
              />
              <RegistrationSelectWrapper id="gender" label="Gender" icon={Users}>
                <Select
                  value={gender}
                  onValueChange={(value) => setGender(value as MemberGender)}
                >
                  <SelectTrigger id="gender" className="bg-muted/40 pl-10 focus:ring-primary">
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
              </RegistrationSelectWrapper>
            </RegistrationStepCard>
          </div>
        </RegistrationStepPanel>

        <RegistrationStepPanel hidden={step !== 2}>
          <RegistrationStepCard icon={Dumbbell} title="Fitness Profile">
            <FitnessProfileFields
              fitnessGoal={fitnessGoal}
              onFitnessGoalChange={setFitnessGoal}
              fitnessGoalRequired
              variant="embedded"
            />
          </RegistrationStepCard>
        </RegistrationStepPanel>

        {hasPolicy && membershipPolicyText ? (
          <RegistrationStepPanel hidden={step !== 3}>
            <RegistrationStepCard icon={Shield} title="Membership Policy">
              <MembershipPolicyConsent
                policyText={membershipPolicyText}
                variant="embedded"
              />
            </RegistrationStepCard>
          </RegistrationStepPanel>
        ) : null}

        {stepError ? (
          <p className="text-sm text-destructive">{stepError}</p>
        ) : null}

        {state && !state.ok ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}

        {isFinalStep ? (
          <ActionButton
            isFinalStep
            pendingLabel="Submitting..."
            continueLabel="Continue"
            submitLabel="Submit Registration"
          />
        ) : (
          <Button type="button" className="w-full" onClick={handleContinue}>
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Lock className="h-3 w-3 shrink-0" />
          Your data is secure and encrypted
        </p>
      </form>
    </RegistrationShell>
  );
}
