"use client";

import * as React from "react";
import type { MemberGender } from "@/lib/firestore/types";

import { Button } from "@/components/ui/button";
import { getMemberFallbackAvatarUri } from "@/lib/member-avatar-art";
import { formatMemberNumber } from "@/lib/receipt-display";
import type { AttendanceCheckInResult } from "@/lib/attendance/types";
import { cn } from "@/lib/utils";

type SuccessData = Extract<AttendanceCheckInResult, { status: "success" }>;

function formatKioskTime(checkedInAt: Date): string {
  const time = checkedInAt.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `Today • ${time}`;
}

function isValidPhotoUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && url.trim().length > 0;
}

function KioskMemberPhoto({
  photoUrl,
  gender,
  memberId,
}: {
  name: string;
  photoUrl: string | null;
  gender: MemberGender;
  memberId: string;
}) {
  const [imageFailed, setImageFailed] = React.useState(false);
  const showPhoto = isValidPhotoUrl(photoUrl) && !imageFailed;

  React.useEffect(() => {
    setImageFailed(false);
  }, [photoUrl]);

  const fallbackSrc = React.useMemo(
    () => getMemberFallbackAvatarUri(memberId, gender, "lg"),
    [memberId, gender],
  );

  return (
    <div
      className={cn(
        "mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-primary/50 bg-muted shadow-[0_0_24px_hsl(var(--primary)/0.25)] sm:h-32 sm:w-32",
      )}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fallbackSrc}
          alt=""
          aria-hidden
          className="h-[4.5rem] w-[4.5rem] object-contain sm:h-20 sm:w-20"
          draggable={false}
        />
      )}
    </div>
  );
}

type AttendanceKioskSuccessProps = {
  data: SuccessData;
  onContinue: () => void;
};

export function AttendanceKioskSuccess({
  data,
  onContinue,
}: AttendanceKioskSuccessProps) {
  const firstName = data.memberName.trim().split(/\s+/)[0] ?? data.memberName;

  return (
    <div
      className="w-full rounded-2xl border border-primary/30 bg-card px-4 py-4 text-center text-card-foreground shadow-[0_0_32px_hsl(var(--primary)/0.15)] sm:px-5 sm:py-5"
      role="status"
    >
      <KioskMemberPhoto
        name={data.memberName}
        photoUrl={data.photoUrl}
        gender={data.gender}
        memberId={data.memberId}
      />

      <p className="mt-3 font-display text-base font-bold tracking-wide text-primary sm:text-lg">
        ✓ CHECK-IN SUCCESSFUL
      </p>

      <p className="mt-1.5 font-display text-lg font-semibold text-foreground sm:text-xl">
        Welcome back, {firstName}!
      </p>

      <p className="mt-1.5 text-base text-muted-foreground sm:text-lg">
        {formatMemberNumber(data.memberNumber)}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
        {formatKioskTime(data.checkedInAt)}
      </p>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 sm:mt-4"
        onClick={onContinue}
      >
        Next member
      </Button>
    </div>
  );
}
