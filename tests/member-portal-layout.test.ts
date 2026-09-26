import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("receipt modal preview", () => {
  it("loads PDF via fetch/blob preview instead of iframe embedding", () => {
    const modalSource = readFileSync(
      resolve("src/components/receipt-modal.tsx"),
      "utf8",
    );
    expect(modalSource).toContain("ReceiptPdfPreview");
    expect(modalSource).not.toContain("<iframe");
  });
});

describe("member portal mobile layout constraints", () => {
  it("clips horizontal overflow at the portal shell boundary", () => {
    const shellSource = readFileSync(
      resolve("src/components/member-portal/member-portal-shell.tsx"),
      "utf8",
    );
    expect(shellSource).toContain("overflow-x-clip");
  });

  it("keeps dialogs within the mobile viewport width", () => {
    const dialogSource = readFileSync(
      resolve("src/components/ui/dialog.tsx"),
      "utf8",
    );
    expect(dialogSource).toContain("max-w-[calc(100vw-2rem)]");
    expect(dialogSource).toContain("max-h-[min(90dvh");
    expect(dialogSource).toContain("overflow-y-auto");
  });
});

describe("staff member profile mobile layout", () => {
  it("constrains horizontal overflow and improves landscape header layout", () => {
    const pageSource = readFileSync(
      resolve("src/app/(app)/members/[id]/page.tsx"),
      "utf8",
    );
    expect(pageSource).toContain("overflow-x-clip");
    expect(pageSource).toContain("max-md:landscape:");
    expect(pageSource).toMatch(/min-w-0 overflow-x-auto/);
  });
});
