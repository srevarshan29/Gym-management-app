import { createHash } from "crypto";

export function sha256Hex(data: Buffer | string): string {
  const body = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return createHash("sha256").update(body).digest("hex");
}