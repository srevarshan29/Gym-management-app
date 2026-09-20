import Image from "next/image";

import { GYMDESK_LOGO_ALT, GYMDESK_LOGO_PATH } from "@/lib/branding";
import { cn } from "@/lib/utils";

const VARIANTS = {
  /** Sidebar / compact header mark */
  mark: {
    container: "h-9 w-9",
    width: 36,
    height: 36,
    image: "max-h-9 max-w-9",
  },
  /** Login / auth hero */
  hero: {
    container: "h-14 w-14",
    width: 56,
    height: 56,
    image: "max-h-14 max-w-[10rem]",
  },
  /** Mobile app header — horizontal wordmark */
  header: {
    container: "h-8 max-w-[9rem]",
    width: 144,
    height: 32,
    image: "max-h-8 max-w-[9rem]",
  },
} as const;

export type GymDeskLogoVariant = keyof typeof VARIANTS;

export function GymDeskLogo({
  variant = "mark",
  className,
  imageClassName,
  priority = false,
}: {
  variant?: GymDeskLogoVariant;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}) {
  const styles = VARIANTS[variant];

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden",
        styles.container,
        className,
      )}
    >
      <Image
        src={GYMDESK_LOGO_PATH}
        alt={GYMDESK_LOGO_ALT}
        width={styles.width}
        height={styles.height}
        className={cn("h-auto w-auto object-contain", styles.image, imageClassName)}
        priority={priority}
      />
    </div>
  );
}
