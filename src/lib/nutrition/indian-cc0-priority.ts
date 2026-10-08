/**
 * South Indian / member-search priorities mapped to CC0 dataset rows (by exact name).
 * Prepared dishes absent from the dataset are listed in {@link SOUTH_INDIAN_DISHES_MISSING_FROM_CC0}.
 */
export type IndianCc0ImportTarget = {
  /** Checklist label (South Indian priority). */
  priorityLabel: string;
  memberDisplayName: string;
  canonicalKey: string;
  searchBoost: number;
  /** Exact `name` field in indian-nutrition-data foods.json */
  datasetName: string;
  aliases?: string[];
};

export const SOUTH_INDIAN_DISHES_MISSING_FROM_CC0 = [
  "Idli",
  "Dosa",
  "Masala Dosa",
  "Vada",
  "Pongal",
  "Upma",
  "Uttapam",
  "Appam",
  "Pesarattu",
  "Sambar",
  "Rasam",
  "Curd Rice",
  "Lemon Rice",
  "Tomato Rice",
  "Coconut Chutney",
  "Tomato Chutney",
  "Chapati",
  "Parotta",
] as const;

/** Curated CC0 rows to import (small v1 layer). */
export const INDIAN_CC0_IMPORT_TARGETS: IndianCc0ImportTarget[] = [
  {
    priorityLabel: "Rice",
    memberDisplayName: "Rice (Raw, Milled)",
    canonicalKey: "indian:rice:raw:milled",
    searchBoost: 92,
    datasetName: "Rice, raw, milled",
    aliases: ["chawal", "white rice"],
  },
  {
    priorityLabel: "Rice",
    memberDisplayName: "Rice (Parboiled)",
    canonicalKey: "indian:rice:parboiled:milled",
    searchBoost: 88,
    datasetName: "Rice, parboiled, milled",
    aliases: ["usna chawal"],
  },
  {
    priorityLabel: "Rice",
    memberDisplayName: "Brown Rice (Raw)",
    canonicalKey: "indian:rice:raw:brown",
    searchBoost: 85,
    datasetName: "Rice, raw, brown",
  },
  {
    priorityLabel: "Paneer",
    memberDisplayName: "Paneer",
    canonicalKey: "indian:paneer",
    searchBoost: 100,
    datasetName: "Paneer",
    aliases: ["chhena"],
  },
  {
    priorityLabel: "Curd",
    memberDisplayName: "Curd",
    canonicalKey: "indian:curd",
    searchBoost: 100,
    datasetName: "Curd (Dahi)",
    aliases: ["dahi", "yogurt"],
  },
  {
    priorityLabel: "Dal",
    memberDisplayName: "Toor Dal",
    canonicalKey: "indian:dal:toor",
    searchBoost: 98,
    datasetName: "Red gram, dal",
    aliases: ["arhar dal", "toor", "thuvaram paruppu"],
  },
  {
    priorityLabel: "Dal",
    memberDisplayName: "Moong Dal",
    canonicalKey: "indian:dal:moong",
    searchBoost: 96,
    datasetName: "Green gram, dal",
    aliases: ["mung dal"],
  },
  {
    priorityLabel: "Dal",
    memberDisplayName: "Urad Dal",
    canonicalKey: "indian:dal:urad",
    searchBoost: 96,
    datasetName: "Black gram, dal",
  },
  {
    priorityLabel: "Dal",
    memberDisplayName: "Chana Dal",
    canonicalKey: "indian:dal:chana",
    searchBoost: 94,
    datasetName: "Bengal gram, dal",
  },
  {
    priorityLabel: "Dal",
    memberDisplayName: "Masoor Dal",
    canonicalKey: "indian:dal:masoor",
    searchBoost: 94,
    datasetName: "Lentil dal",
  },
  {
    priorityLabel: "Rice",
    memberDisplayName: "Poha (Rice Flakes)",
    canonicalKey: "indian:rice:poha",
    searchBoost: 80,
    datasetName: "Rice flakes",
    aliases: ["poha", "aval"],
  },
  {
    priorityLabel: "Rice",
    memberDisplayName: "Ragi",
    canonicalKey: "indian:millet:ragi",
    searchBoost: 90,
    datasetName: "Ragi",
    aliases: ["finger millet"],
  },
  {
    priorityLabel: "Rice",
    memberDisplayName: "Wheat Atta",
    canonicalKey: "indian:wheat:atta",
    searchBoost: 75,
    datasetName: "Wheat flour, atta",
    aliases: ["atta", "chapati flour", "chapati"],
  },
  {
    priorityLabel: "Rice",
    memberDisplayName: "Semolina (Rava)",
    canonicalKey: "indian:wheat:semolina",
    searchBoost: 72,
    datasetName: "Wheat, semolina",
    aliases: ["rava", "suji"],
  },
  {
    priorityLabel: "Rice",
    memberDisplayName: "Coconut (Fresh)",
    canonicalKey: "indian:coconut:fresh",
    searchBoost: 70,
    datasetName: "Coconut, kernel, fresh",
    aliases: ["nariyal"],
  },
];

/** USDA canonical keys that overlap conceptually with Indian staples (coexist; do not replace). */
export const USDA_CANONICAL_OVERLAP_FOR_INDIAN: Record<string, string[]> = {
  "indian:rice:raw:milled": ["rice:white:raw"],
  "indian:rice:parboiled:milled": ["rice:white:raw"],
  "indian:rice:raw:brown": ["rice:brown:raw"],
  "indian:paneer": [],
  "indian:curd": [],
};
