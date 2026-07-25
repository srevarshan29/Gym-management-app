import { Avatar, Style } from "@dicebear/core";
import type { MemberGender } from "@prisma/client";
import adventurerDef from "@dicebear/styles/adventurer.json";
import loreleiDef from "@dicebear/styles/lorelei.json";
import notionistsDef from "@dicebear/styles/notionists.json";

const maleStyle = new Style(adventurerDef);
const femaleStyle = new Style(loreleiDef);
const neutralStyle = new Style(notionistsDef);

const uriCache = new Map<string, string>();

function styleForGender(gender?: MemberGender | null): Style {
  switch (gender) {
    case "MALE":
      return maleStyle;
    case "FEMALE":
      return femaleStyle;
    default:
      return neutralStyle;
  }
}

/** Pixel size for DiceBear SVG (2x display size for retina). */
export const MEMBER_AVATAR_RENDER_PX = {
  sm: 80,
  md: 96,
  lg: 112,
} as const;

export type MemberAvatarSize = keyof typeof MEMBER_AVATAR_RENDER_PX;

export const MEMBER_AVATAR_SIZE_CLASS: Record<MemberAvatarSize, string> = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-14 w-14",
};

/** Deterministic illustrated fallback avatar as a data URI. */
export function getMemberFallbackAvatarUri(
  seed: string,
  gender: MemberGender | null | undefined,
  size: MemberAvatarSize,
): string {
  const pixelSize = MEMBER_AVATAR_RENDER_PX[size];
  const cacheKey = `${gender ?? "neutral"}:${seed}:${pixelSize}`;
  const cached = uriCache.get(cacheKey);
  if (cached) return cached;

  const avatar = new Avatar(styleForGender(gender), {
    seed,
    size: pixelSize,
  });
  const uri = avatar.toDataUri();
  uriCache.set(cacheKey, uri);
  return uri;
}
