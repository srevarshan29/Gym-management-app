/**
 * Generate PWA icons from the GymDesk logo in /public.
 *
 * Usage: npm run pwa:icons  (or npm run pwa)
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp, { type Sharp } from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const ICONS_DIR = path.join(PUBLIC, "icons");
const CANONICAL_LOGO = path.join(PUBLIC, "logo.png");

/** Neon green — full-bleed PWA icon background (matches theme --primary). */
const ICON_BACKGROUND = "#B8FF29";

const PREFERRED_SOURCES = [
  "Logo.png (2).png",
  "logo.png",
  "logo.png.png",
  "Logo.png",
];

function newestMatchingLogo(): string | null {
  const entries = readdirSync(PUBLIC, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^logo/i.test(name) && /\.png$/i.test(name));

  if (entries.length === 0) return null;

  let newest = entries[0]!;
  let newestMtime = statSync(path.join(PUBLIC, newest)).mtimeMs;

  for (const name of entries.slice(1)) {
    const mtime = statSync(path.join(PUBLIC, name)).mtimeMs;
    if (mtime > newestMtime) {
      newest = name;
      newestMtime = mtime;
    }
  }

  return path.join(PUBLIC, newest);
}

function resolveLogoPath(): string {
  const envSource = process.env.LOGO_SOURCE?.trim();
  if (envSource) {
    const resolved = path.isAbsolute(envSource)
      ? envSource
      : path.join(PUBLIC, envSource);
    if (existsSync(resolved)) return resolved;
    throw new Error(`LOGO_SOURCE not found: ${resolved}`);
  }

  for (const name of PREFERRED_SOURCES) {
    const candidate = path.join(PUBLIC, name);
    if (existsSync(candidate)) return candidate;
  }

  const discovered = newestMatchingLogo();
  if (discovered) return discovered;

  throw new Error(
    "Logo not found. Add public/logo.png or public/Logo.png (2).png and re-run.",
  );
}

async function syncCanonicalLogo(sourcePath: string) {
  if (path.resolve(sourcePath) === path.resolve(CANONICAL_LOGO)) return;

  await copyFile(sourcePath, CANONICAL_LOGO);
  console.log(`Synced ${path.basename(sourcePath)} -> public/logo.png`);
}

async function writeSquareIcon(
  source: Sharp,
  size: number,
  outputPath: string,
  options?: { maskable?: boolean },
) {
  // Previously: logo was shrunk (4–14% inset) and composited onto #101012,
  // which produced a visible black ring around the neon-green logo square.
  //
  // Regular icons: fill ~96% so the dumbbell scales up without clipping.
  // Maskable icons: ~84% safe zone (OS masks only) — padding stays neon green.
  const fillRatio = options?.maskable ? 0.84 : 0.96;
  const logoBox = Math.round(size * fillRatio);

  const logoBuffer = await source
    .clone()
    .resize(logoBox, logoBox, {
      fit: "contain",
      background: ICON_BACKGROUND,
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: ICON_BACKGROUND,
    },
  })
    .composite([{ input: logoBuffer, gravity: "center" }])
    .png()
    .toFile(outputPath);
}

async function main() {
  const logoPath = resolveLogoPath();
  await mkdir(ICONS_DIR, { recursive: true });
  await syncCanonicalLogo(logoPath);

  const source = sharp(logoPath);

  await writeSquareIcon(source, 192, path.join(ICONS_DIR, "icon-192x192.png"));
  await writeSquareIcon(source, 512, path.join(ICONS_DIR, "icon-512x512.png"));
  await writeSquareIcon(source, 180, path.join(ICONS_DIR, "apple-touch-icon.png"));
  await writeSquareIcon(
    source,
    512,
    path.join(ICONS_DIR, "icon-512x512-maskable.png"),
    { maskable: true },
  );

  await sharp(path.join(ICONS_DIR, "icon-192x192.png"))
    .resize(32, 32)
    .png()
    .toFile(path.join(PUBLIC, "favicon.ico"));

  console.log("Generated PWA icons in public/icons/:");
  console.log("  icon-192x192.png");
  console.log("  icon-512x512.png");
  console.log("  apple-touch-icon.png (180x180)");
  console.log("  icon-512x512-maskable.png");
  console.log("  ../favicon.ico (from 192px icon)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
