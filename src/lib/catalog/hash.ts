import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

/** SHA-256 hex digest of a UTF-8 file (used for manifest integrity checks). */
export function sha256FileHex(filePath: string): string {
  const contents = readFileSync(filePath, "utf8");
  return sha256Hex(contents);
}

export function sha256Hex(contents: string): string {
  return createHash("sha256").update(contents, "utf8").digest("hex");
}
