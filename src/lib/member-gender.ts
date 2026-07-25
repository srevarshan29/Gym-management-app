import type { MemberGender } from "@prisma/client";

export const MEMBER_GENDER_OPTIONS: {
  value: MemberGender;
  label: string;
}[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];

export function memberGenderLabel(gender: MemberGender): string {
  return (
    MEMBER_GENDER_OPTIONS.find((o) => o.value === gender)?.label ??
    "Prefer not to say"
  );
}
