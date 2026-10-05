const YOUTUBE_VIDEO_ID_PATTERN = /^[\w-]{11}$/;

const ALLOWED_YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
]);

export type YouTubeUrlValidationResult =
  | { ok: true; normalizedUrl: string; videoId: string }
  | { ok: false; error: string };

function extractVideoId(hostname: string, pathname: string, searchParams: URLSearchParams): string | null {
  const host = hostname.toLowerCase();

  if (host === "youtu.be") {
    const id = pathname.replace(/^\//, "").split("/")[0]?.trim();
    return id && YOUTUBE_VIDEO_ID_PATTERN.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com") {
    if (pathname === "/watch") {
      const id = searchParams.get("v")?.trim();
      return id && YOUTUBE_VIDEO_ID_PATTERN.test(id) ? id : null;
    }
    const embedMatch = /^\/embed\/([\w-]{11})$/.exec(pathname);
    if (embedMatch?.[1] && YOUTUBE_VIDEO_ID_PATTERN.test(embedMatch[1])) {
      return embedMatch[1];
    }
  }

  return null;
}

/** Parses and normalizes an optional YouTube watch URL (https only). */
export function validateYouTubeVideoUrl(raw: string): YouTubeUrlValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter a YouTube URL or leave this field empty." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "Enter a valid YouTube URL." };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, error: "YouTube URL must use https." };
  }

  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_YOUTUBE_HOSTS.has(host)) {
    return { ok: false, error: "Only youtube.com and youtu.be links are allowed." };
  }

  const videoId = extractVideoId(host, parsed.pathname, parsed.searchParams);
  if (!videoId) {
    return { ok: false, error: "Could not find a YouTube video ID in that URL." };
  }

  return {
    ok: true,
    videoId,
    normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

/** Empty/whitespace → null; otherwise validates and returns normalized https watch URL. */
export function parseOptionalYouTubeUrl(
  raw: string | null | undefined,
): YouTubeUrlValidationResult | { ok: true; normalizedUrl: null } {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) {
    return { ok: true, normalizedUrl: null };
  }
  return validateYouTubeVideoUrl(trimmed);
}

/** Re-validates stored URL before rendering member links. */
export function getSafeYouTubeWatchUrl(stored: string | null | undefined): string | null {
  if (!stored?.trim()) return null;
  const result = validateYouTubeVideoUrl(stored);
  return result.ok ? result.normalizedUrl : null;
}
