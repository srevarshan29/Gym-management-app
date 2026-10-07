/**
 * Build canonical client exercise list from subsection-structured source
 * derived from the original WhatsApp client list. READ-ONLY (outputs only).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SUBSECTIONS_PATH = path.join(__dirname, "client-exercises-subsections.json");
const RAW_PATH = path.join(
  process.env.TEMP || "C:/Users/sree2/AppData/Local/Temp",
  "client-list-raw.txt",
);
const OUT_JSON = path.join(ROOT, "client-exercises-clean.json");
const OUT_MD = path.join(ROOT, "client-exercises-clean.md");

const HEADING_ONLY = new Set(
  [
    "abdominal exercise",
    "upper abs",
    "lower abs",
    "barbell exercises",
    "dumbbell exercises",
    "cable exercises",
    "machine exercises",
    "bench-based exercises",
    "bodyweight exercises",
    "resistance band exercises",
    "kettlebell exercises",
    "compound exercises",
    "specialty variations",
    "bodyweight leg exercises",
    "full-core exercises",
  ].map((s) => s.toLowerCase()),
);

function normDedupe(name) {
  return name
    .toLowerCase()
    .replace(/[\u2018\u2019\u0060\u00B4']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** For near-duplicate reporting only — never used to merge distinct labels. */
function normNear(name) {
  let n = normDedupe(name);
  n = n
    .replace(/\bpull-ups\b/g, "pull-up")
    .replace(/\bchin-ups\b/g, "chin-up")
    .replace(/\bpush-ups\b/g, "push-up")
    .replace(/\bsit-ups\b/g, "sit-up")
    .replace(/\bdeadlifts\b/g, "deadlift")
    .replace(/\bsquats\b/g, "squat")
    .replace(/\blunges\b/g, "lunge")
    .replace(/\bdips\b/g, "dip")
    .replace(/\bcrunches\b/g, "crunch")
    .replace(/\bbarbell rows\b/g, "barbell row");
  return n.trim();
}

function loadSubsections() {
  return JSON.parse(fs.readFileSync(SUBSECTIONS_PATH, "utf8"));
}

function flattenSubsections(data) {
  const rawTokens = [];
  for (const [category, subs] of Object.entries(data)) {
    for (const [subcategory, names] of Object.entries(subs)) {
      for (const name of names) {
        rawTokens.push({ name, category, subcategory });
      }
    }
  }
  return rawTokens;
}

function validateAgainstRaw(data) {
  if (!fs.existsSync(RAW_PATH)) {
    return { skipped: true, reason: "raw file not found" };
  }
  const raw = fs.readFileSync(RAW_PATH, "utf8");
  const phrases = [];
  for (const subs of Object.values(data)) {
    for (const names of Object.values(subs)) {
      phrases.push(...names);
    }
  }
  phrases.sort((a, b) => b.length - a.length);
  const missing = [];
  for (const p of phrases) {
    if (!raw.includes(p)) {
      const alt = p.replace(/'/g, "\u2019");
      if (!raw.includes(alt)) missing.push(p);
    }
  }
  return { skipped: false, missingInRaw: missing };
}

function buildCleanList(rawTokens) {
  const dedupeGroups = new Map();
  for (const token of rawTokens) {
    const key = normDedupe(token.name);
    if (HEADING_ONLY.has(key)) continue;
    const list = dedupeGroups.get(key) ?? [];
    list.push(token);
    dedupeGroups.set(key, list);
  }

  let duplicateCount = 0;
  const nearDuplicateGroups = [];
  for (const [, tokens] of dedupeGroups) {
    const uniqueNames = [...new Set(tokens.map((t) => t.name))];
    if (tokens.length > 1) duplicateCount += tokens.length - 1;
  }

  const nearMap = new Map();
  for (const token of rawTokens) {
    const key = normDedupe(token.name);
    if (HEADING_ONLY.has(key)) continue;
    const nk = normNear(token.name);
    const list = nearMap.get(nk) ?? new Set();
    list.add(token.name);
    nearMap.set(nk, list);
  }
  for (const [nk, nameSet] of nearMap) {
    const names = [...nameSet];
    if (names.length > 1) {
      nearDuplicateGroups.push({ normKey: nk, names });
    }
  }

  const clean = [];
  for (const [, tokens] of dedupeGroups) {
    const first = tokens[0];
    clean.push({
      name: first.name,
      category: first.category,
      subcategory: first.subcategory,
    });
  }

  const nearDuplicatePairCount = nearDuplicateGroups.reduce(
    (sum, g) => sum + g.names.length - 1,
    0,
  );

  return {
    clean,
    duplicateCount,
    nearDuplicates: nearDuplicateGroups,
    nearDuplicatePairCount,
  };
}

function countByCategory(clean) {
  const counts = {};
  for (const item of clean) {
    counts[item.category] = (counts[item.category] ?? 0) + 1;
  }
  return counts;
}

function toMarkdown(clean) {
  const lines = ["# Client exercises (clean canonical list)", ""];
  let lastCat = "";
  let lastSub = "";
  for (const item of clean) {
    if (item.category !== lastCat) {
      if (lastCat) lines.push("");
      lines.push(`## ${item.category}`);
      lastCat = item.category;
      lastSub = "";
    }
    if (item.subcategory !== lastSub) {
      lines.push("");
      lines.push(`### ${item.subcategory}`);
      lastSub = item.subcategory;
    }
    lines.push(`- ${item.name}`);
  }
  lines.push("");
  return lines.join("\n");
}

function main() {
  const data = loadSubsections();
  const validation = validateAgainstRaw(data);
  const rawTokens = flattenSubsections(data);
  const { clean, duplicateCount, nearDuplicates, nearDuplicatePairCount } =
    buildCleanList(rawTokens);

  clean.sort((a, b) => {
    if (a.category !== b.category)
      return a.category.localeCompare(b.category);
    if (a.subcategory !== b.subcategory)
      return a.subcategory.localeCompare(b.subcategory);
    return a.name.localeCompare(b.name);
  });

  fs.writeFileSync(OUT_JSON, JSON.stringify(clean, null, 2) + "\n");
  fs.writeFileSync(OUT_MD, toMarkdown(clean));

  const MACHINE_FRAGMENTS = [
    "Clean and",
    "Rotation with",
    "Landmine Press Z",
    "Pushdown V-Bar",
    "Press Bear Crawl",
    "Single-Leg",
    "Extension (TKE)",
    "Row (wide grip)",
    "One-arm",
    "Bent-over",
    "Pushdown Straight-Bar",
  ];
  const cleanNames = new Set(clean.map((c) => c.name));
  const avoidedMachineParserArtifacts = MACHINE_FRAGMENTS.filter(
    (f) => !cleanNames.has(f),
  ).length;

  const report = {
    rawExerciseTokens: rawTokens.length,
    cleanUniqueExerciseCount: clean.length,
    removedParserFragments: 0,
    avoidedMachineParserArtifacts,
    excludedHeadingOnlyTokens: 0,
    duplicateCount,
    nearDuplicateGroupCount: nearDuplicates.length,
    nearDuplicateDistinctLabelCount: nearDuplicatePairCount,
    countByCategory: countByCategory(clean),
    validation,
    outputs: {
      json: OUT_JSON,
      markdown: OUT_MD,
    },
  };

  console.log(JSON.stringify(report, null, 2));

  if (nearDuplicates.length > 0) {
    console.log("\n--- Near-duplicate label groups (not merged) ---");
    for (const g of nearDuplicates.slice(0, 30)) {
      console.log(g.names.join(" | "));
    }
    if (nearDuplicates.length > 30) {
      console.log(`... and ${nearDuplicates.length - 30} more groups`);
    }
  }
}

main();
