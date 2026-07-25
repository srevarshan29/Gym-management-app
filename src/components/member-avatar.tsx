"use client";

import * as React from "react";
import type { MemberGender } from "@prisma/client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getMemberFallbackAvatarUri,
  MEMBER_AVATAR_SIZE_CLASS,
  type MemberAvatarSize,
} from "@/lib/member-avatar-art";
import { cn } from "@/lib/utils";

export type { MemberGender };

type MemberAvatarProps = {
  name: string;
  photoUrl?: string | null;
  gender?: MemberGender | null;
  /** Stable id for deterministic fallback art (defaults to name). */
  seed?: string;
  size?: MemberAvatarSize;
  className?: string;
};

function isValidPhotoUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && url.trim().length > 0;
}

function FallbackImage({
  seed,
  gender,
  size,
  className,
}: {
  seed: string;
  gender?: MemberGender | null;
  size: MemberAvatarSize;
  className?: string;
}) {
  const src = React.useMemo(
    () => getMemberFallbackAvatarUri(seed, gender, size),
    [seed, gender, size],
  );

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden
      className={cn("h-full w-full object-cover", className)}
      draggable={false}
    />
  );
}

function IllustratedFallback({
  name,
  seed,
  gender,
  size,
  className,
}: {
  name: string;
  seed: string;
  gender?: MemberGender | null;
  size: MemberAvatarSize;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-muted",
        MEMBER_AVATAR_SIZE_CLASS[size],
        className,
      )}
      aria-label={name}
    >
      <FallbackImage seed={seed} gender={gender} size={size} />
    </div>
  );
}

/** Avatar with uploaded photo, or gender-based illustrated fallback when none. */
export function MemberAvatar({
  name,
  photoUrl,
  gender,
  seed,
  size = "sm",
  className,
}: MemberAvatarProps) {
  const avatarSeed = seed ?? name;
  const validPhoto = isValidPhotoUrl(photoUrl);
  const [imageFailed, setImageFailed] = React.useState(false);
  const showPhoto = validPhoto && !imageFailed;

  React.useEffect(() => {
    setImageFailed(false);
  }, [photoUrl]);

  if (!showPhoto) {
    return (
      <IllustratedFallback
        name={name}
        seed={avatarSeed}
        gender={gender}
        size={size}
        className={className}
      />
    );
  }

  return (
    <Avatar
      className={cn("shrink-0", MEMBER_AVATAR_SIZE_CLASS[size], className)}
    >
      <AvatarImage
        src={photoUrl}
        alt={name}
        className="object-cover"
        onLoadingStatusChange={(status) => {
          if (status === "error") setImageFailed(true);
        }}
      />
      <AvatarFallback delayMs={0} className="overflow-hidden p-0">
        <FallbackImage seed={avatarSeed} gender={gender} size={size} />
      </AvatarFallback>
    </Avatar>
  );
}
