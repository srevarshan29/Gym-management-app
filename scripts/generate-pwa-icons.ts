/**
 * Generate PWA icons from public/logo.png (or public/logo.png.png fallback).
 *
 * Usage: npx tsx scripts/generate-pwa-icons.ts
 */
import { existsSync } from "node:fs";
import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp, { type Sharp } from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const ICONS_DIR = path.join(PUBLIC, "icons");

/** Dark app background — matches globals.css .dark --background (240 6% 7%). */
const BACKGROUND = "#101012";

function resolveLogoPath(): string {
  const primary = path.join(PUBLIC, "logo.png");
  const fallback = path.join(PUBLIC, "logo.png.png");
  if (existsSync(primary)) return primary;
  if (existsSync(fallback)) return fallback;
  throw new Error(
    "Logo not found. Add public/logo.png (or public/logo.png.png) and re-run.",
  );
}

async function writeSquareIcon(
  source: Sharp,
  size: number,
  outputPath: string,
  options?: { maskable?: boolean },
) {
  if (options?.maskable) {
    const inset = Math.round(size * 0.1);
    const logoSize = size - inset * 2;
    const logoBuffer = await source
      .clone()
      .resize(logoSize, logoSize, { fit: "contain", background: BACKGROUND })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: BACKGROUND,
      },
    })
      .composite([{ input: logoBuffer, gravity: "center" }])
      .png()
      .toFile(outputPath);
    return;
  }

  await source
    .clone()
    .resize(size, size, { fit: "contain", background: BACKGROUND })
    .png()
    .toFile(outputPath);
}

async function main() {
  const logoPath = resolveLogoPath();
  await mkdir(ICONS_DIR, { recursive: true });

  if (!existsSync(path.join(PUBLIC, "logo.png"))) {
    await copyFile(logoPath, path.join(PUBLIC, "logo.png"));
    console.log("Copied source logo to public/logo.png");
  }

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

  console.log("Generated PWA icons in public/icons/:");
  console.log("  icon-192x192.png");
  console.log("  icon-512x512.png");
  console.log("  apple-touch-icon.png (180x180)");
  console.log("  icon-512x512-maskable.png");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
