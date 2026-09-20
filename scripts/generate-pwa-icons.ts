/**
 * Generate PWA icons from public/gymdesk-icon.png.
 *
 * Usage: npm run pwa
 */
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp, { type Sharp } from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const ICONS_DIR = path.join(PUBLIC, "icons");
const ICON_SOURCE = path.join(PUBLIC, "gymdesk-icon.png");

/** Android/PWA maskable safe zone — keep artwork inside the central 80%. */
const MASKABLE_SAFE_RATIO = 0.8;

function resolveIconSource(): string {
  const envSource = process.env.ICON_SOURCE?.trim();
  if (envSource) {
    const resolved = path.isAbsolute(envSource)
      ? envSource
      : path.join(PUBLIC, envSource);
    if (existsSync(resolved)) return resolved;
    throw new Error(`ICON_SOURCE not found: ${resolved}`);
  }

  if (!existsSync(ICON_SOURCE)) {
    throw new Error(
      "Icon source not found. Add public/gymdesk-icon.png and re-run.",
    );
  }

  return ICON_SOURCE;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Sample corner pixels so maskable padding matches the supplied artwork. */
async function sampleBackgroundColor(source: Sharp): Promise<string> {
  const { data, info } = await source
    .clone()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const sample = (x: number, y: number) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i]!, data[i + 1]!, data[i + 2]!] as const;
  };

  const corners = [
    sample(0, 0),
    sample(info.width - 1, 0),
    sample(0, info.height - 1),
    sample(info.width - 1, info.height - 1),
  ];

  const r = Math.round(corners.reduce((sum, px) => sum + px[0], 0) / corners.length);
  const g = Math.round(corners.reduce((sum, px) => sum + px[1], 0) / corners.length);
  const b = Math.round(corners.reduce((sum, px) => sum + px[2], 0) / corners.length);

  return rgbToHex(r, g, b);
}

/** Full-bleed icon — direct downscale of the supplied square artwork. */
async function writeRegularIcon(source: Sharp, size: number, outputPath: string) {
  await source.clone().resize(size, size).png().toFile(outputPath);
}

/**
 * Maskable icon — artwork scaled into the central safe zone on a matching
 * neon-green canvas (never black).
 */
async function writeMaskableIcon(
  source: Sharp,
  size: number,
  outputPath: string,
  background: string,
) {
  const artworkSize = Math.round(size * MASKABLE_SAFE_RATIO);
  const artwork = await source
    .clone()
    .resize(artworkSize, artworkSize)
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: artwork, gravity: "center" }])
    .png()
    .toFile(outputPath);
}

async function verifyRegularIcon(
  sourcePath: string,
  outputPath: string,
  size: number,
): Promise<boolean> {
  const expected = await sharp(sourcePath).resize(size, size).png().toBuffer();
  const actual = await sharp(outputPath).png().toBuffer();
  return expected.equals(actual);
}

async function main() {
  const sourcePath = resolveIconSource();
  await mkdir(ICONS_DIR, { recursive: true });

  const source = sharp(sourcePath);
  const metadata = await source.metadata();
  const background = await sampleBackgroundColor(source);

  console.log(`Source: ${path.relative(ROOT, sourcePath)}`);
  console.log(
    `Source dimensions: ${metadata.width ?? "?"}x${metadata.height ?? "?"}`,
  );
  console.log(`Sampled background: ${background}`);

  await writeRegularIcon(source, 192, path.join(ICONS_DIR, "icon-192x192.png"));
  await writeRegularIcon(source, 512, path.join(ICONS_DIR, "icon-512x512.png"));
  await writeRegularIcon(source, 180, path.join(ICONS_DIR, "apple-touch-icon.png"));
  await writeMaskableIcon(
    source,
    512,
    path.join(ICONS_DIR, "icon-512x512-maskable.png"),
    background,
  );

  await sharp(path.join(ICONS_DIR, "icon-192x192.png"))
    .resize(32, 32)
    .png()
    .toFile(path.join(PUBLIC, "favicon.ico"));

  const checks = await Promise.all([
    verifyRegularIcon(sourcePath, path.join(ICONS_DIR, "icon-192x192.png"), 192),
    verifyRegularIcon(sourcePath, path.join(ICONS_DIR, "icon-512x512.png"), 512),
    verifyRegularIcon(
      sourcePath,
      path.join(ICONS_DIR, "apple-touch-icon.png"),
      180,
    ),
  ]);

  if (!checks.every(Boolean)) {
    throw new Error("Generated icons do not match the source artwork.");
  }

  console.log("Generated PWA icons in public/icons/:");
  console.log("  icon-192x192.png (192x192, full bleed)");
  console.log("  icon-512x512.png (512x512, full bleed)");
  console.log("  apple-touch-icon.png (180x180, full bleed)");
  console.log(
    `  icon-512x512-maskable.png (512x512, ${Math.round(MASKABLE_SAFE_RATIO * 100)}% safe zone)`,
  );
  console.log("  ../favicon.ico (32x32, from 192px icon)");
  console.log("Verification: all regular icons are pixel-identical downscales of gymdesk-icon.png");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
