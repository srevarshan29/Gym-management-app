"use client";

import * as React from "react";
import type { MemberGender } from "@prisma/client";

import { getMemberFallbackAvatarUri } from "@/lib/member-avatar-art";
import { cn } from "@/lib/utils";

type MemberPhotoBannerProps = {
  name: string;
  photoUrl?: string | null;
  gender?: MemberGender | null;
  seed?: string;
  className?: string;
};

function isValidPhotoUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && url.trim().length > 0;
}

/**
 * Wide profile photo frame for member pages on mobile.
 * Uses object-contain so portrait uploads are shown in full, not zoomed to fill.
 */
export function MemberPhotoBanner({
  name,
  photoUrl,
  gender,
  seed,
  className,
}: MemberPhotoBannerProps) {
  const avatarSeed = seed ?? name;
  const validPhoto = isValidPhotoUrl(photoUrl);
  const [imageFailed, setImageFailed] = React.useState(false);
  const showPhoto = validPhoto && !imageFailed;

  React.useEffect(() => {
    setImageFailed(false);
  }, [photoUrl]);

  const fallbackSrc = React.useMemo(
    () => getMemberFallbackAvatarUri(avatarSeed, gender, "lg"),
    [avatarSeed, gender],
  );

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-border/60 bg-muted/50",
        className,
      )}
    >
      <div className="flex aspect-[4/3] max-h-52 w-full items-center justify-center p-3 sm:aspect-[3/2] sm:max-h-60 sm:p-4">
        {showPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={name}
            className="max-h-full max-w-full object-contain object-center"
            onError={() => setImageFailed(true)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fallbackSrc}
            alt=""
            aria-hidden
            className="h-24 w-24 object-contain sm:h-28 sm:w-28"
            draggable={false}
          />
        )}
      </div>
    </div>
  );
}
