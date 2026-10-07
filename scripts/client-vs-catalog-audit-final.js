/**
 * Second-stage read-only audit: client-exercises-clean.json vs catalog.
 * Writes client-vs-catalog-final.md and client-vs-catalog-final.json
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CLIENT_PATH = path.join(ROOT, "client-exercises-clean.json");
const CATALOG_PATH = path.join(ROOT, "data/catalog/exercises.json");
const OUT_JSON = path.join(ROOT, "client-vs-catalog-final.json");
const OUT_MD = path.join(ROOT, "client-vs-catalog-final.md");

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
const clients = JSON.parse(fs.readFileSync(CLIENT_PATH, "utf8"));

function normKey(s) {
  return s
    .toLowerCase()
    .replace(/[\u2018\u2019\u0060\u00B4']/g, "'")
    .replace(/-/g, " ")
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normLoose(s) {
  let n = normKey(s);
  n = n.replace(/\bpull ups\b/g, "pull up");
  n = n.replace(/\bchin ups\b/g, "chin up");
  n = n.replace(/\bpush ups\b/g, "push up");
  n = n.replace(/\bsit ups\b/g, "sit up");
  n = n.replace(/\bv ups\b/g, "v up");
  n = n.replace(/\bmuscle ups\b/g, "muscle up");
  n = n.replace(/\bget ups\b/g, "get up");
  n = n.replace(/\bstep ups\b/g, "step up");
  n = n.replace(/\bdeadlifts\b/g, "deadlift");
  n = n.replace(/\bsquats\b/g, "squat");
  n = n.replace(/\blunges\b/g, "lunge");
  n = n.replace(/\bdips\b/g, "dip");
  n = n.replace(/\bcrunches\b/g, "crunch");
  n = n.replace(/\braises\b/g, "raise");
  n = n.replace(/\brows\b/g, "row");
  return n.trim();
}

const byId = new Map(catalog.map((e) => [e.catalogId, e]));
const byNormLoose = new Map();
const byNormStrict = new Map();
for (const e of catalog) {
  byNormStrict.set(normKey(e.name), e);
  const loose = normLoose(e.name);
  if (!byNormLoose.has(loose)) byNormLoose.set(loose, e);
}

/** @type {Record<string, string>} loose norm -> catalogId */
const ALIAS = {
  "barbell row": "barbell-row",
  "barbell rows": "barbell-row",
  "conventional deadlift": "deadlift",
  "conventional deadlifts": "deadlift",
  "back squat": "squat",
  "back squats": "squat",
  "bench press": "bench-press",
  "overhead press": "ohp",
  "military press": "ohp",
  "standing barbell press": "ohp",
  "seated barbell press": "seated-barbell-overhead-press",
  "hyperextension": "back-extension",
  "reverse pec deck": "dumbbell-reverse-fly",
  "pec deck": "pec-deck",
  "farmer's carry": "dumbbell-farmers-walk",
  "farmers carry": "dumbbell-farmers-walk",
  "high row": "cable-upright-row",
  "rear delt row": "dumbbell-reverse-fly",
  "bent over reverse fly": "dumbbell-reverse-fly",
  "cable reverse fly": "dumbbell-reverse-fly",
  "rope triceps pushdown": "tricep-pushdown",
  "rope pushdown": "tricep-pushdown",
  "straight bar pushdown": "tricep-pushdown",
  "reverse grip pushdown": "tricep-pushdown",
  "v bar pushdown": "v-bar-tricep-pushdown",
  "inverted row bodyweight": "inverted-row",
  "wide grip cable row": "wide-grip-seated-cable-row",
  "close grip cable row": "seated-cable-row",
  "one arm cable row": "single-arm-cable-row",
  "single arm cable row": "single-arm-cable-row",
  "kneeling cable row": "kneeling-cable-row",
  "lat pulldown machine": "lat-pulldown",
  "seated row machine": "seated-cable-row",
  "assisted pull up machine": "assisted-pull-ups",
  "back extension machine": "machine-back-extension",
  "chest supported row machine": "chest-supported-db-row",
  "band face pull": "face-pull",
  "plate front raise": "dumbbell-front-raise",
  "rope front raise": "cable-front-raise",
  "lean away cable lateral raise": "cable-lateral-raise",
  "behind the back cable lateral raise": "cable-lateral-raise",
  "incline front raise": "dumbbell-front-raise",
  "alternating front raise": "dumbbell-front-raise",
  "landmine front raise": "landmine-press",
  "kettlebell front raise": "dumbbell-front-raise",
  "band shoulder press": "dumbbell-shoulder-press",
  "band front raise": "dumbbell-front-raise",
  "band lateral raise": "lateral-raise",
  "band reverse fly": "dumbbell-reverse-fly",
  "band external rotation": "cable-external-rotation",
  "trx reverse fly": "dumbbell-reverse-fly",
  "ring reverse fly": "dumbbell-reverse-fly",
  "incline rear delt fly": "dumbbell-reverse-fly",
  "decline pike push up": "pike-push-ups",
  "wall handstand push up": "handstand-push-ups",
  "smith machine press": "smith-machine-shoulder-press",
  "shoulder press machine": "machine-shoulder-press",
  "machine lateral raise": "plate-loaded-lateral-raise",
  "machine shoulder press": "machine-shoulder-press",
  "cable shoulder press": "landmine-press",
  "single arm cable press": "one-arm-landmine-press",
  "standing lateral raise": "lateral-raise",
  "one arm lateral raise": "lateral-raise",
  "seated lateral raise": "seated-dumbbell-lateral-raise",
  "incline lateral raise": "lateral-raise",
  "resistance band lateral raise": "lateral-raise",
  "upright row wide grip": "upright-row",
  "cable upright row": "cable-upright-row",
  "kettlebell shoulder press": "one-arm-kettlebell-shoulder-press",
  "single arm kettlebell press": "one-arm-kettlebell-shoulder-press",
  "bottoms up kettlebell press": "one-arm-kettlebell-bottoms-up-press",
  "kettlebell row": "one-arm-kettlebell-row",
  "parallel bar dip": "chest-dips",
  "parallel bar dips": "chest-dips",
  "machine dip": "assisted-dips",
  "assisted dip machine": "assisted-dips",
  "assisted dip": "assisted-dips",
  "smith machine close grip bench press": "close-grip-bench-press",
  "two arm overhead dumbbell extension": "dumbbell-overhead-tricep-extension",
  "overhead dumbbell triceps extension": "dumbbell-overhead-tricep-extension",
  "resistance band overhead extension": "overhead-cable-tricep-extension",
  "resistance band pushdown": "tricep-pushdown",
  "band pushdown": "tricep-pushdown",
  "band overhead extension": "overhead-cable-tricep-extension",
  "band kickback": "cable-tricep-kickback",
  "band close grip press": "close-grip-push-ups",
  "single arm kickback": "tricep-kickback",
  "single arm cable extension": "single-arm-tricep-pushdown",
  "cross body cable extension": "single-arm-tricep-pushdown",
  "cable kickback": "cable-tricep-kickback",
  "cable triceps kickback": "cable-tricep-kickback",
  "cable triceps machine": "machine-triceps-extension",
  "triceps extension machine": "machine-triceps-extension",
  "smith machine squat": "smith-machine-squat",
  "smith machine split squat": "smith-machine-split-squat",
  "smith machine bulgarian split": "smith-machine-bulgarian-split-squat",
  "single leg romanian deadlift": "single-leg-rdl",
  "glute ham raise ghr": "nordic-hamstring-curl",
  "nordic curl": "nordic-hamstring-curl",
  "band glute bridge": "banded-glute-bridge",
  "band lateral walk": "banded-lateral-walk",
  "band monster walk": "banded-lateral-walk",
  "clamshell": "clamshells",
  "side lying leg raise": "side-lying-leg-raise",
  "cable hip abduction": "hip-abduction",
  "cable hip adduction": "hip-adduction",
  "band hip abduction": "hip-abduction",
  "band hip adduction": "hip-adduction",
  "adductor machine": "hip-adduction",
  "abductor machine": "hip-abduction",
  "standing calf raise machine": "standing-calf-raise",
  "seated calf raise machine": "seated-calf-raise",
  "smith machine calf raise": "smith-machine-calf-raise",
  "leg press calf raise": "hack-squat-calf-raise",
  "dumbbell seated calf raise": "seated-calf-raise",
  "machine seated calf raise": "seated-calf-raise",
  "barbell calf raise": "barbell-calf-raise",
  "dumbbell calf raise": "dumbbell-calf-raise",
  "single leg standing calf raise": "standing-calf-raise",
  "bodyweight single leg calf raise": "single-leg-calf-raise",
  "hack squat machine": "hack-squat",
  "hip thrust machine": "smith-machine-hip-thrust",
  "terminal knee extension tke": "banded-terminal-knee-extension",
  "peterson step up": "step-ups",
  "dumbbell step up": "dumbbell-step-up",
  "barbell step up": "barbell-step-up",
  "lateral step up": "step-ups",
  "box step up": "step-ups",
  "high knee step up": "step-ups",
  "cable leg curl": "leg-curl",
  "band leg curl": "leg-curl",
  "band squat": "banded-squat",
  "band lunge": "forward-lunge",
  "band calf raise": "standing-calf-raise",
  "cable squat": "goblet-squat",
  "cable reverse lunge": "reverse-lunge",
  "nordic hamstring curl": "nordic-hamstring-curl",
  "stability ball leg curl": "ball-leg-curl",
  "sliding leg curl": "ball-leg-curl",
  "forearm plank": "plank",
  "side plank hip dips": "side-plank",
  "cross body mountain climbers": "mountain-climbers",
  "stability ball rollout": "ab-wheel-rollout",
  "battle rope waves": "battle-ropes",
  "medicine ball throws": "medicine-ball-slam",
  "power cleans": "hang-power-clean",
  "clean and jerks": "clean-and-jerk",
  "hip thrusts": "hip-thrust",
  "front squats": "front-squat",
  "romanian deadlifts": "romanian-deadlift",
  "box jumps": "box-jump",
  "squat jumps": "jump-squat",
  "plyometric push ups": "plyometric-push-ups",
  "bear crawls": "bear-crawl",
  "hanging leg raise": "hanging-leg-raise",
  "hanging leg raises": "hanging-leg-raise",
  "hanging knee raises": "hanging-knee-raise",
  "lying leg raises": "lying-leg-raise",
  "leg raises": "lying-leg-raise",
  "russian twists": "russian-twist",
  "bicycle crunches": "bicycle-crunch",
  "decline crunches": "decline-crunch",
  "cable crunches": "cable-crunch",
  "jackknife sit ups": "jackknife-sit-up",
  "reverse crunches": "reverse-crunches",
  "standing side bends": "standing-side-bend",
  "windshield wipers": "supine-windshield-wipers",
  "hollow body hold": "hollow-body-hold",
  "pallof press": "cable-pallof-press",
  "ab wheel rollout": "ab-wheel-rollout",
  "turkish get up": "kettlebell-turkish-get-ups",
  "medicine ball slams": "medicine-ball-slam",
  "kettlebell swings": "kettlebell-swing",
  "mountain climbers": "mountain-climbers",
  "air squat": "bodyweight-squat",
  "nordic hamstring": "nordic-hamstring-curl",
  "barbell hip thrust": "hip-thrust",
  "barbell skull crusher": "skull-crusher",
  "ez bar skull crusher": "skull-crusher",
  "incline dumbbell curl": "incline-db-curl",
  "preacher dumbbell curl": "preacher-curl",
  "biceps curl machine": "machine-preacher-curl",
  "cable curl machine": "machine-preacher-curl",
  "assisted chin up machine underhand grip": "assisted-pull-ups",
  "close grip chin up": "close-grip-pull-ups",
  "inverted underhand row": "inverted-row",
  "hammer curl with kettlebell": "kettlebell-hammer-curl",
  "bottoms up curl": "one-arm-kettlebell-bottoms-up-press",
  "standing barbell curl": "barbell-curl",
  "wide grip barbell curl": "wide-grip-barbell-curl",
  "close grip barbell curl": "close-grip-barbell-curl",
  "reverse ez bar curl": "reverse-ez-bar-curl",
  "rope hammer curl": "cable-hammer-curl",
  "high cable curl": "cable-curl",
  "low cable curl": "cable-curl",
  "overhead cable curl": "cable-curl",
  "reverse cable curl": "reverse-barbell-curl",
  "cable preacher curl": "preacher-curl",
  "reverse band curl": "reverse-barbell-curl",
  "high anchor band curl": "band-curl",
  "kettlebell curl": "kettlebell-concentration-curl",
  "push ups": "push-up",
  "pull ups": "pull-up",
  "chin ups": "chin-ups",
  "deadlifts": "deadlift",
  "lunges": "lunge",
  "squats": "squat",
  "crunches": "crunches",
  "sit ups": "sit-ups",
  "v ups": "v-ups",
  "flutter kicks": "flutter-kicks",
  "scissor kicks": "scissor-kicks",
  "jump rope": "jump-rope",
  "fire hydrant": "banded-fire-hydrant",
  "frog pump": "glute-kickback",
  "donkey kick": "glute-kickback",
  "safety bar squat": "squat",
  "machine squat": "smith-machine-squat",
  "leg press": "leg-press",
  "hip thrust": "hip-thrust",
  "glute bridge": "glute-bridge",
  "single leg glute bridge": "single-leg-glute-bridge",
  "kettlebell swing": "kettlebell-swing",
  "cossack squat": "cossack-squat",
  "side lunge": "side-lunge",
  "wall sit": "wall-sit",
  "leg extension": "leg-extension",
  "lying leg curl": "leg-curl",
  "seated leg curl": "seated-leg-curl",
  "pistol squat": "pistol-squat",
  "box squat": "box-squat",
  "pause squat": "pause-squat",
  "front squat": "front-squat",
  "goblet squat": "goblet-squat",
  "overhead squat": "overhead-squat",
  "hack squat": "hack-squat",
  "sumo squat": "sumo-squat",
  "split squat": "split-squat",
  "walking lunge": "walking-lunge",
  "reverse lunge": "reverse-lunge",
  "bulgarian split squat": "bulgarian-split-squat",
  "bulgarian split squats": "bulgarian-split-squat",
  "romanian deadlift": "romanian-deadlift",
  "stiff leg deadlift": "stiff-leg-deadlift",
  "stiff leg deadlifts": "stiff-leg-deadlift",
  "sumo deadlift": "sumo-deadlift",
  "deficit deadlift": "deficit-deadlift",
  "rack pull": "rack-pull",
  "good morning": "good-morning",
  "kettlebell deadlift": "kettlebell-deadlift",
  "suitcase carry": "suitcase-carry",
  "overhead carry": "kettlebell-overhead-carry",
  "face pull": "face-pull",
  "band pull apart": "band-pull-apart",
  "band pull apart": "band-pull-apart",
  "straight arm pulldown": "straight-arm-pulldown",
  "reverse grip lat pulldown": "reverse-grip-lat-pulldown",
  "single arm lat pulldown": "one-arm-lat-pulldown",
  "neutral grip pull up": "neutral-grip-pull-ups",
  "wide grip pull up": "wide-grip-pull-ups",
  "close grip pull up": "close-grip-pull-ups",
  "assisted pull up": "assisted-pull-ups",
  "weighted pull up": "weighted-pull-up",
  "lat pulldown": "lat-pulldown",
  "pendlay row": "pendlay-row",
  "t bar row": "t-bar-row",
  "bent over barbell row": "barbell-row",
  "single arm dumbbell row": "single-arm-db-row",
  "chest supported dumbbell row": "chest-supported-db-row",
  "inverted row": "inverted-row",
  "trx row": "trx-row",
  "ring row": "ring-row",
  "archer pull up": "archer-pull-ups",
  "scapular pull up": "scapular-pull-ups",
  "muscle up": "muscle-ups",
  "superman": "superman",
  "bird dog": "bird-dog",
  "back extension": "back-extension",
  "barbell shrug": "shrug",
  "dumbbell shrug": "db-shrug",
  "smith machine shrug": "smith-machine-shrug",
  "upright row": "upright-row",
  "arnold press": "arnold-press",
  "push press": "push-press",
  "behind the neck press advanced": "behind-the-neck-press",
  "dumbbell shoulder press": "dumbbell-shoulder-press",
  "smith machine shoulder press": "smith-machine-shoulder-press",
  "kettlebell overhead press": "one-arm-kettlebell-shoulder-press",
  "single arm dumbbell press": "one-arm-dumbbell-push-press",
  "single arm landmine press": "one-arm-landmine-press",
  "z press": "ohp",
  "dumbbell front raise": "dumbbell-front-raise",
  "barbell front raise": "barbell-front-raise",
  "cable front raise": "cable-front-raise",
  "dumbbell lateral raise": "lateral-raise",
  "cable lateral raise": "cable-lateral-raise",
  "machine lateral raise": "plate-loaded-lateral-raise",
  "cable external rotation": "cable-external-rotation",
  "dumbbell external rotation": "cable-external-rotation",
  "barbell curl": "barbell-curl",
  "ez bar curl": "ez-bar-curl",
  "drag curl": "drag-curl",
  "cheat curl advanced": "cheat-curl",
  "alternating dumbbell curl": "alternating-dumbbell-curl",
  "standing dumbbell curl": "dumbbell-curl",
  "seated dumbbell curl": "seated-dumbbell-curl",
  "concentration curl": "concentration-curl",
  "hammer curl": "hammer-curl",
  "cross body hammer curl": "cross-body-hammer-curl",
  "zottman curl": "zottman-curl",
  "spider curl": "spider-curl",
  "preacher curl": "preacher-curl",
  "standing cable curl": "cable-curl",
  "single arm cable curl": "cable-curl",
  "cable hammer curl": "cable-hammer-curl",
  "preacher curl machine": "machine-preacher-curl",
  "chin up underhand grip": "chin-ups",
  "commando pull up": "commando-pull-ups",
  "reverse barbell curl": "reverse-barbell-curl",
  "reverse dumbbell curl": "reverse-dumbbell-curl",
  "close grip bench press": "close-grip-bench-press",
  "close grip push up": "close-grip-push-ups",
  "incline bench press": "incline-bench-press",
  "decline bench press": "decline-bench-press",
  "weighted dip": "weighted-dips",
  "ring dip": "ring-dips",
  "diamond push up": "diamond-push-ups",
  "floor press": "floor-press",
  "skull crusher": "skull-crusher",
  "dumbbell skull crusher": "db-skull-crusher",
  "dumbbell triceps kickback": "tricep-kickback",
  "bench dip": "bench-dips",
  "straight bar dip": "straight-bar-dips",
  "kettlebell overhead extension": "kettlebell-overhead-tricep-extension",
  "kettlebell floor press": "kettlebell-floor-press",
  "kettlebell close grip press": "kettlebell-close-grip-floor-press",
  "plank": "plank",
  "high plank": "high-plank",
  "side plank": "side-plank",
  "dead bug": "dead-bug",
  "russian twist": "russian-twist",
  "bicycle crunch": "bicycle-crunch",
  "dragon flag": "dragon-flag",
  "burpees": "burpees",
  "battle ropes": "battle-ropes",
  "box jump": "box-jump",
  "jump squat": "jump-squat",
  "bear crawl": "bear-crawl",
  "cat cow stretch": "cat-cow",
  "l sit hold": "l-sit",
  "renegade rows": "renegade-row",
  "kettlebell windmill": "kettlebell-windmills",
  "kettlebell push press": "double-kettlebell-push-press",
  "kettlebell high pull": "kettlebell-high-pull",
  "pike push up": "pike-push-ups",
  "handstand push up": "handstand-push-ups",
  "diamond push ups": "diamond-push-ups",
  "close grip push ups": "close-grip-push-ups",
  "handstand push up advanced": "handstand-push-ups",
  "ez bar overhead extension": "ez-bar-overhead-extension",
  "barbell overhead extension": "barbell-overhead-extension",
  "cable overhead triceps extension": "overhead-cable-tricep-extension",
  "rope overhead triceps extension": "overhead-cable-tricep-extension",
  "single arm overhead dumbbell extension":
    "single-arm-dumbbell-overhead-tricep-extension",
  "single arm cable overhead extension":
    "single-arm-dumbbell-overhead-tricep-extension",
  "single arm pushdown": "single-arm-tricep-pushdown",
  "dual cable pushdown": "tricep-pushdown",
  "ez bar skull crusher": "skull-crusher",
  "barbell upright row": "upright-row",
  "smith machine upright row": "smith-machine-upright-row",
  "dumbbell upright row": "dumbbell-upright-row",
  "cable face pull": "face-pull",
  "dumbbell face pull": "dumbbell-face-pull",
  "trx face pull": "trx-face-pull",
  "ring face pull": "ring-face-pull",
  "band face pull": "face-pull",
  "iso lateral row machine": "chest-supported-db-row",
  "high row machine": "cable-upright-row",
  "seated cable row": "seated-cable-row",
  "cable pullover": "dumbbell-pullover",
  "band row": "seated-cable-row",
  "band pulldown": "lat-pulldown",
  "band straight arm pulldown": "straight-arm-pulldown",
  "band reverse fly": "dumbbell-reverse-fly",
  "renegade row": "renegade-row",
  "cable woodchoppers": "cable-woodchop",
  "landmine twists": "landmine-rotation",
  "heel touches": "heel-touch",
  "oblique crunches": "cross-body-crunch",
  "seated twists": "russian-twist",
  "stomach vacuum": "vacuum",
  "toe touch crunches": "toe-touch-crunch",
  "weighted crunches": "weighted-crunch",
  "machine crunches": "machine-crunch",
  "ab mat sit ups": "sit-ups",
  "stability ball crunches": "ball-crunch",
  "garhammer raises": "garhammer",
  "trx pike": "trx-pike",
  "trx knee tucks": "trx-knee-tuck",
  "farmers walk on toes": "dumbbell-farmers-walk",
  "world's greatest stretch": "worlds-greatest-stretch",
  "world s greatest stretch": "worlds-greatest-stretch",
  "hip flexor stretch": "hip-flexor-stretch",
  "hamstring stretch": "hamstring-stretch",
  "dynamic stretching": "dynamic-stretching",
  "long distance running": "long-distance-run",
  "interval running": "interval-run",
  "rowing machine": "rowing-machine",
};

for (const [k, id] of Object.entries(ALIAS)) {
  if (!byId.has(id)) delete ALIAS[k];
}

/** Aliases removed: wrong identity, equipment, or grip under strict rules */
const REMOVE_ALIAS_KEYS = [
  "cross body mountain climbers",
  "seated twists",
  "stability ball rollout",
  "side plank hip dips",
  "bear crawl hold",
  "hip flexor stretch",
  "leg raises",
  "cable pullover",
  "renegade rows",
  "renegade row",
  "commando pull up",
  "high row machine",
  "iso lateral row machine",
  "landmine front raise",
  "cable shoulder press",
  "seated row machine",
  "lean away cable lateral raise",
  "behind the back cable lateral raise",
  "incline lateral raise",
  "one arm lateral raise",
  "standing lateral raise",
  "kettlebell front raise",
  "plate front raise",
  "rope front raise",
  "incline front raise",
  "alternating front raise",
  "band front raise",
  "reverse pec deck",
  "rear delt row",
  "bent over reverse fly",
  "cable reverse fly",
  "band reverse fly",
  "trx reverse fly",
  "ring reverse fly",
  "incline rear delt fly",
  "donkey kick",
  "frog pump",
  "glute ham raise ghr",
  "safety bar squat",
  "cable squat",
  "band monster walk",
  "leg press calf raise",
  "bottoms up curl",
  "reverse cable curl",
  "machine underhand grip",
  "assisted chin up machine underhand grip",
  "stomach vacuum",
  "oblique crunches",
  "heel touches",
  "landmine twists",
  "cable woodchoppers",
  "garhammer raises",
  "trx pike",
  "trx knee tucks",
  "ab mat sit ups",
  "stomach vacuum",
].map(normLoose);
for (const k of REMOVE_ALIAS_KEYS) delete ALIAS[k];

const FORCE_D = new Set(
  [
    "machine row",
    "wide grip lat pulldown",
    "hip flexor stretch",
    "dumbbell row",
    "calf raise",
    "hamstring stretch",
    "deadlifts",
    "dips",
    "squats",
    "leg raises",
    "lat pulldown machine",
  ].map(normLoose),
);

const GENERIC = new Set(
  [
    "dumbbell row",
    "machine row",
    "leg curl",
    "calf raise",
    "skull crusher",
    "triceps pushdown",
    "pushdown",
    "rope pushdown",
    "front raise",
    "lateral raise",
    "reverse fly",
    "shoulder press",
    "shrug",
    "step up",
    "step ups",
    "lunge",
    "squat",
    "deadlift",
    "row",
    "hip thrust",
    "glute bridge",
    "crunch",
    "sit up",
    "leg raise",
    "leg raises",
    "bench press",
    "dip",
    "dips",
    "push up",
    "curl",
    "kickback",
    "extension",
    "press",
    "farmer's carry",
    "overhead carry",
    "upright row",
    "face pull",
    "pull up",
    "chin up",
    "seated row",
    "cable row",
    "lat pulldown",
    "machine row",
    "lateral raise",
    "hip thrust",
    "step up",
    "squat",
    "squats",
    "deadlift",
    "deadlifts",
    "hamstring stretch",
    "hip flexor stretch",
  ].map(normLoose),
);

const FORCE_C = new Set(
  [
    "yates row",
    "meadows row",
    "seal row",
    "landmine row",
    "australian pull up",
    "rope pulldown",
    "trap bar deadlift",
    "snatch grip deadlift",
    "trap bar shrug",
    "cable shrug",
    "y raise",
    "t raise",
    "w raise",
    "front lever progression",
    "commando pull up",
    "internal rotation with cable",
    "internal rotation with band",
    "cuban press",
    "scaption raise",
    "prone y raise",
    "prone t raise",
    "prone w raise",
    "side lying external rotation",
    "bradford press",
    "crab walk",
    "hindu push up",
    "planche lean",
    "wall walk",
    "jm press",
    "pjr pullover",
    "rolling dumbbell extension",
    "21s curl",
    "bayesian dumbbell curl",
    "bayesian cable curl",
    "offset grip dumbbell curl",
    "scott curl",
    "towel chin up",
    "isometric curl hold",
    "tempo curl slow eccentric",
    "partial range curl",
    "one and a half rep curl",
    "incline skull crusher",
    "decline skull crusher",
    "cable skull crusher",
    "floor skull crusher",
    "cross body triceps extension",
    "one and a half rep extension",
    "isometric triceps hold",
    "tempo triceps extension",
    "tiger bend push up",
    "zercher squat",
    "curtsy lunge",
    "deficit lunge",
    "step back lunge",
    "landmine lunge",
    "sissy squat",
    "spanish squat",
    "copenhagen plank",
    "standing leg curl",
    "monster walk",
    "standing band hip abduction",
    "tibialis raise",
    "toe raise",
    "resistance band dorsiflexion",
    "heel walk",
    "broad jump",
    "split squat jump",
    "lateral bounds",
    "skater jump",
    "depth jump",
    "tuck jump",
    "stair calf raise",
    "leg press calf raise",
    "shrimp squat",
    "sled push",
    "sled pull",
    "hill sprints",
    "power skips",
    "bounding",
    "sprint intervals",
    "acceleration sprints",
    "deceleration drills",
    "shuttle runs",
    "5 10 5 pro agility drill",
    "ladder drills",
    "cone drills",
    "zig zag runs",
    "reaction sprints",
    "change of direction drills",
    "cycling",
    "swimming",
    "rowing",
    "reaction ball drills",
    "footwork drills",
    "defensive slides",
    "lateral shuffle",
    "sprint starts",
    "jump training",
    "balance training",
    "coordination drills",
    "agility ladder training",
    "plyometric training",
    "medicine ball throws",
    "deep squat hold",
    "hip mobility drills",
    "shoulder mobility drills",
    "leg swings",
    "arm circles",
    "band curl",
    "single arm band curl",
    "band hammer curl",
    "machine biceps",
    "machine underhand grip",
    "ez bar",
    "lean away",
    "behind the back",
    "reverse pec",
    "pull rear",
    "incline rear",
    "dumbbell external",
    "band external",
    "rotation with",
    "cable internal",
    "trap bar",
    "overhead carry upright",
    "cable shoulder",
    "cable press",
    "machine press",
    "band shoulder",
    "band face",
    "kettlebell press",
    "bottoms up",
    "dumbbell extension two arm",
    "dumbbell extension",
    "overhead triceps",
    "rope triceps",
    "pushdown straight bar",
    "pushdown v bar",
    "cable pushdown",
    "cable triceps",
    "dumbbell extension pjr",
    "extension one and a half",
    "isometric triceps",
    "tempo triceps",
    "forward lunge",
    "lateral lunge",
    "stiff leg",
    "deadlift single leg",
    "snatch grip",
    "glute ham",
    "raise ghr stability ball",
    "leg curl sliding",
    "leg curl",
    "donkey calf",
    "machine calf",
    "standing calf",
    "single leg",
    "raise single leg",
    "barbell calf",
    "dumbbell calf",
    "seated calf",
    "walk on",
    "box jump broad",
    "jump depth",
    "jump tuck",
    "band lunge",
    "band calf",
    "nordic curl calf",
    "deadlift suitcase",
    "toe touch",
    "ab mat",
    "overhead carry",
    "clean and",
    "snatches",
    "sled pull hill sprints",
    "drills shuttle",
    "runs 5 10 5",
    "agility drill",
    "drills cone",
    "drills zig zag",
    "change of",
    "long distance",
    "jump rope burpees",
    "hip mobility drills shoulder",
    "mobility drills leg swings",
    "drills footwork",
    "drills defensive",
    "jump training balance",
    "training coordination",
    "drills agility ladder",
    "training plyometric training",
    "barbell press",
    "landmine press z",
    "dumbbell press",
    "lateral raise upright",
    "reverse fly face",
    "dumbbell triceps",
    "tate press",
    "kettlebell tate press",
    "jm press",
    "reverse hyperextension",
    "parallel bar",
    "chest supported row",
    "seated row",
    "low cable row",
    "high cable row",
    "cross body mountain climbers",
    "seated twists",
    "stability ball rollout",
    "side plank hip dips",
    "bear crawl hold",
    "cable pullover",
    "renegade rows",
    "reverse pec deck",
  ].map(normLoose),
);

function findSpecialCandidates(loose) {
  if (loose.includes("lat pulldown")) {
    return catalog.filter((e) => normLoose(e.name).includes("lat pulldown"));
  }
  if (loose.includes("machine") && loose.includes("row")) {
    return catalog.filter((e) => {
      const n = normLoose(e.name);
      return n.includes("row") && (n.includes("machine") || n.includes("smith"));
    });
  }
  if (loose.includes("hip flexor")) {
    return catalog.filter((e) => normLoose(e.name).includes("hip flexor"));
  }
  if (/\bdumbbell\b/.test(loose) && loose.includes("row")) {
    return catalog.filter((e) => {
      const n = normLoose(e.name);
      return n.includes("row") && n.includes("dumbbell");
    });
  }
  if (loose.includes("calf") && loose.includes("raise")) {
    return catalog.filter((e) =>
      normLoose(e.name).includes("calf"),
    );
  }
  if (loose === "dip" || loose === "dips") {
    return catalog.filter((e) => {
      const n = normLoose(e.name);
      return n.includes("dip");
    });
  }
  if (loose === "squat" || loose === "squats") {
    return catalog.filter((e) => {
      const n = normLoose(e.name);
      return n.includes("squat") && !n.includes("jump");
    });
  }
  if (loose === "deadlift" || loose === "deadlifts") {
    return catalog.filter((e) => normLoose(e.name).includes("deadlift"));
  }
  if (loose.includes("leg raise")) {
    return catalog.filter((e) => normLoose(e.name).includes("leg raise"));
  }
  if (loose.includes("hamstring") && loose.includes("stretch")) {
    return catalog.filter((e) => normLoose(e.name).includes("hamstring"));
  }
  return null;
}

function isWeakSingleMatch(loose, cat) {
  const cn = normLoose(cat.name);
  if (loose.includes("wide grip") && loose.includes("lat pulldown") && cn === "lat pulldown") {
    return true;
  }
  if (loose === "machine row") return true;
  if (loose.includes("hip flexor") && loose.includes("stretch") && cn !== loose) {
    return true;
  }
  if (loose.includes("reverse pec") && cn === "pec deck") {
    return true;
  }
  return false;
}

function humanReviewResult(loose, explanationPrefix) {
  const special = findSpecialCandidates(loose);
  const candidates = (
    special?.length ? special : findCandidates(loose)
  ).slice(0, 12);
  return result(
    "D",
    null,
    `${explanationPrefix} (${candidates.length} catalog variant(s) differ by equipment/grip/attachment).`,
    candidates,
  );
}

function hasEquipmentModifier(n) {
  const mods = [
    "barbell",
    "dumbbell",
    "cable",
    "machine",
    "smith",
    "band",
    "kettlebell",
    "single arm",
    "one arm",
    "wide grip",
    "close grip",
    "reverse grip",
    "neutral grip",
    "seated",
    "standing",
    "lying",
    "incline",
    "decline",
    "overhead",
    "hanging",
    "romanian",
    "conventional",
    "bulgarian",
    "weighted",
    "assisted",
    "ez bar",
    "v bar",
    "rope",
    "trx",
    "ring",
    "landmine",
    "t bar",
    "pendlay",
    "bent over",
    "chest supported",
    "stiff leg",
    "sumo",
    "deficit",
    "rack",
    "trap bar",
    "snatch grip",
    "good morning",
    "nordic",
    "pistol",
    "goblet",
    "front",
    "back",
    "box",
    "pause",
    "hack",
    "split",
    "walking",
    "forward",
    "reverse",
    "lateral",
    "terminal knee",
    "stability ball",
    "donkey",
    "parallel bar",
    "floor",
    "hammer",
    "concentration",
    "preacher",
    "spider",
    "zottman",
    "drag",
    "cheat",
    "cross body",
    "diamond",
    "handstand",
    "pike",
    "medicine ball",
    "battle rope",
    "jump rope",
    "box jump",
    "fire hydrant",
    "cossack",
    "hip adduction",
    "hip abduction",
    "glute ham",
    "peterson",
    "sissy",
    "spanish",
    "copenhagen",
    "tibialis",
    "monster",
    "adductor",
    "abductor",
    "external rotation",
    "internal rotation",
    "woodchop",
    "windshield",
    "flutter",
    "scissor",
    "jackknife",
    "bicycle",
    "russian",
    "pallof",
    "hollow",
    "dead bug",
    "bird dog",
    "ab wheel",
    "turkish",
    "windmill",
    "push press",
    "arnold",
    "behind the neck",
    "military",
    "lean away",
    "incline rear",
    "prone y",
    "prone t",
    "prone w",
    "wall sit",
    "leg extension",
    "leg press",
    "air squat",
    "jump squat",
    "power clean",
    "clean and jerk",
    "snatch",
    "mountain climber",
    "burpee",
    "renegade",
    "plyometric",
    "archer",
    "commando",
    "scapular",
    "inverted",
    "straight arm",
    "face pull",
    "band pull apart",
    "farmers",
    "bodyweight",
    "plate loaded",
    "decline pike",
    "wall handstand",
    "bottoms up",
    "offset grip",
    "bayesian",
    "isometric",
    "tempo",
    "partial range",
    "one and a half",
    "dual cable",
    "resistance band",
    "straight bar",
    "reverse band",
    "high anchor",
    "towel",
    "ring chin",
    "underhand",
    "overhead cable",
    "high cable",
    "low cable",
    "cable preacher",
    "reverse cable",
    "assisted chin",
    "jm",
    "pjr",
    "rolling dumbbell",
    "tiger bend",
    "zercher",
    "safety bar",
    "curtsy",
    "deficit lunge",
    "step back",
    "landmine lunge",
    "single leg",
    "glute ham",
    "sliding",
    "frog",
    "donkey",
    "copenhagen",
    "peterson",
    "terminal knee",
    "smith machine calf",
    "leg press calf",
    "barbell calf",
    "dumbbell calf",
    "machine seated",
    "dumbbell seated",
    "stair calf",
    "farmer's walk",
    "dorsiflexion",
    "heel walk",
    "toe raise",
    "broad jump",
    "depth jump",
    "tuck jump",
    "split squat jump",
    "lateral bound",
    "skater",
    "sled",
    "hill sprint",
    "power skip",
    "sprint interval",
    "acceleration",
    "deceleration",
    "shuttle",
    "agility",
    "ladder",
    "cone",
    "zig zag",
    "reaction sprint",
    "change of direction",
    "long distance",
    "interval running",
    "cycling",
    "swimming",
    "dynamic stretch",
    "mobility drill",
    "leg swing",
    "arm circle",
    "world greatest",
    "deep squat hold",
    "hip flexor",
    "hamstring stretch",
    "reaction ball",
    "footwork",
    "defensive slide",
    "lateral shuffle",
    "sprint start",
    "jump training",
    "balance training",
    "coordination drill",
    "plyometric training",
    "medicine ball throw",
    "toe touch",
    "ab mat",
    "weighted crunch",
    "machine crunch",
    "garhammer",
    "vacuum",
    "woodchopper",
    "landmine twist",
    "heel touch",
    "oblique crunch",
    "seated twist",
    "side plank hip",
    "bear crawl hold",
    "stability ball rollout",
    "trx pike",
    "trx knee",
  ];
  return mods.some((m) => n.includes(m));
}

function findCandidates(clientLoose) {
  return catalog.filter((e) => {
    const cn = normLoose(e.name);
    if (cn === clientLoose) return true;
    if (clientLoose.length >= 8 && cn.includes(clientLoose)) return true;
    if (cn.length >= 8 && clientLoose.includes(cn)) return true;
    return false;
  });
}

function classify(client) {
  const name = client.name;
  const strict = normKey(name);
  const loose = normLoose(name);
  let candidates = [];

  const strictHit = byNormStrict.get(strict);
  if (strictHit) {
    return result("A", strictHit, "Exact normalized name match to catalog entry.");
  }

  const looseHit = byNormLoose.get(loose);
  if (looseHit) {
    return result(
      "A",
      looseHit,
      "Exact match after normalizing hyphens, plurals, and trivial punctuation.",
    );
  }

  if (FORCE_D.has(loose)) {
    return humanReviewResult(
      loose,
      "Generic or ambiguous client label; manual catalogId required",
    );
  }

  const aliasId = ALIAS[loose];
  if (aliasId && byId.has(aliasId)) {
    const cat = byId.get(aliasId);
    return result(
      "B",
      cat,
      `Same exercise identity as catalog under name "${cat.name}".`,
    );
  }

  if (FORCE_C.has(loose)) {
    return result(
      "C",
      null,
      "No catalog entry represents this specific exercise variant or drill.",
    );
  }

  if (GENERIC.has(loose) && !hasEquipmentModifier(loose)) {
    candidates = findCandidates(loose).slice(0, 10);
    return result(
      "D",
      null,
      candidates.length
        ? `Generic client label; ${candidates.length}+ catalog variants differ by equipment/attachment.`
        : "Generic label; cannot map without equipment or modifier.",
      candidates,
    );
  }

  const subs = findCandidates(loose);
  if (subs.length === 1) {
    if (isWeakSingleMatch(loose, subs[0])) {
      return humanReviewResult(
        loose,
        "Apparent single match ignores grip/equipment/machine variant",
      );
    }
    return result(
      "B",
      subs[0],
      `Single unambiguous catalog match: "${subs[0].name}".`,
    );
  }
  if (subs.length > 1) {
    candidates = subs.slice(0, 10);
    return result(
      "D",
      null,
      `Multiple catalog candidates (${subs.length}); equipment/grip/machine variant unclear.`,
      candidates,
    );
  }

  return result(
    "C",
    null,
    "No catalog exercise matches this identity under strict matching rules.",
  );
}

function result(code, cat, explanation, candidates = []) {
  return {
    result: code,
    catalogName: cat?.name ?? null,
    catalogId: cat?.catalogId ?? null,
    catalogMuscleGroup: cat?.muscleGroup ?? null,
    catalogEquipment: cat?.equipment ?? null,
    explanation,
    candidates: candidates.map((c) => ({
      catalogId: c.catalogId,
      name: c.name,
      muscleGroup: c.muscleGroup,
      equipment: c.equipment,
    })),
  };
}

function suggestMuscle(client) {
  const map = {
    Back: "BACK",
    Shoulders: "SHOULDERS",
    Biceps: "ARMS",
    Triceps: "ARMS",
    Legs: "LEGS",
    "Abs/Core": "CORE",
    "Sports/Fitness": "FULL_BODY",
  };
  return map[client.category] ?? "UNKNOWN";
}

function suggestEquipment(name) {
  const n = name.toLowerCase();
  if (/barbell/.test(n)) return "barbell";
  if (/dumbbell|\bdb\b/.test(n)) return "dumbbell";
  if (/cable/.test(n)) return "cable";
  if (/machine|smith|pec deck|leg press|hack squat/.test(n)) return "machine";
  if (/band/.test(n)) return "resistance band";
  if (/kettlebell/.test(n)) return "kettlebell";
  if (/trx|ring|bodyweight|air squat|plank|burpee|jump rope|sprint|drill|stretch|mobility|agility|ladder|cone|shuffle|reaction|footwork|defensive|balance|coordination|plyometric training|jump training|running|cycling|swimming|rowing|sled|hill|bounding|skip|medicine ball throw/i.test(n))
    return "varies / conditioning";
  return "unspecified";
}

const rows = clients.map((c) => {
  const r = classify(c);
  return {
    clientName: c.name,
    category: c.category,
    subcategory: c.subcategory,
    result: r.result,
    catalogName: r.catalogName,
    catalogId: r.catalogId,
    catalogMuscleGroup: r.catalogMuscleGroup,
    catalogEquipment: r.catalogEquipment,
    explanation: r.explanation,
    candidates: r.candidates,
  };
});

const summary = {
  total: rows.length,
  A: rows.filter((r) => r.result === "A").length,
  B: rows.filter((r) => r.result === "B").length,
  C: rows.filter((r) => r.result === "C").length,
  D: rows.filter((r) => r.result === "D").length,
};

const categories = [
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Legs",
  "Abs/Core",
  "Sports/Fitness",
];

function categoryStats() {
  return categories.map((cat) => {
    const rs = rows.filter((r) => r.category === cat);
    const A = rs.filter((r) => r.result === "A").length;
    const B = rs.filter((r) => r.result === "B").length;
    const C = rs.filter((r) => r.result === "C").length;
    const D = rs.filter((r) => r.result === "D").length;
    return {
      category: cat,
      unique: rs.length,
      A,
      B,
      C,
      D,
      coveredAB: A + B,
    };
  });
}

const catStats = categoryStats();

// Aliases: same catalogId, different client names
const byCatalog = new Map();
for (const r of rows) {
  if (!r.catalogId) continue;
  const list = byCatalog.get(r.catalogId) ?? [];
  list.push(r.clientName);
  byCatalog.set(r.catalogId, list);
}
const clientAliasGroups = [...byCatalog.entries()]
  .filter(([, names]) => new Set(names).size > 1)
  .map(([id, names]) => ({
    catalogId: id,
    catalogName: byId.get(id)?.name,
    clientNames: [...new Set(names)],
  }));

function esc(s) {
  return String(s ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ");
}

let md = `# Client vs GymDesk catalog (final read-only audit)\n\n`;
md += `**Client source:** \`client-exercises-clean.json\` (${clients.length} exercises)\n\n`;
md += `**Catalog:** \`data/catalog/exercises.json\` (${catalog.length} exercises, repdb-free-v1)\n\n`;

md += `## OUTPUT 3 — Summary\n\n`;
md += `| Metric | Count |\n|--------|------:|\n`;
md += `| Total unique client exercises | ${summary.total} |\n`;
md += `| Exact matches (A) | ${summary.A} |\n`;
md += `| Name variations (B) | ${summary.B} |\n`;
md += `| Missing (C) | ${summary.C} |\n`;
md += `| Human review (D) | ${summary.D} |\n\n`;
md += `**Verify:** A+B+C+D = ${summary.A + summary.B + summary.C + summary.D}\n\n`;

md += `## OUTPUT 1 — Complete audit (${rows.length} rows)\n\n`;
md += `| Client exercise | Client category | Client subcategory | Result | Catalog name | catalogId | Catalog muscleGroup | Catalog equipment | Explanation |\n`;
md += `|---|---|---|---|---|---|---|---|---|\n`;
for (const r of rows) {
  md += `| ${esc(r.clientName)} | ${esc(r.category)} | ${esc(r.subcategory)} | ${r.result} | ${esc(r.catalogName)} | ${esc(r.catalogId)} | ${esc(r.catalogMuscleGroup)} | ${esc(r.catalogEquipment)} | ${esc(r.explanation)} |\n`;
}

md += `\n## OUTPUT 4 — Clearly missing (C only)\n\n`;
for (const cat of categories) {
  const miss = rows.filter((r) => r.category === cat && r.result === "C");
  if (!miss.length) continue;
  md += `### ${cat} (${miss.length})\n\n`;
  for (const r of miss) {
    md += `- **${r.clientName}**\n`;
    md += `  - Suggested canonical: ${r.clientName}\n`;
    md += `  - Equipment: ${suggestEquipment(r.clientName)}\n`;
    md += `  - Muscle group: ${suggestMuscle(r)}\n`;
    md += `  - Why missing: ${r.explanation}\n`;
  }
  md += `\n`;
}

md += `## OUTPUT 5 — Human review (D only)\n\n`;
const dRows = rows.filter((r) => r.result === "D");
for (const r of dRows) {
  md += `### ${r.clientName} (${r.category})\n\n`;
  md += `${r.explanation}\n\n`;
  if (r.candidates?.length) {
    md += `| catalogId | Catalog name | muscleGroup | equipment |\n|---|---|---|---|\n`;
    for (const c of r.candidates) {
      md += `| ${c.catalogId} | ${esc(c.name)} | ${c.muscleGroup} | ${esc(c.equipment)} |\n`;
    }
  } else {
    md += `_No narrow candidate list; search catalog by movement + equipment manually._\n`;
  }
  md += `\n`;
}

md += `## OUTPUT 6 — Duplicates / aliases\n\n`;
md += `### 1. Different client labels → same catalog exercise (A/B mappings)\n\n`;
for (const g of clientAliasGroups.slice(0, 80)) {
  md += `- **${g.catalogName}** (\`${g.catalogId}\`): ${g.clientNames.map((n) => `\`${n}\``).join(", ")}\n`;
}
if (clientAliasGroups.length > 80) {
  md += `\n_…and ${clientAliasGroups.length - 80} more groups._\n`;
}

md += `\n### 2. Client variants kept separate (distinct labels by design)\n\n`;
md += `Examples where similar naming does **not** imply same exercise:\n\n`;
const separateExamples = [
  ["Barbell row", "Bent-over barbell row"],
  ["Pull-up", "Chin-Up (Underhand Grip)"],
  ["Upright row", "Upright Row (wide grip)"],
  ["Romanian deadlift (RDL)", "Romanian Deadlift"],
  ["Hip Thrust", "Barbell Hip Thrust"],
  ["Glute Bridge", "Single-Leg Glute Bridge"],
  ["Skull Crusher", "Incline Skull Crusher"],
  ["Lat pulldown", "Wide-grip lat pulldown"],
];
for (const [a, b] of separateExamples) {
  md += `- ${a} ≠ ${b}\n`;
}

md += `\n## OUTPUT 7 — Category coverage\n\n`;
md += `| Category | Unique | A | B | C | D | Covered (A+B) |\n`;
md += `|----------|-------:|--:|--:|--:|--:|--------------:|\n`;
let sumU = 0,
  sumA = 0,
  sumB = 0,
  sumC = 0,
  sumD = 0;
for (const s of catStats) {
  md += `| ${s.category} | ${s.unique} | ${s.A} | ${s.B} | ${s.C} | ${s.D} | ${s.coveredAB} |\n`;
  sumU += s.unique;
  sumA += s.A;
  sumB += s.B;
  sumC += s.C;
  sumD += s.D;
}
md += `| **Total** | **${sumU}** | **${sumA}** | **${sumB}** | **${sumC}** | **${sumD}** | **${sumA + sumB}** |\n\n`;
md += `Category unique sum: ${sumU} (expected 518)\n\n`;

md += `## OUTPUT 8 — Action summary\n\n`;
md += `### Already covered\n\n`;
md += `${summary.A + summary.B} exercises (${summary.A} exact + ${summary.B} name variation) have a defensible catalog mapping.\n\n`;
md += `### Requires human decision\n\n`;
md += `${summary.D} exercises need manual catalogId choice (generic labels or multiple valid candidates).\n\n`;
md += `### Genuine catalog gaps\n\n`;
md += `${summary.C} exercises have no suitable RepDB free catalog match under the matching rules.\n\n`;
md += `### Potential additions\n\n`;
md += `Catalog additions to consider (C only):\n\n`;
for (const r of rows.filter((x) => x.result === "C")) {
  md += `- ${r.clientName} (${r.category})\n`;
}

const jsonOut = {
  meta: {
    clientSource: "client-exercises-clean.json",
    catalogSource: "data/catalog/exercises.json",
    catalogVersion: "repdb-free-v1",
    catalogExerciseCount: catalog.length,
    clientExerciseCount: clients.length,
    generatedAt: new Date().toISOString(),
  },
  summary,
  categoryCoverage: catStats,
  clientAliasGroups,
  rows: rows.map(({ candidates, ...rest }) => ({
    ...rest,
    ...(candidates?.length ? { candidates } : {}),
  })),
};

fs.writeFileSync(OUT_JSON, JSON.stringify(jsonOut, null, 2) + "\n");
fs.writeFileSync(OUT_MD, md);

console.log(JSON.stringify(summary, null, 2));
console.log("Wrote", OUT_JSON, OUT_MD);
