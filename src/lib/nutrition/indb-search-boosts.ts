/** Member-query boosts for INDB catalog rows (`canonicalKey` prefix `indb:`). */

type DishBoostRule = {
  queryTokens: string[];
  test: (haystack: string) => boolean;
  boost: number;
};

const DISH_RULES: DishBoostRule[] = [
  {
    queryTokens: ["dosa", "dos"],
    test: (h) => /\bdosa\b/.test(h),
    boost: 520,
  },
  {
    queryTokens: ["idli", "idl"],
    test: (h) => /\bidli\b/.test(h),
    boost: 520,
  },
  {
    queryTokens: ["sambar", "sam"],
    test: (h) => /\bsambar\b/.test(h) && !/\bsambar powder\b/.test(h),
    boost: 480,
  },
  {
    queryTokens: ["pongal"],
    test: (h) => /\bpongal\b/.test(h),
    boost: 500,
  },
  {
    queryTokens: ["upma"],
    test: (h) => /\bupma\b/.test(h),
    boost: 480,
  },
  {
    queryTokens: ["vada", "vad"],
    test: (h) => /\bvada\b/.test(h) || /\bvadas\b/.test(h),
    boost: 460,
  },
  {
    queryTokens: ["chapati", "roti"],
    test: (h) => /\bchapati\b/.test(h) || /\broti\b/.test(h),
    boost: 500,
  },
  {
    queryTokens: ["parotta", "paratha", "porotta"],
    test: (h) =>
      /\bparotta\b/.test(h) ||
      /\bparatha\b/.test(h) ||
      /\bparantha\b/.test(h) ||
      /\bporotta\b/.test(h),
    boost: 480,
  },
  {
    queryTokens: ["paneer"],
    test: (h) => /\bpaneer\b/.test(h),
    boost: 380,
  },
  {
    queryTokens: ["dal", "daal"],
    test: (h) =>
      /\bdal\b/.test(h) ||
      /\bdaal\b/.test(h) ||
      /\bdahl\b/.test(h),
    boost: 340,
  },
  {
    queryTokens: ["khichdi", "khichri", "pongal"],
    test: (h) => /\bkhichdi\b/.test(h) || /\bkhichri\b/.test(h),
    boost: 200,
  },
];

export function indbBaseSearchBoost(recordType: "recipe" | "ingredient"): number {
  return recordType === "recipe" ? 72 : 40;
}

/** Static catalog `searchBoost` from dish keywords in the INDB name/aliases. */
export function indbSearchBoostFromName(
  recordType: "recipe" | "ingredient",
  foodName: string,
  aliases: string[],
): number {
  const hay = `${foodName} ${aliases.join(" ")}`.toLowerCase();
  let boost = indbBaseSearchBoost(recordType);
  for (const rule of DISH_RULES) {
    if (rule.test(hay)) {
      boost += Math.min(28, Math.round(rule.boost / 18));
    }
  }
  return Math.min(100, boost);
}

export function scoreIndbFoodSearch(
  queryTokens: string[],
  canonicalKey: string,
  displayLower: string,
  nameLower: string,
  aliasText: string,
): number {
  if (!canonicalKey.startsWith("indb:")) return 0;

  const tokenSet = new Set(queryTokens);
  const hay = `${displayLower} ${nameLower} ${aliasText}`.toLowerCase();
  let bonus = 45;

  for (const rule of DISH_RULES) {
    if (!rule.queryTokens.some((t) => tokenSet.has(t))) continue;
    if (rule.test(hay)) {
      bonus += rule.boost;
    }
  }

  return bonus;
}
