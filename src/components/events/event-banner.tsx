"use client";

import * as React from "react";
import { CalendarDays, Dumbbell, MapPin, Sparkles } from "lucide-react";

import { cn, formatDate } from "@/lib/utils";

export type EventBannerProps = {
  title: string;
  eventDate: Date | string;
  location: string;
  description?: string | null;
  bannerImageUrl?: string | null;
  className?: string;
  /** Taller hero for announcement modal */
  variant?: "card" | "hero";
};

function trimmedImageUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  return trimmed ? trimmed : null;
}

function EventBannerFallback({
  title,
  eventDate,
  location,
  variant,
}: Pick<EventBannerProps, "title" | "eventDate" | "location" | "variant">) {
  const dateLabel = formatDate(eventDate);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        variant === "hero" ? "aspect-[16/9] min-h-[168px]" : "aspect-[21/9] min-h-[120px]",
      )}
      role="img"
      aria-label={`Event banner for ${title}`}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 640 280"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <linearGradient id="evt-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0f1814" />
            <stop offset="55%" stopColor="#162820" />
            <stop offset="100%" stopColor="#1a3228" />
          </linearGradient>
          <linearGradient id="evt-glow" x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#B6FF00" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#B6FF00" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width={640} height={280} fill="url(#evt-bg)" />
        <ellipse cx={520} cy={60} rx={180} ry={70} fill="url(#evt-glow)" />
        <path
          d="M0 240 C 120 170, 220 200, 320 160 S 520 110, 640 130 L 640 280 L 0 280 Z"
          fill="#1e3028"
          opacity={0.85}
        />
        <path
          d="M0 260 C 80 210, 200 220, 280 180 C 360 145, 450 150, 640 105 L 640 280 L 0 280 Z"
          fill="#243a30"
        />
        <circle cx={88} cy={72} r={3} fill="#B6FF00" opacity={0.7} />
        <circle cx={120} cy={54} r={2} fill="#B6FF00" opacity={0.45} />
        <circle cx={560} cy={88} r={2.5} fill="#B6FF00" opacity={0.55} />
      </svg>

      <div className="relative flex h-full flex-col justify-between p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-[#B6FF00]">
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em]">
              Gym event
            </span>
          </div>
          <Dumbbell
            className="h-5 w-5 shrink-0 text-[#B6FF00]/80"
            strokeWidth={1.75}
            aria-hidden
          />
        </div>

        <div className="mt-auto space-y-2">
          <p className="font-display text-lg font-bold leading-snug text-foreground sm:text-xl">
            {title}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-[#B6FF00]" aria-hidden />
              {dateLabel}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#B6FF00]" aria-hidden />
              {location}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EventBanner({
  title,
  eventDate,
  location,
  description: _description,
  bannerImageUrl,
  className,
  variant = "card",
}: EventBannerProps) {
  const [failed, setFailed] = React.useState(false);
  const imageUrl = trimmedImageUrl(bannerImageUrl);

  React.useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  if (!imageUrl || failed) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-xl ring-1 ring-white/10",
          className,
        )}
      >
        <EventBannerFallback
          title={title}
          eventDate={eventDate}
          location={location}
          variant={variant}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl bg-muted ring-1 ring-border/60",
        variant === "hero" ? "aspect-[16/9] min-h-[168px]" : "aspect-[21/9] min-h-[120px]",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={`${title} event banner`}
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
