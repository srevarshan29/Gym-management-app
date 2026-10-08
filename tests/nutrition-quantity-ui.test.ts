import { describe, expect, it } from "vitest";

import {
  formatQuantityLabel,
  gramsFromQuantityInput,
  resolveQuantityMode,
  servingLabelForFood,
} from "@/lib/nutrition/quantity-ui";

describe("nutrition quantity ui", () => {
  it("uses count mode when serving size and label exist", () => {
    expect(
      resolveQuantityMode({
        name: "Chicken breast",
        servingSizeGrams: 50,
        servingSizeLabel: "1 fillet",
      }),
    ).toBe("count");
  });

  it("uses count mode for eggs when USDA portion text is missing", () => {
    expect(
      resolveQuantityMode({
        name: "Egg, whole, raw, frozen, pasteurized",
        servingSizeGrams: 28.4,
        servingSizeLabel: null,
      }),
    ).toBe("count");
    expect(
      servingLabelForFood({
        name: "Egg, whole, raw, frozen, pasteurized",
        servingSizeGrams: 28.4,
        servingSizeLabel: null,
      }),
    ).toBe("egg");
  });

  it("uses grams mode for rice without a serving label", () => {
    expect(
      resolveQuantityMode({
        name: "Rice, brown, long grain, unenriched, raw",
        servingSizeGrams: 45,
        servingSizeLabel: null,
      }),
    ).toBe("grams");
  });

  it("converts count to grams using serving weight", () => {
    expect(gramsFromQuantityInput("count", 4, 50)).toBe(200);
  });

  it("formats count labels as 2 dosa (not grams)", () => {
    const food = {
      name: "Masala dosa",
      servingSizeGrams: 210,
      servingSizeLabel: "dosa",
    };
    expect(resolveQuantityMode(food)).toBe("count");
    expect(
      formatQuantityLabel("count", 2, "dosa", gramsFromQuantityInput("count", 2, 210)),
    ).toBe("2 dosa");
  });
});
