import { normalizeCatalogName } from "@/lib/exercises/catalog-search";

const STOP_TOKENS = new Set([
  "and",
  "the",
  "with",
  "without",
  "nfs",
  "ns",
  "as",
  "purchased",
  "all",
  "commercial",
  "samples",
  "includes",
  "foods",
]);

/** Curated display labels for common canonical identities. */
export const NUTRITION_CANONICAL_DISPLAY: Record<string, string> = {
  "egg:whole:raw": "Whole Egg",
  "egg:white:raw": "Egg White",
  "egg:yolk:raw": "Egg Yolk",
  "egg:whole:cooked": "Boiled Egg",
  "egg:white:cooked": "Cooked Egg White",
  "egg:yolk:cooked": "Cooked Egg Yolk",
  "rice:white:cooked": "White Rice, Cooked",
  "rice:white:raw": "White Rice, Raw",
  "rice:brown:cooked": "Brown Rice, Cooked",
  "rice:brown:raw": "Brown Rice, Raw",
  "rice:wild:cooked": "Wild Rice, Cooked",
  "chicken:breast:cooked": "Chicken Breast, Cooked",
  "chicken:breast:raw": "Chicken Breast, Raw",
  "banana:raw": "Banana",
  "banana:dried": "Banana, Dried",
  "potato:sweet:raw": "Sweet Potato",
  "potato:sweet:cooked": "Sweet Potato, Cooked",
  "vegetable:sweet-potato-leaves": "Sweet Potato Leaves",
  "potato:sweet:fried": "Sweet Potatoes, Fried",
  "indian:rice:raw:milled": "Rice (Raw, Milled)",
  "indian:rice:parboiled:milled": "Rice (Parboiled)",
  "indian:rice:raw:brown": "Brown Rice (Raw)",
  "indian:rice:poha": "Poha (Rice Flakes)",
  "indian:paneer": "Paneer",
  "indian:curd": "Curd",
  "indian:dal:toor": "Toor Dal",
  "indian:dal:moong": "Moong Dal",
  "indian:dal:urad": "Urad Dal",
  "indian:dal:chana": "Chana Dal",
  "indian:dal:masoor": "Masoor Dal",
  "indian:millet:ragi": "Ragi",
  "indian:wheat:atta": "Wheat Atta",
  "indian:wheat:semolina": "Semolina (Rava)",
  "indian:coconut:fresh": "Coconut (Fresh)",
};

/** Higher values surface first in search and win import deduplication ties. */
export const NUTRITION_CANONICAL_SEARCH_BOOST: Record<string, number> = {
  "egg:whole:raw": 100,
  "egg:white:raw": 95,
  "egg:yolk:raw": 90,
  "egg:whole:cooked": 88,
  "egg:white:cooked": 70,
  "egg:yolk:cooked": 68,
  "rice:white:cooked": 100,
  "rice:white:raw": 75,
  "rice:brown:cooked": 85,
  "rice:brown:raw": 70,
  "chicken:breast:cooked": 100,
  "chicken:breast:raw": 90,
  "banana:raw": 100,
  "banana:dried": 60,
  "potato:sweet:raw": 95,
  "potato:sweet:cooked": 90,
  "indian:paneer": 100,
  "indian:curd": 100,
  "indian:dal:toor": 98,
  "indian:dal:moong": 96,
  "indian:dal:urad": 96,
  "indian:dal:chana": 94,
  "indian:dal:masoor": 94,
  "indian:rice:raw:milled": 92,
  "indian:rice:parboiled:milled": 88,
  "indian:rice:raw:brown": 85,
  "indian:millet:ragi": 90,
  "indian:rice:poha": 80,
  "indian:wheat:atta": 75,
  "indian:wheat:semolina": 72,
  "indian:coconut:fresh": 70,
};

function slugTokens(normalizedName: string, maxTokens = 6): string {
  const tokens = normalizedName
    .replace(/,/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}-]/gu, ""))
    .filter((t) => t.length > 0 && !STOP_TOKENS.has(t));
  return tokens.slice(0, maxTokens).join("-") || "unknown";
}

function eggCanonical(n: string): string {
  const part = /\bwhite\b/.test(n)
    ? "white"
    : /\byolk\b/.test(n)
      ? "yolk"
      : /\bwhole\b/.test(n) || /^egg\b/.test(n)
        ? "whole"
        : "other";

  if (part === "other") {
    return `egg:other:${slugTokens(n)}`;
  }

  const cooked = /\bhard boiled|hard-boiled|boiled|poached|scrambled|fried|omelet|omelette|cooked\b/.test(
    n,
  );
  const state = /\bdried|powder|dehydrated\b/.test(n)
    ? "dried"
    : /\bfrozen|pasteurized\b/.test(n)
      ? "processed"
      : cooked
        ? "cooked"
        : "raw";

  return `egg:${part}:${state}`;
}

function chickenCanonical(n: string): string {
  const cut = /\bbreast\b/.test(n)
    ? "breast"
    : /\bthigh\b/.test(n)
      ? "thigh"
      : /\bwing\b/.test(n)
        ? "wing"
        : /\bdrumstick\b/.test(n)
          ? "drumstick"
          : "other";
  const cooked = /\broasted|grilled|fried|baked|boiled|cooked|rotisserie\b/.test(
    n,
  )
    ? "cooked"
    : "raw";
  if (cut === "breast") {
    return `chicken:breast:${cooked}`;
  }
  return `chicken:${cut}:${cooked}`;
}

function riceCanonical(n: string): string {
  const type = /\bbrown\b/.test(n)
    ? "brown"
    : /\bwild\b/.test(n)
      ? "wild"
      : "white";
  const state = /\bcooked|prepared|steamed\b/.test(n) ? "cooked" : "raw";
  return `rice:${type}:${state}`;
}

/**
 * Stable identity for deduplication and search grouping (not tied to USDA fdcId).
 */
export function computeNutritionCanonicalKey(usdaDescription: string): string {
  const n = normalizeCatalogName(usdaDescription).replace(/,/g, " ");

  if (/\beggplant\b/.test(n)) {
    return "vegetable:eggplant";
  }

  if (/\begg\b/.test(n) && !/\beggplant\b/.test(n)) {
    return eggCanonical(n);
  }

  if (/\bchicken\b/.test(n)) {
    return chickenCanonical(n);
  }

  if (/\brice flour\b/.test(n)) {
    return "rice:flour";
  }
  if (/\brice noodles\b/.test(n)) {
    return "rice:noodles";
  }
  if (/\brice\b/.test(n) && !/\brice wine|rice paper\b/.test(n)) {
    return riceCanonical(n);
  }

  if (/\bbananas?\b/.test(n)) {
    return /\bdried|dehydrated\b/.test(n) ? "banana:dried" : "banana:raw";
  }

  if (/\bsweet potato(?:es)?\b/.test(n)) {
    if (/\bleaves\b/.test(n)) {
      return "vegetable:sweet-potato-leaves";
    }
    if (/\bchips|puffs\b/.test(n)) {
      return `generic:${slugTokens(n)}`;
    }
    if (/\bfrench fried|fried\b/.test(n)) {
      return "potato:sweet:fried";
    }
    const cooked = /\bcooked|baked|roasted|boiled|steamed\b/.test(n);
    return cooked ? "potato:sweet:cooked" : "potato:sweet:raw";
  }

  return `generic:${slugTokens(n)}`;
}

export function nutritionSearchBoostForCanonical(canonicalKey: string): number {
  return NUTRITION_CANONICAL_SEARCH_BOOST[canonicalKey] ?? 0;
}

function titleCaseWords(text: string): string {
  return text
    .split(/\s+/)
    .map((w) => (w.length ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * User-facing label — prefer curated names, otherwise shorten USDA description.
 */
export function nutritionDisplayNameForFood(
  usdaDescription: string,
  canonicalKey: string,
): string {
  const curated = NUTRITION_CANONICAL_DISPLAY[canonicalKey];
  if (curated) return curated;

  const primary = usdaDescription.split(",")[0]?.trim() || usdaDescription.trim();
  return titleCaseWords(primary);
}

/** Legacy catalog rows imported before canonicalKey existed. */
export function legacyCanonicalKeyFromName(name: string): string {
  return computeNutritionCanonicalKey(name);
}

export function nutritionDisplayNameFromDoc(doc: {
  name: string;
  displayName?: string;
  canonicalKey?: string;
}): string {
  const canonicalKey =
    doc.canonicalKey ?? legacyCanonicalKeyFromName(doc.name);
  const curated = NUTRITION_CANONICAL_DISPLAY[canonicalKey];
  if (curated) return curated;
  if (doc.displayName?.trim()) return doc.displayName.trim();
  return nutritionDisplayNameForFood(doc.name, canonicalKey);
}

export function nutritionCanonicalKeyFromDoc(doc: {
  name: string;
  canonicalKey?: string;
}): string {
  return doc.canonicalKey ?? legacyCanonicalKeyFromName(doc.name);
}
