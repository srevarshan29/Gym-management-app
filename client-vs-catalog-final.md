# Client vs GymDesk catalog (final read-only audit)

**Client source:** `client-exercises-clean.json` (518 exercises)

**Catalog:** `data/catalog/exercises.json` (601 exercises, repdb-free-v1)

## OUTPUT 3 — Summary

| Metric | Count |
|--------|------:|
| Total unique client exercises | 518 |
| Exact matches (A) | 147 |
| Name variations (B) | 162 |
| Missing (C) | 197 |
| Human review (D) | 12 |

**Verify:** A+B+C+D = 518

## OUTPUT 1 — Complete audit (518 rows)

| Client exercise | Client category | Client subcategory | Result | Catalog name | catalogId | Catalog muscleGroup | Catalog equipment | Explanation |
|---|---|---|---|---|---|---|---|---|
| Ab Wheel Rollout | Abs/Core | Deep Core (Transverse Abdominis) | A | Ab Wheel Rollout | ab-wheel-rollout | CORE | ab wheel | Exact normalized name match to catalog entry. |
| Bear Crawl Hold | Abs/Core | Deep Core (Transverse Abdominis) | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Dead Bug | Abs/Core | Deep Core (Transverse Abdominis) | A | Dead Bug | dead-bug | CORE |  | Exact normalized name match to catalog entry. |
| Forearm Plank | Abs/Core | Deep Core (Transverse Abdominis) | B | Plank | plank | CORE |  | Same exercise identity as catalog under name "Plank". |
| High Plank | Abs/Core | Deep Core (Transverse Abdominis) | A | High Plank | high-plank | CORE |  | Exact normalized name match to catalog entry. |
| Hollow Body Hold | Abs/Core | Deep Core (Transverse Abdominis) | A | Hollow Body Hold | hollow-body-hold | CORE |  | Exact normalized name match to catalog entry. |
| Pallof Press | Abs/Core | Deep Core (Transverse Abdominis) | B | Cable Pallof Press | cable-pallof-press | CORE | cable | Same exercise identity as catalog under name "Cable Pallof Press". |
| Plank | Abs/Core | Deep Core (Transverse Abdominis) | A | Plank | plank | CORE |  | Exact normalized name match to catalog entry. |
| Stability Ball Rollout | Abs/Core | Deep Core (Transverse Abdominis) | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Stomach Vacuum | Abs/Core | Deep Core (Transverse Abdominis) | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Battle Ropes | Abs/Core | Full-Core Exercises | A | Battle Ropes | battle-ropes | LEGS | battle rope | Exact normalized name match to catalog entry. |
| Burpees | Abs/Core | Full-Core Exercises | A | Burpees | burpees | LEGS |  | Exact normalized name match to catalog entry. |
| Kettlebell Swings | Abs/Core | Full-Core Exercises | B | Kettlebell Swing | kettlebell-swing | LEGS | kettlebell | Same exercise identity as catalog under name "Kettlebell Swing". |
| Medicine Ball Slams | Abs/Core | Full-Core Exercises | B | Medicine Ball Slam | medicine-ball-slam | CORE | slam ball | Same exercise identity as catalog under name "Medicine Ball Slam". |
| Mountain Climbers | Abs/Core | Full-Core Exercises | A | Mountain Climbers | mountain-climbers | CORE |  | Exact normalized name match to catalog entry. |
| Renegade Rows | Abs/Core | Full-Core Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| TRX Knee Tucks | Abs/Core | Full-Core Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| TRX Pike | Abs/Core | Full-Core Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Dragon Flag | Abs/Core | Lower Abs | A | Dragon Flag | dragon-flag | CORE |  | Exact normalized name match to catalog entry. |
| Flutter Kicks | Abs/Core | Lower Abs | A | Flutter Kicks | flutter-kicks | CORE |  | Exact normalized name match to catalog entry. |
| Garhammer Raises | Abs/Core | Lower Abs | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Hanging Knee Raises | Abs/Core | Lower Abs | A | Hanging Knee Raise | hanging-knee-raise | CORE | pull up bar | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Hanging Leg Raises | Abs/Core | Lower Abs | A | Hanging Leg Raise | hanging-leg-raise | CORE | pull up bar | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Leg Raises | Abs/Core | Lower Abs | D |  |  |  |  | Generic or ambiguous client label; manual catalogId required (3 catalog variant(s) differ by equipment/grip/attachment). |
| Lying Leg Raises | Abs/Core | Lower Abs | A | Lying Leg Raise | lying-leg-raise | CORE |  | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Reverse Crunches | Abs/Core | Lower Abs | A | Reverse Crunches | reverse-crunches | CORE |  | Exact normalized name match to catalog entry. |
| Scissor Kicks | Abs/Core | Lower Abs | A | Scissor Kicks | scissor-kicks | CORE |  | Exact normalized name match to catalog entry. |
| V-Ups | Abs/Core | Lower Abs | A | V Ups | v-ups | CORE |  | Exact normalized name match to catalog entry. |
| Bicycle Crunches | Abs/Core | Obliques (Sides) | A | Bicycle Crunch | bicycle-crunch | CORE |  | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Cable Woodchoppers | Abs/Core | Obliques (Sides) | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Cross-Body Mountain Climbers | Abs/Core | Obliques (Sides) | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Heel Touches | Abs/Core | Obliques (Sides) | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Landmine Twists | Abs/Core | Obliques (Sides) | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Oblique Crunches | Abs/Core | Obliques (Sides) | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Russian Twists | Abs/Core | Obliques (Sides) | B | Russian Twist | russian-twist | CORE |  | Same exercise identity as catalog under name "Russian Twist". |
| Seated Twists | Abs/Core | Obliques (Sides) | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Side Plank | Abs/Core | Obliques (Sides) | A | Side Plank | side-plank | CORE |  | Exact normalized name match to catalog entry. |
| Side Plank Hip Dips | Abs/Core | Obliques (Sides) | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Standing Side Bends | Abs/Core | Obliques (Sides) | B | Standing Side Bend | standing-side-bend | CORE |  | Same exercise identity as catalog under name "Standing Side Bend". |
| Windshield Wipers | Abs/Core | Obliques (Sides) | B | Supine Windshield Wipers | supine-windshield-wipers | CORE |  | Same exercise identity as catalog under name "Supine Windshield Wipers". |
| Ab Mat Sit-Ups | Abs/Core | Upper Abs | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Cable Crunches | Abs/Core | Upper Abs | A | Cable Crunch | cable-crunch | CORE | cable | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Crunches | Abs/Core | Upper Abs | A | Crunches | crunches | CORE |  | Exact normalized name match to catalog entry. |
| Decline Crunches | Abs/Core | Upper Abs | A | Decline Crunch | decline-crunch | CORE |  | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Jackknife Sit-Ups | Abs/Core | Upper Abs | A | Jackknife Sit-Up | jackknife-sit-up | CORE |  | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Machine Crunches | Abs/Core | Upper Abs | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Sit-Ups | Abs/Core | Upper Abs | A | Sit-Ups | sit-ups | CORE |  | Exact normalized name match to catalog entry. |
| Stability Ball Crunches | Abs/Core | Upper Abs | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Toe Touch Crunches | Abs/Core | Upper Abs | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Weighted Crunches | Abs/Core | Upper Abs | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Archer pull-up | Back | Bodyweight Back Exercises | A | Archer Pull Ups | archer-pull-ups | BACK | pull up bar | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Australian pull-up | Back | Bodyweight Back Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Commando pull-up | Back | Bodyweight Back Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Front lever progression | Back | Bodyweight Back Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Muscle-up | Back | Bodyweight Back Exercises | A | Muscle Ups | muscle-ups | BACK | pull up bar | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Scapular pull-up | Back | Bodyweight Back Exercises | A | Scapular Pull Ups | scapular-pull-ups | BACK | pull up bar | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Cable pullover | Back | Cable Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| High cable row | Back | Cable Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Kneeling cable row | Back | Cable Exercises | A | Kneeling Cable Row | kneeling-cable-row | BACK | cable | Exact normalized name match to catalog entry. |
| Low cable row | Back | Cable Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Single-arm cable row | Back | Cable Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Conventional deadlift | Back | Deadlift Variations (Lower Back & Entire Posterior Chain) | B | Barbell Deadlift | deadlift | BACK | barbell | Same exercise identity as catalog under name "Barbell Deadlift". |
| Deficit deadlift | Back | Deadlift Variations (Lower Back & Entire Posterior Chain) | A | Deficit Deadlift | deficit-deadlift | BACK | barbell | Exact normalized name match to catalog entry. |
| Good morning | Back | Deadlift Variations (Lower Back & Entire Posterior Chain) | A | Good Morning | good-morning | LEGS | barbell | Exact normalized name match to catalog entry. |
| Rack pull | Back | Deadlift Variations (Lower Back & Entire Posterior Chain) | A | Rack Pull | rack-pull | BACK | barbell | Exact normalized name match to catalog entry. |
| Romanian deadlift (RDL) | Back | Deadlift Variations (Lower Back & Entire Posterior Chain) | B | Romanian Deadlift | romanian-deadlift | LEGS | barbell | Single unambiguous catalog match: "Romanian Deadlift". |
| Snatch-grip deadlift | Back | Deadlift Variations (Lower Back & Entire Posterior Chain) | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Stiff-leg deadlift | Back | Deadlift Variations (Lower Back & Entire Posterior Chain) | A | Stiff Leg Deadlift | stiff-leg-deadlift | BACK | barbell | Exact normalized name match to catalog entry. |
| Sumo deadlift | Back | Deadlift Variations (Lower Back & Entire Posterior Chain) | A | Sumo Deadlift | sumo-deadlift | BACK | barbell | Exact normalized name match to catalog entry. |
| Trap bar deadlift | Back | Deadlift Variations (Lower Back & Entire Posterior Chain) | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Barbell row | Back | Horizontal Row (Mid Back & Rhomboids) | B | Bent-Over Barbell Row | barbell-row | BACK | barbell | Same exercise identity as catalog under name "Bent-Over Barbell Row". |
| Bent-over barbell row | Back | Horizontal Row (Mid Back & Rhomboids) | A | Bent-Over Barbell Row | barbell-row | BACK | barbell | Exact normalized name match to catalog entry. |
| Chest-supported dumbbell row | Back | Horizontal Row (Mid Back & Rhomboids) | A | Chest-Supported Dumbbell Row | chest-supported-db-row | BACK | dumbbell | Exact normalized name match to catalog entry. |
| Close-grip cable row | Back | Horizontal Row (Mid Back & Rhomboids) | B | Seated Cable Row | seated-cable-row | BACK | cable | Same exercise identity as catalog under name "Seated Cable Row". |
| Dumbbell row | Back | Horizontal Row (Mid Back & Rhomboids) | D |  |  |  |  | Generic or ambiguous client label; manual catalogId required (5 catalog variant(s) differ by equipment/grip/attachment). |
| Inverted row (bodyweight) | Back | Horizontal Row (Mid Back & Rhomboids) | B | Inverted Row | inverted-row | BACK | barbell | Same exercise identity as catalog under name "Inverted Row". |
| Landmine row | Back | Horizontal Row (Mid Back & Rhomboids) | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Machine row | Back | Horizontal Row (Mid Back & Rhomboids) | D |  |  |  |  | Generic or ambiguous client label; manual catalogId required (5 catalog variant(s) differ by equipment/grip/attachment). |
| Meadows row | Back | Horizontal Row (Mid Back & Rhomboids) | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| One-arm cable row | Back | Horizontal Row (Mid Back & Rhomboids) | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Pendlay row | Back | Horizontal Row (Mid Back & Rhomboids) | A | Pendlay Row | pendlay-row | BACK | barbell | Exact normalized name match to catalog entry. |
| Ring row | Back | Horizontal Row (Mid Back & Rhomboids) | A | Ring Row | ring-row | BACK | rings | Exact normalized name match to catalog entry. |
| Seal row | Back | Horizontal Row (Mid Back & Rhomboids) | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Seated cable row | Back | Horizontal Row (Mid Back & Rhomboids) | A | Seated Cable Row | seated-cable-row | BACK | cable | Exact normalized name match to catalog entry. |
| Single-arm dumbbell row | Back | Horizontal Row (Mid Back & Rhomboids) | A | Single-Arm Dumbbell Row | single-arm-db-row | BACK | dumbbell | Exact normalized name match to catalog entry. |
| T-bar row | Back | Horizontal Row (Mid Back & Rhomboids) | A | T-Bar Row | t-bar-row | BACK | barbell | Exact normalized name match to catalog entry. |
| TRX row | Back | Horizontal Row (Mid Back & Rhomboids) | A | TRX Row | trx-row | BACK | suspension trainer | Exact normalized name match to catalog entry. |
| Wide-grip cable row | Back | Horizontal Row (Mid Back & Rhomboids) | B | Wide Grip Seated Cable Row | wide-grip-seated-cable-row | BACK | cable | Same exercise identity as catalog under name "Wide Grip Seated Cable Row". |
| Yates row | Back | Horizontal Row (Mid Back & Rhomboids) | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Kettlebell deadlift | Back | Kettlebell Exercises | A | Kettlebell Deadlift | kettlebell-deadlift | BACK | kettlebell | Exact normalized name match to catalog entry. |
| Kettlebell row | Back | Kettlebell Exercises | B | One Arm Kettlebell Row | one-arm-kettlebell-row | BACK | kettlebell | Same exercise identity as catalog under name "One Arm Kettlebell Row". |
| Renegade row | Back | Kettlebell Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Suitcase carry | Back | Kettlebell Exercises | A | Suitcase Carry | suitcase-carry | CORE | kettlebell | Exact normalized name match to catalog entry. |
| Back extension | Back | Lower Back Isolation | A | Back Extension | back-extension | BACK |  | Exact normalized name match to catalog entry. |
| Bird dog | Back | Lower Back Isolation | A | Bird-Dog | bird-dog | CORE |  | Exact normalized name match to catalog entry. |
| Hyperextension | Back | Lower Back Isolation | B | Back Extension | back-extension | BACK |  | Same exercise identity as catalog under name "Back Extension". |
| Reverse hyperextension | Back | Lower Back Isolation | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Stability ball back extension | Back | Lower Back Isolation | B | Back Extension | back-extension | BACK |  | Single unambiguous catalog match: "Back Extension". |
| Superman | Back | Lower Back Isolation | A | Superman | superman | BACK |  | Exact normalized name match to catalog entry. |
| Assisted pull-up machine | Back | Machine Exercises | B | Assisted Pull Ups | assisted-pull-ups | BACK | assisted pullup machine | Same exercise identity as catalog under name "Assisted Pull Ups". |
| Back extension machine | Back | Machine Exercises | B | Machine Back Extension | machine-back-extension | BACK | back extension machine | Same exercise identity as catalog under name "Machine Back Extension". |
| Chest-supported row machine | Back | Machine Exercises | B | Chest-Supported Dumbbell Row | chest-supported-db-row | BACK | dumbbell | Same exercise identity as catalog under name "Chest-Supported Dumbbell Row". |
| High row machine | Back | Machine Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Iso-lateral row machine | Back | Machine Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Lat pulldown machine | Back | Machine Exercises | D |  |  |  |  | Generic or ambiguous client label; manual catalogId required (6 catalog variant(s) differ by equipment/grip/attachment). |
| Seated row machine | Back | Machine Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Band pull-apart | Back | Rear Delts & Upper Back | A | Band Pull Apart | band-pull-apart | SHOULDERS | resistance band | Exact normalized name match to catalog entry. |
| Bent-over reverse fly | Back | Rear Delts & Upper Back | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Cable reverse fly | Back | Rear Delts & Upper Back | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Face pull | Back | Rear Delts & Upper Back | B | Cable Face Pull | face-pull | SHOULDERS | cable | Same exercise identity as catalog under name "Cable Face Pull". |
| High row | Back | Rear Delts & Upper Back | B | Cable Upright Row | cable-upright-row | SHOULDERS | cable | Same exercise identity as catalog under name "Cable Upright Row". |
| Rear delt row | Back | Rear Delts & Upper Back | D |  |  |  |  | Multiple catalog candidates (2); equipment/grip/machine variant unclear. |
| Reverse pec deck | Back | Rear Delts & Upper Back | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| T-raise | Back | Rear Delts & Upper Back | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| W-raise | Back | Rear Delts & Upper Back | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Y-raise | Back | Rear Delts & Upper Back | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Band face pull | Back | Resistance Band Exercises | B | Cable Face Pull | face-pull | SHOULDERS | cable | Same exercise identity as catalog under name "Cable Face Pull". |
| Band pulldown | Back | Resistance Band Exercises | B | Lat Pulldown | lat-pulldown | BACK | cable | Same exercise identity as catalog under name "Lat Pulldown". |
| Band reverse fly | Back | Resistance Band Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Band row | Back | Resistance Band Exercises | B | Seated Cable Row | seated-cable-row | BACK | cable | Same exercise identity as catalog under name "Seated Cable Row". |
| Band straight-arm pulldown | Back | Resistance Band Exercises | B | Straight-Arm Pulldown | straight-arm-pulldown | BACK | cable | Same exercise identity as catalog under name "Straight-Arm Pulldown". |
| Barbell shrug | Back | Trap-Focused Exercises | A | Barbell Shrug | shrug | SHOULDERS | barbell | Exact normalized name match to catalog entry. |
| Cable shrug | Back | Trap-Focused Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Dumbbell shrug | Back | Trap-Focused Exercises | A | Dumbbell Shrug | db-shrug | SHOULDERS | dumbbell | Exact normalized name match to catalog entry. |
| Farmer's carry | Back | Trap-Focused Exercises | B | Dumbbell Farmer's Walk | dumbbell-farmers-walk | LEGS | dumbbell | Same exercise identity as catalog under name "Dumbbell Farmer's Walk". |
| Overhead carry | Back | Trap-Focused Exercises | B | Kettlebell Overhead Carry | kettlebell-overhead-carry | SHOULDERS | kettlebell | Same exercise identity as catalog under name "Kettlebell Overhead Carry". |
| Smith machine shrug | Back | Trap-Focused Exercises | A | Smith Machine Shrug | smith-machine-shrug | BACK | smith machine | Exact normalized name match to catalog entry. |
| Trap bar shrug | Back | Trap-Focused Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Upright row | Back | Trap-Focused Exercises | B | Barbell Upright Row | upright-row | SHOULDERS | barbell | Same exercise identity as catalog under name "Barbell Upright Row". |
| Assisted pull-up | Back | Vertical Pull (Lats & Upper Back) | A | Assisted Pull Ups | assisted-pull-ups | BACK | assisted pullup machine | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Chin-up | Back | Vertical Pull (Lats & Upper Back) | A | Chin-Ups | chin-ups | BACK | pull up bar | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Close-grip pull-up | Back | Vertical Pull (Lats & Upper Back) | A | Close-Grip Pull-Ups | close-grip-pull-ups | BACK | pull up bar | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Lat pulldown | Back | Vertical Pull (Lats & Upper Back) | A | Lat Pulldown | lat-pulldown | BACK | cable | Exact normalized name match to catalog entry. |
| Neutral-grip pull-up | Back | Vertical Pull (Lats & Upper Back) | A | Neutral Grip Pull Ups | neutral-grip-pull-ups | BACK | pull up bar | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Pull-up | Back | Vertical Pull (Lats & Upper Back) | A | Pull-Up | pull-up | BACK | pull up bar | Exact normalized name match to catalog entry. |
| Reverse-grip lat pulldown | Back | Vertical Pull (Lats & Upper Back) | A | Reverse Grip Lat Pulldown | reverse-grip-lat-pulldown | BACK | cable | Exact normalized name match to catalog entry. |
| Rope pulldown | Back | Vertical Pull (Lats & Upper Back) | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Single-arm lat pulldown | Back | Vertical Pull (Lats & Upper Back) | B | One-Arm Lat Pulldown | one-arm-lat-pulldown | BACK | cable | Same exercise identity as catalog under name "One-Arm Lat Pulldown". |
| Straight-arm pulldown | Back | Vertical Pull (Lats & Upper Back) | A | Straight-Arm Pulldown | straight-arm-pulldown | BACK | cable | Exact normalized name match to catalog entry. |
| Weighted pull-up | Back | Vertical Pull (Lats & Upper Back) | A | Weighted Pull-Up | weighted-pull-up | BACK | pull up bar | Exact normalized name match to catalog entry. |
| Wide-grip lat pulldown | Back | Vertical Pull (Lats & Upper Back) | D |  |  |  |  | Generic or ambiguous client label; manual catalogId required (6 catalog variant(s) differ by equipment/grip/attachment). |
| Wide-grip pull-up | Back | Vertical Pull (Lats & Upper Back) | A | Wide Grip Pull Ups | wide-grip-pull-ups | BACK | pull up bar | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Barbell Curl | Biceps | Barbell Exercises | A | Barbell Curl | barbell-curl | ARMS | barbell | Exact normalized name match to catalog entry. |
| Cheat Curl (advanced) | Biceps | Barbell Exercises | B | Cheat Curl | cheat-curl | ARMS | barbell | Same exercise identity as catalog under name "Cheat Curl". |
| Close-Grip Barbell Curl | Biceps | Barbell Exercises | A | Close-Grip Barbell Curl | close-grip-barbell-curl | ARMS | barbell | Exact normalized name match to catalog entry. |
| Drag Curl | Biceps | Barbell Exercises | A | Drag Curl | drag-curl | ARMS | barbell | Exact normalized name match to catalog entry. |
| EZ-Bar Curl | Biceps | Barbell Exercises | A | EZ-Bar Curl | ez-bar-curl | ARMS | ez bar | Exact normalized name match to catalog entry. |
| Reverse EZ-Bar Curl | Biceps | Barbell Exercises | B | EZ-Bar Curl | ez-bar-curl | ARMS | ez bar | Single unambiguous catalog match: "EZ-Bar Curl". |
| Standing Barbell Curl | Biceps | Barbell Exercises | B | Barbell Curl | barbell-curl | ARMS | barbell | Same exercise identity as catalog under name "Barbell Curl". |
| Wide-Grip Barbell Curl | Biceps | Barbell Exercises | B | Barbell Curl | barbell-curl | ARMS | barbell | Single unambiguous catalog match: "Barbell Curl". |
| Preacher Curl | Biceps | Bench-Based Exercises | A | Preacher Curl | preacher-curl | ARMS | ez bar | Exact normalized name match to catalog entry. |
| Scott Curl | Biceps | Bench-Based Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Chin-Up (Underhand Grip) | Biceps | Bodyweight Exercises | B | Chin-Ups | chin-ups | BACK | pull up bar | Same exercise identity as catalog under name "Chin-Ups". |
| Close-Grip Chin-Up | Biceps | Bodyweight Exercises | B | Close-Grip Pull-Ups | close-grip-pull-ups | BACK | pull up bar | Same exercise identity as catalog under name "Close-Grip Pull-Ups". |
| Inverted Underhand Row | Biceps | Bodyweight Exercises | B | Inverted Row | inverted-row | BACK | barbell | Same exercise identity as catalog under name "Inverted Row". |
| Ring Chin-Up | Biceps | Bodyweight Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Towel Chin-Up | Biceps | Bodyweight Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Bayesian Cable Curl | Biceps | Cable Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Cable Preacher Curl | Biceps | Cable Exercises | B | Preacher Curl | preacher-curl | ARMS | ez bar | Same exercise identity as catalog under name "Preacher Curl". |
| High Cable Curl | Biceps | Cable Exercises | B | Cable Curl | cable-curl | ARMS | cable | Same exercise identity as catalog under name "Cable Curl". |
| Low Cable Curl | Biceps | Cable Exercises | B | Cable Curl | cable-curl | ARMS | cable | Same exercise identity as catalog under name "Cable Curl". |
| Overhead Cable Curl | Biceps | Cable Exercises | B | Cable Curl | cable-curl | ARMS | cable | Same exercise identity as catalog under name "Cable Curl". |
| Reverse Cable Curl | Biceps | Cable Exercises | B | Cable Curl | cable-curl | ARMS | cable | Single unambiguous catalog match: "Cable Curl". |
| Rope Hammer Curl | Biceps | Cable Exercises | B | Cable Hammer Curl | cable-hammer-curl | ARMS | cable | Same exercise identity as catalog under name "Cable Hammer Curl". |
| Single-Arm Cable Curl | Biceps | Cable Exercises | B | Cable Curl | cable-curl | ARMS | cable | Same exercise identity as catalog under name "Cable Curl". |
| Standing Cable Curl | Biceps | Cable Exercises | B | Cable Curl | cable-curl | ARMS | cable | Same exercise identity as catalog under name "Cable Curl". |
| Alternating Dumbbell Curl | Biceps | Dumbbell Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Bayesian Dumbbell Curl | Biceps | Dumbbell Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Concentration Curl | Biceps | Dumbbell Exercises | A | Concentration Curl | concentration-curl | ARMS | dumbbell | Exact normalized name match to catalog entry. |
| Cross-Body Hammer Curl | Biceps | Dumbbell Exercises | A | Cross Body Hammer Curl | cross-body-hammer-curl | ARMS | dumbbell | Exact normalized name match to catalog entry. |
| Hammer Curl | Biceps | Dumbbell Exercises | B | Dumbbell Hammer Curl | hammer-curl | ARMS | dumbbell | Same exercise identity as catalog under name "Dumbbell Hammer Curl". |
| Incline Dumbbell Curl | Biceps | Dumbbell Exercises | A | Incline Dumbbell Curl | incline-db-curl | ARMS | dumbbell | Exact normalized name match to catalog entry. |
| Offset-Grip Dumbbell Curl | Biceps | Dumbbell Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Preacher Dumbbell Curl | Biceps | Dumbbell Exercises | B | Preacher Curl | preacher-curl | ARMS | ez bar | Same exercise identity as catalog under name "Preacher Curl". |
| Seated Dumbbell Curl | Biceps | Dumbbell Exercises | A | Seated Dumbbell Curl | seated-dumbbell-curl | ARMS | dumbbell | Exact normalized name match to catalog entry. |
| Spider Curl | Biceps | Dumbbell Exercises | A | Spider Curl | spider-curl | ARMS | dumbbell | Exact normalized name match to catalog entry. |
| Standing Dumbbell Curl | Biceps | Dumbbell Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Zottman Curl | Biceps | Dumbbell Exercises | A | Zottman Curl | zottman-curl | ARMS | dumbbell | Exact normalized name match to catalog entry. |
| 21s Curl | Biceps | Isometric & Specialty Variations | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Isometric Curl Hold | Biceps | Isometric & Specialty Variations | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| One-and-a-Half Rep Curl | Biceps | Isometric & Specialty Variations | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Partial-Range Curl | Biceps | Isometric & Specialty Variations | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Tempo Curl (slow eccentric) | Biceps | Isometric & Specialty Variations | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Bottoms-Up Curl | Biceps | Kettlebell Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Hammer Curl with Kettlebell | Biceps | Kettlebell Exercises | B | Kettlebell Hammer Curl | kettlebell-hammer-curl | ARMS | kettlebell | Same exercise identity as catalog under name "Kettlebell Hammer Curl". |
| Kettlebell Curl | Biceps | Kettlebell Exercises | B | Kettlebell Concentration Curl | kettlebell-concentration-curl | ARMS | kettlebell | Same exercise identity as catalog under name "Kettlebell Concentration Curl". |
| Assisted Chin-Up Machine (underhand grip) | Biceps | Machine Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Biceps Curl Machine | Biceps | Machine Exercises | B | Machine Preacher Curl | machine-preacher-curl | ARMS | preacher curl machine | Same exercise identity as catalog under name "Machine Preacher Curl". |
| Cable Curl Machine | Biceps | Machine Exercises | B | Machine Preacher Curl | machine-preacher-curl | ARMS | preacher curl machine | Same exercise identity as catalog under name "Machine Preacher Curl". |
| Preacher Curl Machine | Biceps | Machine Exercises | B | Machine Preacher Curl | machine-preacher-curl | ARMS | preacher curl machine | Same exercise identity as catalog under name "Machine Preacher Curl". |
| Band Curl | Biceps | Resistance Band Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Band Hammer Curl | Biceps | Resistance Band Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| High Anchor Band Curl | Biceps | Resistance Band Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Reverse Band Curl | Biceps | Resistance Band Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Single-Arm Band Curl | Biceps | Resistance Band Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Reverse Barbell Curl | Biceps | Reverse & Forearm-Focused Variations | B | Barbell Curl | barbell-curl | ARMS | barbell | Single unambiguous catalog match: "Barbell Curl". |
| Reverse Dumbbell Curl | Biceps | Reverse & Forearm-Focused Variations | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Abductor Machine | Legs | Abductor (Outer Hip) Exercises | B | Machine Hip Abduction | hip-abduction | LEGS | hip abduction machine | Same exercise identity as catalog under name "Machine Hip Abduction". |
| Band Lateral Walk | Legs | Abductor (Outer Hip) Exercises | B | Banded Lateral Walk | banded-lateral-walk | LEGS | loop band | Same exercise identity as catalog under name "Banded Lateral Walk". |
| Cable Hip Abduction | Legs | Abductor (Outer Hip) Exercises | B | Machine Hip Abduction | hip-abduction | LEGS | hip abduction machine | Same exercise identity as catalog under name "Machine Hip Abduction". |
| Clamshell | Legs | Abductor (Outer Hip) Exercises | B | Clamshells | clamshells | LEGS |  | Same exercise identity as catalog under name "Clamshells". |
| Monster Walk | Legs | Abductor (Outer Hip) Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Side-Lying Leg Raise | Legs | Abductor (Outer Hip) Exercises | B | Lying Leg Raise | lying-leg-raise | CORE |  | Single unambiguous catalog match: "Lying Leg Raise". |
| Standing Band Hip Abduction | Legs | Abductor (Outer Hip) Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Adductor Machine | Legs | Adductor (Inner Thigh) Exercises | B | Hip Adduction | hip-adduction | LEGS | hip adduction machine | Same exercise identity as catalog under name "Hip Adduction". |
| Band Hip Adduction | Legs | Adductor (Inner Thigh) Exercises | B | Hip Adduction | hip-adduction | LEGS | hip adduction machine | Same exercise identity as catalog under name "Hip Adduction". |
| Cable Hip Adduction | Legs | Adductor (Inner Thigh) Exercises | B | Hip Adduction | hip-adduction | LEGS | hip adduction machine | Same exercise identity as catalog under name "Hip Adduction". |
| Copenhagen Plank | Legs | Adductor (Inner Thigh) Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Cossack Squat | Legs | Adductor (Inner Thigh) Exercises | A | Cossack Squat | cossack-squat | LEGS |  | Exact normalized name match to catalog entry. |
| Side Lunge | Legs | Adductor (Inner Thigh) Exercises | A | Side Lunge | side-lunge | LEGS |  | Exact normalized name match to catalog entry. |
| Air Squat | Legs | Bodyweight Leg Exercises | B | Bodyweight Squat | bodyweight-squat | LEGS |  | Same exercise identity as catalog under name "Bodyweight Squat". |
| Calf Raise | Legs | Bodyweight Leg Exercises | D |  |  |  |  | Generic or ambiguous client label; manual catalogId required (12 catalog variant(s) differ by equipment/grip/attachment). |
| Nordic Curl | Legs | Bodyweight Leg Exercises | B | Nordic Hamstring Curl | nordic-hamstring-curl | LEGS | glute ham developer | Same exercise identity as catalog under name "Nordic Hamstring Curl". |
| Pistol Squat | Legs | Bodyweight Leg Exercises | A | Pistol Squat | pistol-squat | LEGS |  | Exact normalized name match to catalog entry. |
| Shrimp Squat | Legs | Bodyweight Leg Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Single-Leg Calf Raise | Legs | Bodyweight Leg Exercises | A | Single Leg Calf Raise | single-leg-calf-raise | LEGS |  | Exact normalized name match to catalog entry. |
| Cable Reverse Lunge | Legs | Cable Exercises | B | Reverse Lunge | reverse-lunge | LEGS | dumbbell | Same exercise identity as catalog under name "Reverse Lunge". |
| Cable Squat | Legs | Cable Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Barbell Calf Raise | Legs | Calf Exercises Standing (Gastrocnemius Focus) | A | Barbell Calf Raise | barbell-calf-raise | LEGS | barbell | Exact normalized name match to catalog entry. |
| Donkey Calf Raise | Legs | Calf Exercises Standing (Gastrocnemius Focus) | A | Donkey Calf Raise | donkey-calf-raise | LEGS |  | Exact normalized name match to catalog entry. |
| Dumbbell Calf Raise | Legs | Calf Exercises Standing (Gastrocnemius Focus) | A | Dumbbell Calf Raise | dumbbell-calf-raise | LEGS | dumbbell | Exact normalized name match to catalog entry. |
| Leg Press Calf Raise | Legs | Calf Exercises Standing (Gastrocnemius Focus) | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Single-Leg Standing Calf Raise | Legs | Calf Exercises Standing (Gastrocnemius Focus) | B | Standing Calf Raise | standing-calf-raise | LEGS | standing calf raise machine | Same exercise identity as catalog under name "Standing Calf Raise". |
| Smith Machine Calf Raise | Legs | Calf Exercises Standing (Gastrocnemius Focus) | A | Smith Machine Calf Raise | smith-machine-calf-raise | LEGS | smith machine | Exact normalized name match to catalog entry. |
| Standing Calf Raise | Legs | Calf Exercises Standing (Gastrocnemius Focus) | A | Standing Calf Raise | standing-calf-raise | LEGS | standing calf raise machine | Exact normalized name match to catalog entry. |
| Single-Leg Romanian Deadlift | Legs | Deadlift Variations (Hamstrings & Glutes) | A | Single Leg Romanian Deadlift | single-leg-romanian-deadlift | BACK | dumbbell | Exact normalized name match to catalog entry. |
| Barbell Hip Thrust | Legs | Glute Exercises | A | Barbell Hip Thrust | hip-thrust | LEGS | barbell | Exact normalized name match to catalog entry. |
| Donkey Kick | Legs | Glute Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Fire Hydrant | Legs | Glute Exercises | B | Banded Fire Hydrant | banded-fire-hydrant | LEGS | loop band | Same exercise identity as catalog under name "Banded Fire Hydrant". |
| Frog Pump | Legs | Glute Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Glute Bridge | Legs | Glute Exercises | A | Glute Bridge | glute-bridge | LEGS |  | Exact normalized name match to catalog entry. |
| Hip Thrust | Legs | Glute Exercises | B | Barbell Hip Thrust | hip-thrust | LEGS | barbell | Same exercise identity as catalog under name "Barbell Hip Thrust". |
| Kettlebell Swing | Legs | Glute Exercises | A | Kettlebell Swing | kettlebell-swing | LEGS | kettlebell | Exact normalized name match to catalog entry. |
| Single-Leg Glute Bridge | Legs | Glute Exercises | A | Single Leg Glute Bridge | single-leg-glute-bridge | LEGS |  | Exact normalized name match to catalog entry. |
| Step-Up | Legs | Glute Exercises | A | Step Ups | step-ups | LEGS |  | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Band Leg Curl | Legs | Hamstring Isolation Exercises | B | Lying Leg Curl | leg-curl | LEGS | leg curl | Same exercise identity as catalog under name "Lying Leg Curl". |
| Cable Leg Curl | Legs | Hamstring Isolation Exercises | B | Lying Leg Curl | leg-curl | LEGS | leg curl | Same exercise identity as catalog under name "Lying Leg Curl". |
| Glute-Ham Raise (GHR) | Legs | Hamstring Isolation Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Lying Leg Curl | Legs | Hamstring Isolation Exercises | A | Lying Leg Curl | leg-curl | LEGS | leg curl | Exact normalized name match to catalog entry. |
| Nordic Hamstring Curl | Legs | Hamstring Isolation Exercises | A | Nordic Hamstring Curl | nordic-hamstring-curl | LEGS | glute ham developer | Exact normalized name match to catalog entry. |
| Seated Leg Curl | Legs | Hamstring Isolation Exercises | A | Seated Leg Curl | seated-leg-curl | LEGS | leg curl | Exact normalized name match to catalog entry. |
| Sliding Leg Curl | Legs | Hamstring Isolation Exercises | B | Stability Ball Leg Curl | ball-leg-curl | LEGS | stability ball | Same exercise identity as catalog under name "Stability Ball Leg Curl". |
| Stability Ball Leg Curl | Legs | Hamstring Isolation Exercises | A | Stability Ball Leg Curl | ball-leg-curl | LEGS | stability ball | Exact normalized name match to catalog entry. |
| Standing Leg Curl | Legs | Hamstring Isolation Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Romanian Deadlift | Legs | Kettlebell Exercises | A | Romanian Deadlift | romanian-deadlift | LEGS | barbell | Exact normalized name match to catalog entry. |
| Single-Leg Deadlift | Legs | Kettlebell Exercises | B | Kettlebell Single Leg Deadlift | kettlebell-single-leg-deadlift | BACK | kettlebell | Single unambiguous catalog match: "Kettlebell Single Leg Deadlift". |
| Bulgarian Split Squat | Legs | Lunge Variations | A | Bulgarian Split Squat | bulgarian-split-squat | LEGS | dumbbell | Exact normalized name match to catalog entry. |
| Curtsy Lunge | Legs | Lunge Variations | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Deficit Lunge | Legs | Lunge Variations | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Forward Lunge | Legs | Lunge Variations | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Landmine Lunge | Legs | Lunge Variations | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Lateral Lunge | Legs | Lunge Variations | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Reverse Lunge | Legs | Lunge Variations | A | Reverse Lunge | reverse-lunge | LEGS | dumbbell | Exact normalized name match to catalog entry. |
| Smith Machine Split Squat | Legs | Lunge Variations | A | Smith Machine Split Squat | smith-machine-split-squat | LEGS | smith machine | Exact normalized name match to catalog entry. |
| Step-Back Lunge | Legs | Lunge Variations | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Walking Lunge | Legs | Lunge Variations | A | Walking Lunge | walking-lunge | LEGS |  | Exact normalized name match to catalog entry. |
| Hack Squat Machine | Legs | Machine Leg Exercises | B | Hack Squat | hack-squat | LEGS | hack squat | Same exercise identity as catalog under name "Hack Squat". |
| Hip Thrust Machine | Legs | Machine Leg Exercises | B | Smith Machine Hip Thrust | smith-machine-hip-thrust | LEGS | smith machine | Same exercise identity as catalog under name "Smith Machine Hip Thrust". |
| Leg Press | Legs | Machine Leg Exercises | A | Leg Press | leg-press | LEGS | leg press | Exact normalized name match to catalog entry. |
| Seated Calf Raise Machine | Legs | Machine Leg Exercises | B | Seated Calf Raise | seated-calf-raise | LEGS | seated calf raise machine | Same exercise identity as catalog under name "Seated Calf Raise". |
| Standing Calf Raise Machine | Legs | Machine Leg Exercises | B | Standing Calf Raise | standing-calf-raise | LEGS | standing calf raise machine | Same exercise identity as catalog under name "Standing Calf Raise". |
| Box Jump | Legs | Plyometric Leg Exercises | A | Box Jump | box-jump | LEGS | plyo box | Exact normalized name match to catalog entry. |
| Broad Jump | Legs | Plyometric Leg Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Depth Jump | Legs | Plyometric Leg Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Jump Squat | Legs | Plyometric Leg Exercises | A | Jump Squat | jump-squat | LEGS |  | Exact normalized name match to catalog entry. |
| Lateral Bounds | Legs | Plyometric Leg Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Skater Jump | Legs | Plyometric Leg Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Split Squat Jump | Legs | Plyometric Leg Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Tuck Jump | Legs | Plyometric Leg Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Leg Extension | Legs | Quad Isolation Exercises | A | Leg Extension | leg-extension | LEGS | leg extension | Exact normalized name match to catalog entry. |
| Peterson Step-Up | Legs | Quad Isolation Exercises | B | Step Ups | step-ups | LEGS |  | Same exercise identity as catalog under name "Step Ups". |
| Sissy Squat | Legs | Quad Isolation Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Spanish Squat | Legs | Quad Isolation Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Terminal Knee Extension (TKE) | Legs | Quad Isolation Exercises | B | Banded Terminal Knee Extension | banded-terminal-knee-extension | LEGS | loop band | Same exercise identity as catalog under name "Banded Terminal Knee Extension". |
| Wall Sit | Legs | Quad Isolation Exercises | A | Wall Sit | wall-sit | LEGS |  | Exact normalized name match to catalog entry. |
| Band Calf Raise | Legs | Resistance Band Exercises | B | Standing Calf Raise | standing-calf-raise | LEGS | standing calf raise machine | Same exercise identity as catalog under name "Standing Calf Raise". |
| Band Glute Bridge | Legs | Resistance Band Exercises | B | Banded Glute Bridge | banded-glute-bridge | LEGS | loop band | Same exercise identity as catalog under name "Banded Glute Bridge". |
| Band Hip Abduction | Legs | Resistance Band Exercises | B | Machine Hip Abduction | hip-abduction | LEGS | hip abduction machine | Same exercise identity as catalog under name "Machine Hip Abduction". |
| Band Lunge | Legs | Resistance Band Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Band Monster Walk | Legs | Resistance Band Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Band Squat | Legs | Resistance Band Exercises | B | Banded Squat | banded-squat | LEGS | loop band | Same exercise identity as catalog under name "Banded Squat". |
| Bodyweight Single-Leg Calf Raise | Legs | Seated (Soleus Focus) | B | Single Leg Calf Raise | single-leg-calf-raise | LEGS |  | Same exercise identity as catalog under name "Single Leg Calf Raise". |
| Dumbbell Seated Calf Raise | Legs | Seated (Soleus Focus) | B | Seated Calf Raise | seated-calf-raise | LEGS | seated calf raise machine | Same exercise identity as catalog under name "Seated Calf Raise". |
| Machine Seated Calf Raise | Legs | Seated (Soleus Focus) | B | Seated Calf Raise | seated-calf-raise | LEGS | seated calf raise machine | Same exercise identity as catalog under name "Seated Calf Raise". |
| Seated Calf Raise | Legs | Seated (Soleus Focus) | A | Seated Calf Raise | seated-calf-raise | LEGS | seated calf raise machine | Exact normalized name match to catalog entry. |
| Stair Calf Raise | Legs | Seated (Soleus Focus) | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Back Squat | Legs | Squat Variations (Quads, Glutes, Core) | B | Barbell Back Squat | squat | LEGS | barbell | Same exercise identity as catalog under name "Barbell Back Squat". |
| Box Squat | Legs | Squat Variations (Quads, Glutes, Core) | A | Box Squat | box-squat | LEGS |  | Exact normalized name match to catalog entry. |
| Front Squat | Legs | Squat Variations (Quads, Glutes, Core) | A | Front Squat | front-squat | LEGS | barbell | Exact normalized name match to catalog entry. |
| Goblet Squat | Legs | Squat Variations (Quads, Glutes, Core) | A | Goblet Squat | goblet-squat | LEGS | kettlebell | Exact normalized name match to catalog entry. |
| Hack Squat | Legs | Squat Variations (Quads, Glutes, Core) | A | Hack Squat | hack-squat | LEGS | hack squat | Exact normalized name match to catalog entry. |
| Overhead Squat | Legs | Squat Variations (Quads, Glutes, Core) | A | Overhead Squat | overhead-squat | LEGS | barbell | Exact normalized name match to catalog entry. |
| Pause Squat | Legs | Squat Variations (Quads, Glutes, Core) | A | Pause Squat | pause-squat | LEGS | barbell | Exact normalized name match to catalog entry. |
| Safety Bar Squat | Legs | Squat Variations (Quads, Glutes, Core) | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Smith Machine Squat | Legs | Squat Variations (Quads, Glutes, Core) | A | Smith Machine Squat | smith-machine-squat | LEGS | smith machine | Exact normalized name match to catalog entry. |
| Split Squat | Legs | Squat Variations (Quads, Glutes, Core) | A | Split Squat | split-squat | LEGS |  | Exact normalized name match to catalog entry. |
| Sumo Squat | Legs | Squat Variations (Quads, Glutes, Core) | A | Sumo Squat | sumo-squat | LEGS | barbell | Exact normalized name match to catalog entry. |
| Zercher Squat | Legs | Squat Variations (Quads, Glutes, Core) | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Barbell Step-Up | Legs | Step-Up Variations | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Box Step-Up | Legs | Step-Up Variations | B | Step Ups | step-ups | LEGS |  | Same exercise identity as catalog under name "Step Ups". |
| Dumbbell Step-Up | Legs | Step-Up Variations | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| High Knee Step-Up | Legs | Step-Up Variations | B | Step Ups | step-ups | LEGS |  | Same exercise identity as catalog under name "Step Ups". |
| Lateral Step-Up | Legs | Step-Up Variations | B | Step Ups | step-ups | LEGS |  | Same exercise identity as catalog under name "Step Ups". |
| Heel Walk | Legs | Tibialis (Shin) Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Resistance Band Dorsiflexion | Legs | Tibialis (Shin) Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Tibialis Raise | Legs | Tibialis (Shin) Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Toe Raise | Legs | Tibialis (Shin) Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Arnold Press | Shoulders | Barbell Overhead Press (Military Press) | A | Arnold Press | arnold-press | SHOULDERS | dumbbell | Exact normalized name match to catalog entry. |
| Behind-the-Neck Press (advanced) | Shoulders | Barbell Overhead Press (Military Press) | B | Behind the Neck Press | behind-the-neck-press | SHOULDERS | barbell | Same exercise identity as catalog under name "Behind the Neck Press". |
| Bradford Press | Shoulders | Barbell Overhead Press (Military Press) | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Dumbbell Shoulder Press | Shoulders | Barbell Overhead Press (Military Press) | A | Dumbbell Shoulder Press | dumbbell-shoulder-press | SHOULDERS | dumbbell | Exact normalized name match to catalog entry. |
| Kettlebell Overhead Press | Shoulders | Barbell Overhead Press (Military Press) | B | One Arm Kettlebell Shoulder Press | one-arm-kettlebell-shoulder-press | SHOULDERS | kettlebell | Same exercise identity as catalog under name "One Arm Kettlebell Shoulder Press". |
| Machine Shoulder Press | Shoulders | Barbell Overhead Press (Military Press) | A | Machine Shoulder Press | machine-shoulder-press | SHOULDERS | shoulder press machine | Exact normalized name match to catalog entry. |
| Push Press | Shoulders | Barbell Overhead Press (Military Press) | A | Push Press | push-press | SHOULDERS | barbell | Exact normalized name match to catalog entry. |
| Seated Barbell Press | Shoulders | Barbell Overhead Press (Military Press) | B | Seated Barbell Overhead Press | seated-barbell-overhead-press | SHOULDERS | barbell | Same exercise identity as catalog under name "Seated Barbell Overhead Press". |
| Single-Arm Dumbbell Press | Shoulders | Barbell Overhead Press (Military Press) | B | One-Arm Dumbbell Push Press | one-arm-dumbbell-push-press | SHOULDERS | dumbbell | Same exercise identity as catalog under name "One-Arm Dumbbell Push Press". |
| Single-Arm Landmine Press | Shoulders | Barbell Overhead Press (Military Press) | B | One-Arm Landmine Press | one-arm-landmine-press | SHOULDERS | barbell | Same exercise identity as catalog under name "One-Arm Landmine Press". |
| Smith Machine Shoulder Press | Shoulders | Barbell Overhead Press (Military Press) | A | Smith Machine Shoulder Press | smith-machine-shoulder-press | SHOULDERS | smith machine | Exact normalized name match to catalog entry. |
| Standing Barbell Press | Shoulders | Barbell Overhead Press (Military Press) | B | Barbell Overhead Press | ohp | SHOULDERS | barbell | Same exercise identity as catalog under name "Barbell Overhead Press". |
| Z Press | Shoulders | Barbell Overhead Press (Military Press) | B | Barbell Overhead Press | ohp | SHOULDERS | barbell | Same exercise identity as catalog under name "Barbell Overhead Press". |
| Bear Crawl | Shoulders | Bodyweight Shoulder Exercises | A | Bear Crawl | bear-crawl | LEGS |  | Exact normalized name match to catalog entry. |
| Crab Walk | Shoulders | Bodyweight Shoulder Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Decline Pike Push-Up | Shoulders | Bodyweight Shoulder Exercises | B | Pike Push Ups | pike-push-ups | SHOULDERS |  | Same exercise identity as catalog under name "Pike Push Ups". |
| Handstand Push-Up | Shoulders | Bodyweight Shoulder Exercises | A | Handstand Push Ups | handstand-push-ups | SHOULDERS |  | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Hindu Push-Up | Shoulders | Bodyweight Shoulder Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Pike Push-Up | Shoulders | Bodyweight Shoulder Exercises | A | Pike Push Ups | pike-push-ups | SHOULDERS |  | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Planche Lean | Shoulders | Bodyweight Shoulder Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Wall Handstand Push-Up | Shoulders | Bodyweight Shoulder Exercises | B | Handstand Push Ups | handstand-push-ups | SHOULDERS |  | Same exercise identity as catalog under name "Handstand Push Ups". |
| Wall Walk | Shoulders | Bodyweight Shoulder Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Cable Shoulder Press | Shoulders | Cable Shoulder Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Cable Upright Row | Shoulders | Cable Shoulder Exercises | A | Cable Upright Row | cable-upright-row | SHOULDERS | cable | Exact normalized name match to catalog entry. |
| Single-Arm Cable Press | Shoulders | Cable Shoulder Exercises | B | One-Arm Landmine Press | one-arm-landmine-press | SHOULDERS | barbell | Same exercise identity as catalog under name "One-Arm Landmine Press". |
| Alternating Front Raise | Shoulders | Front Deltoid (Anterior Delts) | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Barbell Front Raise | Shoulders | Front Deltoid (Anterior Delts) | A | Barbell Front Raise | barbell-front-raise | SHOULDERS | barbell | Exact normalized name match to catalog entry. |
| Cable Front Raise | Shoulders | Front Deltoid (Anterior Delts) | A | Cable Front Raise | cable-front-raise | SHOULDERS | cable | Exact normalized name match to catalog entry. |
| Dumbbell Front Raise | Shoulders | Front Deltoid (Anterior Delts) | A | Dumbbell Front Raise | dumbbell-front-raise | SHOULDERS | dumbbell | Exact normalized name match to catalog entry. |
| Incline Front Raise | Shoulders | Front Deltoid (Anterior Delts) | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Kettlebell Front Raise | Shoulders | Front Deltoid (Anterior Delts) | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Landmine Front Raise | Shoulders | Front Deltoid (Anterior Delts) | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Plate Front Raise | Shoulders | Front Deltoid (Anterior Delts) | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Rope Front Raise | Shoulders | Front Deltoid (Anterior Delts) | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Bottoms-Up Kettlebell Press | Shoulders | Kettlebell Exercises | B | One-Arm Kettlebell Bottoms-Up Press | one-arm-kettlebell-bottoms-up-press | SHOULDERS | kettlebell | Same exercise identity as catalog under name "One-Arm Kettlebell Bottoms-Up Press". |
| Kettlebell High Pull | Shoulders | Kettlebell Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Kettlebell Push Press | Shoulders | Kettlebell Exercises | B | Double Kettlebell Push Press | double-kettlebell-push-press | SHOULDERS | kettlebell | Same exercise identity as catalog under name "Double Kettlebell Push Press". |
| Kettlebell Shoulder Press | Shoulders | Kettlebell Exercises | B | One Arm Kettlebell Shoulder Press | one-arm-kettlebell-shoulder-press | SHOULDERS | kettlebell | Same exercise identity as catalog under name "One Arm Kettlebell Shoulder Press". |
| Kettlebell Windmill | Shoulders | Kettlebell Exercises | B | Kettlebell Windmills | kettlebell-windmills | LEGS | kettlebell | Same exercise identity as catalog under name "Kettlebell Windmills". |
| Single-Arm Kettlebell Press | Shoulders | Kettlebell Exercises | B | One Arm Kettlebell Shoulder Press | one-arm-kettlebell-shoulder-press | SHOULDERS | kettlebell | Same exercise identity as catalog under name "One Arm Kettlebell Shoulder Press". |
| Turkish Get-Up | Shoulders | Kettlebell Exercises | B | Kettlebell Turkish Get Ups | kettlebell-turkish-get-ups | LEGS | kettlebell | Same exercise identity as catalog under name "Kettlebell Turkish Get Ups". |
| Lateral Raise Machine | Shoulders | Machine Shoulder Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Shoulder Press Machine | Shoulders | Machine Shoulder Exercises | B | Machine Shoulder Press | machine-shoulder-press | SHOULDERS | shoulder press machine | Same exercise identity as catalog under name "Machine Shoulder Press". |
| Smith Machine Press | Shoulders | Machine Shoulder Exercises | B | Smith Machine Shoulder Press | smith-machine-shoulder-press | SHOULDERS | smith machine | Same exercise identity as catalog under name "Smith Machine Shoulder Press". |
| Bent-Over Dumbbell Reverse Fly | Shoulders | Rear Deltoid (Posterior Delts) | B | Dumbbell Reverse Fly | dumbbell-reverse-fly | SHOULDERS | dumbbell | Single unambiguous catalog match: "Dumbbell Reverse Fly". |
| Incline Rear Delt Fly | Shoulders | Rear Deltoid (Posterior Delts) | B | Rear Delt Fly | rear-delt-fly | SHOULDERS | dumbbell | Single unambiguous catalog match: "Rear Delt Fly". |
| Ring Reverse Fly | Shoulders | Rear Deltoid (Posterior Delts) | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| TRX Reverse Fly | Shoulders | Rear Deltoid (Posterior Delts) | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Band Front Raise | Shoulders | Resistance Band Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Band Lateral Raise | Shoulders | Resistance Band Exercises | B | Dumbbell Lateral Raise | lateral-raise | SHOULDERS | dumbbell | Same exercise identity as catalog under name "Dumbbell Lateral Raise". |
| Band Shoulder Press | Shoulders | Resistance Band Exercises | B | Dumbbell Shoulder Press | dumbbell-shoulder-press | SHOULDERS | dumbbell | Same exercise identity as catalog under name "Dumbbell Shoulder Press". |
| Band External Rotation | Shoulders | Rotator Cuff Exercises | B | Cable External Rotation | cable-external-rotation | SHOULDERS | cable | Same exercise identity as catalog under name "Cable External Rotation". |
| Cable External Rotation | Shoulders | Rotator Cuff Exercises | A | Cable External Rotation | cable-external-rotation | SHOULDERS | cable | Exact normalized name match to catalog entry. |
| Cuban Press | Shoulders | Rotator Cuff Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Dumbbell External Rotation | Shoulders | Rotator Cuff Exercises | B | Cable External Rotation | cable-external-rotation | SHOULDERS | cable | Same exercise identity as catalog under name "Cable External Rotation". |
| Internal Rotation with Band | Shoulders | Rotator Cuff Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Internal Rotation with Cable | Shoulders | Rotator Cuff Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Prone T Raise | Shoulders | Rotator Cuff Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Prone W Raise | Shoulders | Rotator Cuff Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Prone Y Raise | Shoulders | Rotator Cuff Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Scaption Raise | Shoulders | Rotator Cuff Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Side-Lying External Rotation | Shoulders | Rotator Cuff Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Behind-the-Back Cable Lateral Raise | Shoulders | Side Deltoid (Lateral Delts) | B | Cable Lateral Raise | cable-lateral-raise | SHOULDERS | cable | Single unambiguous catalog match: "Cable Lateral Raise". |
| Cable Lateral Raise | Shoulders | Side Deltoid (Lateral Delts) | A | Cable Lateral Raise | cable-lateral-raise | SHOULDERS | cable | Exact normalized name match to catalog entry. |
| Dumbbell Lateral Raise | Shoulders | Side Deltoid (Lateral Delts) | A | Dumbbell Lateral Raise | lateral-raise | SHOULDERS | dumbbell | Exact normalized name match to catalog entry. |
| Incline Lateral Raise | Shoulders | Side Deltoid (Lateral Delts) | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Lean-Away Cable Lateral Raise | Shoulders | Side Deltoid (Lateral Delts) | B | Cable Lateral Raise | cable-lateral-raise | SHOULDERS | cable | Single unambiguous catalog match: "Cable Lateral Raise". |
| Machine Lateral Raise | Shoulders | Side Deltoid (Lateral Delts) | B | Plate-Loaded Lateral Raise | plate-loaded-lateral-raise | SHOULDERS | plate loaded lateral raise machine | Same exercise identity as catalog under name "Plate-Loaded Lateral Raise". |
| One-Arm Lateral Raise | Shoulders | Side Deltoid (Lateral Delts) | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Resistance Band Lateral Raise | Shoulders | Side Deltoid (Lateral Delts) | B | Dumbbell Lateral Raise | lateral-raise | SHOULDERS | dumbbell | Same exercise identity as catalog under name "Dumbbell Lateral Raise". |
| Seated Lateral Raise | Shoulders | Side Deltoid (Lateral Delts) | B | Seated Dumbbell Lateral Raise | seated-dumbbell-lateral-raise | SHOULDERS | dumbbell | Same exercise identity as catalog under name "Seated Dumbbell Lateral Raise". |
| Standing Lateral Raise | Shoulders | Side Deltoid (Lateral Delts) | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Upright Row (wide grip) | Shoulders | Side Deltoid (Lateral Delts) | B | Barbell Upright Row | upright-row | SHOULDERS | barbell | Same exercise identity as catalog under name "Barbell Upright Row". |
| Hanging Leg Raise | Sports/Fitness | Core Stability Exercises | A | Hanging Leg Raise | hanging-leg-raise | CORE | pull up bar | Exact normalized name match to catalog entry. |
| L-Sit Hold | Sports/Fitness | Core Stability Exercises | B | L Sit | l-sit | LEGS | dip station | Same exercise identity as catalog under name "L Sit". |
| Russian Twist | Sports/Fitness | Core Stability Exercises | A | Russian Twist | russian-twist | CORE |  | Exact normalized name match to catalog entry. |
| Bear Crawls | Sports/Fitness | Endurance & Conditioning Exercises | B | Bear Crawl | bear-crawl | LEGS |  | Same exercise identity as catalog under name "Bear Crawl". |
| Cycling | Sports/Fitness | Endurance & Conditioning Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Interval Running | Sports/Fitness | Endurance & Conditioning Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Jump Rope | Sports/Fitness | Endurance & Conditioning Exercises | A | Jump Rope | jump-rope | LEGS | jump rope | Exact normalized name match to catalog entry. |
| Long-Distance Running | Sports/Fitness | Endurance & Conditioning Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Rowing | Sports/Fitness | Endurance & Conditioning Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Swimming | Sports/Fitness | Endurance & Conditioning Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Battle Rope Waves | Sports/Fitness | Explosive & Athletic Exercises | B | Battle Ropes | battle-ropes | LEGS | battle rope | Same exercise identity as catalog under name "Battle Ropes". |
| Bounding | Sports/Fitness | Explosive & Athletic Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Box Jumps | Sports/Fitness | Explosive & Athletic Exercises | B | Box Jump | box-jump | LEGS | plyo box | Same exercise identity as catalog under name "Box Jump". |
| Broad Jumps | Sports/Fitness | Explosive & Athletic Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Depth Jumps | Sports/Fitness | Explosive & Athletic Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Hill Sprints | Sports/Fitness | Explosive & Athletic Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Medicine Ball Throws | Sports/Fitness | Explosive & Athletic Exercises | B | Medicine Ball Slam | medicine-ball-slam | CORE | slam ball | Same exercise identity as catalog under name "Medicine Ball Slam". |
| Plyometric Push-Ups | Sports/Fitness | Explosive & Athletic Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Power Skips | Sports/Fitness | Explosive & Athletic Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Sled Pull | Sports/Fitness | Explosive & Athletic Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Sled Push | Sports/Fitness | Explosive & Athletic Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Squat Jumps | Sports/Fitness | Explosive & Athletic Exercises | B | Jump Squat | jump-squat | LEGS |  | Same exercise identity as catalog under name "Jump Squat". |
| Tuck Jumps | Sports/Fitness | Explosive & Athletic Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Arm Circles | Sports/Fitness | Mobility & Flexibility Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Cat-Cow Stretch | Sports/Fitness | Mobility & Flexibility Exercises | B | Cat-Cow | cat-cow | BACK |  | Same exercise identity as catalog under name "Cat-Cow". |
| Deep Squat Hold | Sports/Fitness | Mobility & Flexibility Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Dynamic Stretching | Sports/Fitness | Mobility & Flexibility Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Hamstring Stretch | Sports/Fitness | Mobility & Flexibility Exercises | D |  |  |  |  | Generic or ambiguous client label; manual catalogId required (4 catalog variant(s) differ by equipment/grip/attachment). |
| Hip Flexor Stretch | Sports/Fitness | Mobility & Flexibility Exercises | D |  |  |  |  | Generic or ambiguous client label; manual catalogId required (2 catalog variant(s) differ by equipment/grip/attachment). |
| Hip Mobility Drills | Sports/Fitness | Mobility & Flexibility Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Leg Swings | Sports/Fitness | Mobility & Flexibility Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Shoulder Mobility Drills | Sports/Fitness | Mobility & Flexibility Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| World's Greatest Stretch | Sports/Fitness | Mobility & Flexibility Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| 5-10-5 Pro Agility Drill | Sports/Fitness | Speed & Agility Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Acceleration Sprints | Sports/Fitness | Speed & Agility Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Change of Direction Drills | Sports/Fitness | Speed & Agility Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Cone Drills | Sports/Fitness | Speed & Agility Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Deceleration Drills | Sports/Fitness | Speed & Agility Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Ladder Drills | Sports/Fitness | Speed & Agility Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Reaction Sprints | Sports/Fitness | Speed & Agility Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Shuttle Runs | Sports/Fitness | Speed & Agility Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Sprint Intervals | Sports/Fitness | Speed & Agility Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Zig-Zag Runs | Sports/Fitness | Speed & Agility Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Agility Ladder Training | Sports/Fitness | Sports-Specific Training Drills | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Balance Training | Sports/Fitness | Sports-Specific Training Drills | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Coordination Drills | Sports/Fitness | Sports-Specific Training Drills | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Defensive Slides | Sports/Fitness | Sports-Specific Training Drills | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Footwork Drills | Sports/Fitness | Sports-Specific Training Drills | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Jump Training | Sports/Fitness | Sports-Specific Training Drills | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Lateral Shuffle | Sports/Fitness | Sports-Specific Training Drills | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Plyometric Training | Sports/Fitness | Sports-Specific Training Drills | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Reaction Ball Drills | Sports/Fitness | Sports-Specific Training Drills | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Sprint Starts | Sports/Fitness | Sports-Specific Training Drills | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Back Squats | Sports/Fitness | Strength & Power Exercises | B | Barbell Back Squat | squat | LEGS | barbell | Same exercise identity as catalog under name "Barbell Back Squat". |
| Barbell Rows | Sports/Fitness | Strength & Power Exercises | B | Bent-Over Barbell Row | barbell-row | BACK | barbell | Same exercise identity as catalog under name "Bent-Over Barbell Row". |
| Bulgarian Split Squats | Sports/Fitness | Strength & Power Exercises | A | Bulgarian Split Squat | bulgarian-split-squat | LEGS | dumbbell | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Chin-Ups | Sports/Fitness | Strength & Power Exercises | A | Chin-Ups | chin-ups | BACK | pull up bar | Exact normalized name match to catalog entry. |
| Clean and Jerks | Sports/Fitness | Strength & Power Exercises | B | Clean and Jerk | clean-and-jerk | LEGS | barbell | Same exercise identity as catalog under name "Clean and Jerk". |
| Deadlifts | Sports/Fitness | Strength & Power Exercises | D |  |  |  |  | Generic or ambiguous client label; manual catalogId required (12 catalog variant(s) differ by equipment/grip/attachment). |
| Dips | Sports/Fitness | Strength & Power Exercises | D |  |  |  |  | Generic or ambiguous client label; manual catalogId required (8 catalog variant(s) differ by equipment/grip/attachment). |
| Front Squats | Sports/Fitness | Strength & Power Exercises | A | Front Squat | front-squat | LEGS | barbell | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Hip Thrusts | Sports/Fitness | Strength & Power Exercises | B | Barbell Hip Thrust | hip-thrust | LEGS | barbell | Same exercise identity as catalog under name "Barbell Hip Thrust". |
| Lunges | Sports/Fitness | Strength & Power Exercises | A | Lunge | lunge | LEGS |  | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Overhead Press | Sports/Fitness | Strength & Power Exercises | B | Barbell Overhead Press | ohp | SHOULDERS | barbell | Same exercise identity as catalog under name "Barbell Overhead Press". |
| Power Cleans | Sports/Fitness | Strength & Power Exercises | B | Hang Power Clean | hang-power-clean | LEGS | barbell | Same exercise identity as catalog under name "Hang Power Clean". |
| Pull-Ups | Sports/Fitness | Strength & Power Exercises | A | Pull-Up | pull-up | BACK | pull up bar | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Push-Ups | Sports/Fitness | Strength & Power Exercises | A | Push-Up | push-up | CHEST |  | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Romanian Deadlifts | Sports/Fitness | Strength & Power Exercises | A | Romanian Deadlift | romanian-deadlift | LEGS | barbell | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Snatches | Sports/Fitness | Strength & Power Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Squats | Sports/Fitness | Strength & Power Exercises | D |  |  |  |  | Generic or ambiguous client label; manual catalogId required (12 catalog variant(s) differ by equipment/grip/attachment). |
| Walking Lunges | Sports/Fitness | Strength & Power Exercises | A | Walking Lunge | walking-lunge | LEGS |  | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Bench Dip | Triceps | Bodyweight Exercises | A | Bench Dips | bench-dips | ARMS |  | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Handstand Push-Up (advanced) | Triceps | Bodyweight Exercises | B | Handstand Push Ups | handstand-push-ups | SHOULDERS |  | Same exercise identity as catalog under name "Handstand Push Ups". |
| Straight-Bar Dip | Triceps | Bodyweight Exercises | A | Straight Bar Dips | straight-bar-dips | CHEST | pull up bar | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Tiger Bend Push-Up | Triceps | Bodyweight Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Cable Kickback | Triceps | Cable Exercises | B | Cable Tricep Kickback | cable-tricep-kickback | ARMS | cable | Same exercise identity as catalog under name "Cable Tricep Kickback". |
| Cable Overhead Extension | Triceps | Cable Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Cross-Body Cable Extension | Triceps | Cable Exercises | B | Single Arm Tricep Pushdown | single-arm-tricep-pushdown | ARMS | cable | Same exercise identity as catalog under name "Single Arm Tricep Pushdown". |
| Rope Pushdown | Triceps | Cable Exercises | B | Cable Tricep Pushdown | tricep-pushdown | ARMS | cable | Same exercise identity as catalog under name "Cable Tricep Pushdown". |
| Single-Arm Cable Extension | Triceps | Cable Exercises | B | Single Arm Tricep Pushdown | single-arm-tricep-pushdown | ARMS | cable | Same exercise identity as catalog under name "Single Arm Tricep Pushdown". |
| Bench Press | Triceps | Compound Exercises | B | Barbell Bench Press | bench-press | CHEST | barbell | Same exercise identity as catalog under name "Barbell Bench Press". |
| Close-Grip Bench Press | Triceps | Compound Exercises | A | Close-Grip Bench Press | close-grip-bench-press | ARMS | barbell | Exact normalized name match to catalog entry. |
| Close-Grip Push-Up | Triceps | Compound Exercises | A | Close Grip Push Ups | close-grip-push-ups | CHEST |  | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Decline Bench Press | Triceps | Compound Exercises | A | Decline Bench Press | decline-bench-press | CHEST | dumbbell | Exact normalized name match to catalog entry. |
| Diamond Push-Up | Triceps | Compound Exercises | A | Diamond Push Ups | diamond-push-ups | CHEST |  | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Floor Press | Triceps | Compound Exercises | A | Floor Press | floor-press | CHEST | barbell | Exact normalized name match to catalog entry. |
| Incline Bench Press | Triceps | Compound Exercises | B | Incline Barbell Bench Press | incline-bench-press | CHEST | barbell | Same exercise identity as catalog under name "Incline Barbell Bench Press". |
| JM Press | Triceps | Compound Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Machine Dip | Triceps | Compound Exercises | B | Machine Assisted Dips | assisted-dips | ARMS | dip machine | Same exercise identity as catalog under name "Machine Assisted Dips". |
| Parallel Bar Dip | Triceps | Compound Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Ring Dip | Triceps | Compound Exercises | A | Ring Dips | ring-dips | CHEST | rings | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Smith Machine Close-Grip Bench Press | Triceps | Compound Exercises | B | Close-Grip Bench Press | close-grip-bench-press | ARMS | barbell | Same exercise identity as catalog under name "Close-Grip Bench Press". |
| Weighted Dip | Triceps | Compound Exercises | A | Weighted Dips | weighted-dips | CHEST | dip station | Exact match after normalizing hyphens, plurals, and trivial punctuation. |
| Kettlebell Close-Grip Press | Triceps | Kettlebell Exercises | B | Kettlebell Close-Grip Floor Press | kettlebell-close-grip-floor-press | ARMS | kettlebell | Same exercise identity as catalog under name "Kettlebell Close-Grip Floor Press". |
| Kettlebell Floor Press | Triceps | Kettlebell Exercises | A | Kettlebell Floor Press | kettlebell-floor-press | CHEST | kettlebell | Exact normalized name match to catalog entry. |
| Kettlebell Tate Press | Triceps | Kettlebell Exercises | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Cable Triceps Kickback | Triceps | Kickback Variations | B | Cable Tricep Kickback | cable-tricep-kickback | ARMS | cable | Same exercise identity as catalog under name "Cable Tricep Kickback". |
| Dumbbell Triceps Kickback | Triceps | Kickback Variations | B | Dumbbell Tricep Kickback | tricep-kickback | ARMS | dumbbell | Same exercise identity as catalog under name "Dumbbell Tricep Kickback". |
| Resistance Band Kickback | Triceps | Kickback Variations | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Single-Arm Kickback | Triceps | Kickback Variations | B | Dumbbell Tricep Kickback | tricep-kickback | ARMS | dumbbell | Same exercise identity as catalog under name "Dumbbell Tricep Kickback". |
| Assisted Dip Machine | Triceps | Machine Exercises | B | Machine Assisted Dips | assisted-dips | ARMS | dip machine | Same exercise identity as catalog under name "Machine Assisted Dips". |
| Cable Triceps Machine | Triceps | Machine Exercises | B | Machine Triceps Extension | machine-triceps-extension | ARMS | tricep extension machine | Same exercise identity as catalog under name "Machine Triceps Extension". |
| Triceps Extension Machine | Triceps | Machine Exercises | B | Machine Triceps Extension | machine-triceps-extension | ARMS | tricep extension machine | Same exercise identity as catalog under name "Machine Triceps Extension". |
| Barbell Overhead Extension | Triceps | Overhead Exercises (Long Head Focus) | A | Barbell Overhead Extension | barbell-overhead-extension | ARMS | barbell | Exact normalized name match to catalog entry. |
| Cable Overhead Triceps Extension | Triceps | Overhead Exercises (Long Head Focus) | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| EZ-Bar Overhead Extension | Triceps | Overhead Exercises (Long Head Focus) | B | EZ-Bar Overhead Tricep Extension | ez-bar-overhead-extension | ARMS | ez bar | Same exercise identity as catalog under name "EZ-Bar Overhead Tricep Extension". |
| Kettlebell Overhead Extension | Triceps | Overhead Exercises (Long Head Focus) | B | Kettlebell Overhead Tricep Extension | kettlebell-overhead-tricep-extension | ARMS | kettlebell | Same exercise identity as catalog under name "Kettlebell Overhead Tricep Extension". |
| Overhead Dumbbell Triceps Extension | Triceps | Overhead Exercises (Long Head Focus) | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Resistance Band Overhead Extension | Triceps | Overhead Exercises (Long Head Focus) | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Rope Overhead Triceps Extension | Triceps | Overhead Exercises (Long Head Focus) | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Single-Arm Cable Overhead Extension | Triceps | Overhead Exercises (Long Head Focus) | B | Single-Arm Dumbbell Overhead Tricep Extension | single-arm-dumbbell-overhead-tricep-extension | ARMS | dumbbell | Same exercise identity as catalog under name "Single-Arm Dumbbell Overhead Tricep Extension". |
| Single-Arm Overhead Dumbbell Extension | Triceps | Overhead Exercises (Long Head Focus) | B | Single-Arm Dumbbell Overhead Tricep Extension | single-arm-dumbbell-overhead-tricep-extension | ARMS | dumbbell | Same exercise identity as catalog under name "Single-Arm Dumbbell Overhead Tricep Extension". |
| Two-Arm Overhead Dumbbell Extension | Triceps | Overhead Exercises (Long Head Focus) | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Dual Cable Pushdown | Triceps | Pushdown Variations | B | Cable Tricep Pushdown | tricep-pushdown | ARMS | cable | Same exercise identity as catalog under name "Cable Tricep Pushdown". |
| Resistance Band Pushdown | Triceps | Pushdown Variations | B | Cable Tricep Pushdown | tricep-pushdown | ARMS | cable | Same exercise identity as catalog under name "Cable Tricep Pushdown". |
| Reverse-Grip Pushdown | Triceps | Pushdown Variations | B | Cable Tricep Pushdown | tricep-pushdown | ARMS | cable | Same exercise identity as catalog under name "Cable Tricep Pushdown". |
| Rope Triceps Pushdown | Triceps | Pushdown Variations | B | Cable Tricep Pushdown | tricep-pushdown | ARMS | cable | Same exercise identity as catalog under name "Cable Tricep Pushdown". |
| Single-Arm Pushdown | Triceps | Pushdown Variations | B | Single Arm Tricep Pushdown | single-arm-tricep-pushdown | ARMS | cable | Same exercise identity as catalog under name "Single Arm Tricep Pushdown". |
| Straight-Bar Pushdown | Triceps | Pushdown Variations | B | Cable Tricep Pushdown | tricep-pushdown | ARMS | cable | Same exercise identity as catalog under name "Cable Tricep Pushdown". |
| V-Bar Pushdown | Triceps | Pushdown Variations | B | V-Bar Tricep Pushdown | v-bar-tricep-pushdown | ARMS | cable | Same exercise identity as catalog under name "V-Bar Tricep Pushdown". |
| Band Close-Grip Press | Triceps | Resistance Band Exercises | B | Close Grip Push Ups | close-grip-push-ups | CHEST |  | Same exercise identity as catalog under name "Close Grip Push Ups". |
| Band Kickback | Triceps | Resistance Band Exercises | B | Cable Tricep Kickback | cable-tricep-kickback | ARMS | cable | Same exercise identity as catalog under name "Cable Tricep Kickback". |
| Band Overhead Extension | Triceps | Resistance Band Exercises | C |  |  |  |  | No catalog exercise matches this identity under strict matching rules. |
| Band Pushdown | Triceps | Resistance Band Exercises | B | Cable Tricep Pushdown | tricep-pushdown | ARMS | cable | Same exercise identity as catalog under name "Cable Tricep Pushdown". |
| Barbell Skull Crusher | Triceps | Skull Crusher Variations | B | Skull Crusher | skull-crusher | ARMS | barbell | Same exercise identity as catalog under name "Skull Crusher". |
| Cable Skull Crusher | Triceps | Skull Crusher Variations | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Decline Skull Crusher | Triceps | Skull Crusher Variations | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Dumbbell Skull Crusher | Triceps | Skull Crusher Variations | A | Dumbbell Skull Crusher | db-skull-crusher | ARMS | dumbbell | Exact normalized name match to catalog entry. |
| EZ-Bar Skull Crusher | Triceps | Skull Crusher Variations | B | Skull Crusher | skull-crusher | ARMS | barbell | Same exercise identity as catalog under name "Skull Crusher". |
| Floor Skull Crusher | Triceps | Skull Crusher Variations | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Incline Skull Crusher | Triceps | Skull Crusher Variations | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Cross-Body Triceps Extension | Triceps | Specialty Variations | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Isometric Triceps Hold | Triceps | Specialty Variations | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| One-and-a-Half Rep Extension | Triceps | Specialty Variations | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| PJR Pullover | Triceps | Specialty Variations | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Rolling Dumbbell Extension | Triceps | Specialty Variations | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Tate Press | Triceps | Specialty Variations | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |
| Tempo Triceps Extension | Triceps | Specialty Variations | C |  |  |  |  | No catalog entry represents this specific exercise variant or drill. |

## OUTPUT 4 — Clearly missing (C only)

### Back (29)

- **Australian pull-up**
  - Suggested canonical: Australian pull-up
  - Equipment: unspecified
  - Muscle group: BACK
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Commando pull-up**
  - Suggested canonical: Commando pull-up
  - Equipment: unspecified
  - Muscle group: BACK
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Front lever progression**
  - Suggested canonical: Front lever progression
  - Equipment: unspecified
  - Muscle group: BACK
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Cable pullover**
  - Suggested canonical: Cable pullover
  - Equipment: cable
  - Muscle group: BACK
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **High cable row**
  - Suggested canonical: High cable row
  - Equipment: cable
  - Muscle group: BACK
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Low cable row**
  - Suggested canonical: Low cable row
  - Equipment: cable
  - Muscle group: BACK
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Single-arm cable row**
  - Suggested canonical: Single-arm cable row
  - Equipment: cable
  - Muscle group: BACK
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Snatch-grip deadlift**
  - Suggested canonical: Snatch-grip deadlift
  - Equipment: unspecified
  - Muscle group: BACK
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Trap bar deadlift**
  - Suggested canonical: Trap bar deadlift
  - Equipment: unspecified
  - Muscle group: BACK
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Landmine row**
  - Suggested canonical: Landmine row
  - Equipment: unspecified
  - Muscle group: BACK
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Meadows row**
  - Suggested canonical: Meadows row
  - Equipment: unspecified
  - Muscle group: BACK
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **One-arm cable row**
  - Suggested canonical: One-arm cable row
  - Equipment: cable
  - Muscle group: BACK
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Seal row**
  - Suggested canonical: Seal row
  - Equipment: unspecified
  - Muscle group: BACK
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Yates row**
  - Suggested canonical: Yates row
  - Equipment: unspecified
  - Muscle group: BACK
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Renegade row**
  - Suggested canonical: Renegade row
  - Equipment: unspecified
  - Muscle group: BACK
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Reverse hyperextension**
  - Suggested canonical: Reverse hyperextension
  - Equipment: unspecified
  - Muscle group: BACK
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **High row machine**
  - Suggested canonical: High row machine
  - Equipment: machine
  - Muscle group: BACK
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Iso-lateral row machine**
  - Suggested canonical: Iso-lateral row machine
  - Equipment: machine
  - Muscle group: BACK
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Seated row machine**
  - Suggested canonical: Seated row machine
  - Equipment: machine
  - Muscle group: BACK
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Bent-over reverse fly**
  - Suggested canonical: Bent-over reverse fly
  - Equipment: unspecified
  - Muscle group: BACK
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Cable reverse fly**
  - Suggested canonical: Cable reverse fly
  - Equipment: cable
  - Muscle group: BACK
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Reverse pec deck**
  - Suggested canonical: Reverse pec deck
  - Equipment: machine
  - Muscle group: BACK
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **T-raise**
  - Suggested canonical: T-raise
  - Equipment: unspecified
  - Muscle group: BACK
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **W-raise**
  - Suggested canonical: W-raise
  - Equipment: unspecified
  - Muscle group: BACK
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Y-raise**
  - Suggested canonical: Y-raise
  - Equipment: unspecified
  - Muscle group: BACK
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Band reverse fly**
  - Suggested canonical: Band reverse fly
  - Equipment: resistance band
  - Muscle group: BACK
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Cable shrug**
  - Suggested canonical: Cable shrug
  - Equipment: cable
  - Muscle group: BACK
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Trap bar shrug**
  - Suggested canonical: Trap bar shrug
  - Equipment: unspecified
  - Muscle group: BACK
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Rope pulldown**
  - Suggested canonical: Rope pulldown
  - Equipment: unspecified
  - Muscle group: BACK
  - Why missing: No catalog entry represents this specific exercise variant or drill.

### Shoulders (28)

- **Bradford Press**
  - Suggested canonical: Bradford Press
  - Equipment: unspecified
  - Muscle group: SHOULDERS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Crab Walk**
  - Suggested canonical: Crab Walk
  - Equipment: unspecified
  - Muscle group: SHOULDERS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Hindu Push-Up**
  - Suggested canonical: Hindu Push-Up
  - Equipment: unspecified
  - Muscle group: SHOULDERS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Planche Lean**
  - Suggested canonical: Planche Lean
  - Equipment: unspecified
  - Muscle group: SHOULDERS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Wall Walk**
  - Suggested canonical: Wall Walk
  - Equipment: unspecified
  - Muscle group: SHOULDERS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Cable Shoulder Press**
  - Suggested canonical: Cable Shoulder Press
  - Equipment: cable
  - Muscle group: SHOULDERS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Alternating Front Raise**
  - Suggested canonical: Alternating Front Raise
  - Equipment: unspecified
  - Muscle group: SHOULDERS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Incline Front Raise**
  - Suggested canonical: Incline Front Raise
  - Equipment: unspecified
  - Muscle group: SHOULDERS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Kettlebell Front Raise**
  - Suggested canonical: Kettlebell Front Raise
  - Equipment: kettlebell
  - Muscle group: SHOULDERS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Landmine Front Raise**
  - Suggested canonical: Landmine Front Raise
  - Equipment: unspecified
  - Muscle group: SHOULDERS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Plate Front Raise**
  - Suggested canonical: Plate Front Raise
  - Equipment: unspecified
  - Muscle group: SHOULDERS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Rope Front Raise**
  - Suggested canonical: Rope Front Raise
  - Equipment: unspecified
  - Muscle group: SHOULDERS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Kettlebell High Pull**
  - Suggested canonical: Kettlebell High Pull
  - Equipment: kettlebell
  - Muscle group: SHOULDERS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Lateral Raise Machine**
  - Suggested canonical: Lateral Raise Machine
  - Equipment: machine
  - Muscle group: SHOULDERS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Ring Reverse Fly**
  - Suggested canonical: Ring Reverse Fly
  - Equipment: varies / conditioning
  - Muscle group: SHOULDERS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **TRX Reverse Fly**
  - Suggested canonical: TRX Reverse Fly
  - Equipment: varies / conditioning
  - Muscle group: SHOULDERS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Band Front Raise**
  - Suggested canonical: Band Front Raise
  - Equipment: resistance band
  - Muscle group: SHOULDERS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Cuban Press**
  - Suggested canonical: Cuban Press
  - Equipment: unspecified
  - Muscle group: SHOULDERS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Internal Rotation with Band**
  - Suggested canonical: Internal Rotation with Band
  - Equipment: resistance band
  - Muscle group: SHOULDERS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Internal Rotation with Cable**
  - Suggested canonical: Internal Rotation with Cable
  - Equipment: cable
  - Muscle group: SHOULDERS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Prone T Raise**
  - Suggested canonical: Prone T Raise
  - Equipment: unspecified
  - Muscle group: SHOULDERS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Prone W Raise**
  - Suggested canonical: Prone W Raise
  - Equipment: unspecified
  - Muscle group: SHOULDERS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Prone Y Raise**
  - Suggested canonical: Prone Y Raise
  - Equipment: unspecified
  - Muscle group: SHOULDERS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Scaption Raise**
  - Suggested canonical: Scaption Raise
  - Equipment: unspecified
  - Muscle group: SHOULDERS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Side-Lying External Rotation**
  - Suggested canonical: Side-Lying External Rotation
  - Equipment: unspecified
  - Muscle group: SHOULDERS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Incline Lateral Raise**
  - Suggested canonical: Incline Lateral Raise
  - Equipment: unspecified
  - Muscle group: SHOULDERS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **One-Arm Lateral Raise**
  - Suggested canonical: One-Arm Lateral Raise
  - Equipment: unspecified
  - Muscle group: SHOULDERS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Standing Lateral Raise**
  - Suggested canonical: Standing Lateral Raise
  - Equipment: unspecified
  - Muscle group: SHOULDERS
  - Why missing: No catalog exercise matches this identity under strict matching rules.

### Biceps (21)

- **Scott Curl**
  - Suggested canonical: Scott Curl
  - Equipment: unspecified
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Ring Chin-Up**
  - Suggested canonical: Ring Chin-Up
  - Equipment: varies / conditioning
  - Muscle group: ARMS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Towel Chin-Up**
  - Suggested canonical: Towel Chin-Up
  - Equipment: unspecified
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Bayesian Cable Curl**
  - Suggested canonical: Bayesian Cable Curl
  - Equipment: cable
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Alternating Dumbbell Curl**
  - Suggested canonical: Alternating Dumbbell Curl
  - Equipment: dumbbell
  - Muscle group: ARMS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Bayesian Dumbbell Curl**
  - Suggested canonical: Bayesian Dumbbell Curl
  - Equipment: dumbbell
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Offset-Grip Dumbbell Curl**
  - Suggested canonical: Offset-Grip Dumbbell Curl
  - Equipment: dumbbell
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Standing Dumbbell Curl**
  - Suggested canonical: Standing Dumbbell Curl
  - Equipment: dumbbell
  - Muscle group: ARMS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **21s Curl**
  - Suggested canonical: 21s Curl
  - Equipment: unspecified
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Isometric Curl Hold**
  - Suggested canonical: Isometric Curl Hold
  - Equipment: unspecified
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **One-and-a-Half Rep Curl**
  - Suggested canonical: One-and-a-Half Rep Curl
  - Equipment: unspecified
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Partial-Range Curl**
  - Suggested canonical: Partial-Range Curl
  - Equipment: unspecified
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Tempo Curl (slow eccentric)**
  - Suggested canonical: Tempo Curl (slow eccentric)
  - Equipment: unspecified
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Bottoms-Up Curl**
  - Suggested canonical: Bottoms-Up Curl
  - Equipment: unspecified
  - Muscle group: ARMS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Assisted Chin-Up Machine (underhand grip)**
  - Suggested canonical: Assisted Chin-Up Machine (underhand grip)
  - Equipment: machine
  - Muscle group: ARMS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Band Curl**
  - Suggested canonical: Band Curl
  - Equipment: resistance band
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Band Hammer Curl**
  - Suggested canonical: Band Hammer Curl
  - Equipment: resistance band
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **High Anchor Band Curl**
  - Suggested canonical: High Anchor Band Curl
  - Equipment: resistance band
  - Muscle group: ARMS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Reverse Band Curl**
  - Suggested canonical: Reverse Band Curl
  - Equipment: resistance band
  - Muscle group: ARMS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Single-Arm Band Curl**
  - Suggested canonical: Single-Arm Band Curl
  - Equipment: resistance band
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Reverse Dumbbell Curl**
  - Suggested canonical: Reverse Dumbbell Curl
  - Equipment: dumbbell
  - Muscle group: ARMS
  - Why missing: No catalog exercise matches this identity under strict matching rules.

### Triceps (23)

- **Tiger Bend Push-Up**
  - Suggested canonical: Tiger Bend Push-Up
  - Equipment: unspecified
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Cable Overhead Extension**
  - Suggested canonical: Cable Overhead Extension
  - Equipment: cable
  - Muscle group: ARMS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **JM Press**
  - Suggested canonical: JM Press
  - Equipment: unspecified
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Parallel Bar Dip**
  - Suggested canonical: Parallel Bar Dip
  - Equipment: unspecified
  - Muscle group: ARMS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Kettlebell Tate Press**
  - Suggested canonical: Kettlebell Tate Press
  - Equipment: kettlebell
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Resistance Band Kickback**
  - Suggested canonical: Resistance Band Kickback
  - Equipment: resistance band
  - Muscle group: ARMS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Cable Overhead Triceps Extension**
  - Suggested canonical: Cable Overhead Triceps Extension
  - Equipment: cable
  - Muscle group: ARMS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Overhead Dumbbell Triceps Extension**
  - Suggested canonical: Overhead Dumbbell Triceps Extension
  - Equipment: dumbbell
  - Muscle group: ARMS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Resistance Band Overhead Extension**
  - Suggested canonical: Resistance Band Overhead Extension
  - Equipment: resistance band
  - Muscle group: ARMS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Rope Overhead Triceps Extension**
  - Suggested canonical: Rope Overhead Triceps Extension
  - Equipment: unspecified
  - Muscle group: ARMS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Two-Arm Overhead Dumbbell Extension**
  - Suggested canonical: Two-Arm Overhead Dumbbell Extension
  - Equipment: dumbbell
  - Muscle group: ARMS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Band Overhead Extension**
  - Suggested canonical: Band Overhead Extension
  - Equipment: resistance band
  - Muscle group: ARMS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Cable Skull Crusher**
  - Suggested canonical: Cable Skull Crusher
  - Equipment: cable
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Decline Skull Crusher**
  - Suggested canonical: Decline Skull Crusher
  - Equipment: unspecified
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Floor Skull Crusher**
  - Suggested canonical: Floor Skull Crusher
  - Equipment: unspecified
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Incline Skull Crusher**
  - Suggested canonical: Incline Skull Crusher
  - Equipment: unspecified
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Cross-Body Triceps Extension**
  - Suggested canonical: Cross-Body Triceps Extension
  - Equipment: unspecified
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Isometric Triceps Hold**
  - Suggested canonical: Isometric Triceps Hold
  - Equipment: unspecified
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **One-and-a-Half Rep Extension**
  - Suggested canonical: One-and-a-Half Rep Extension
  - Equipment: unspecified
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **PJR Pullover**
  - Suggested canonical: PJR Pullover
  - Equipment: unspecified
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Rolling Dumbbell Extension**
  - Suggested canonical: Rolling Dumbbell Extension
  - Equipment: dumbbell
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Tate Press**
  - Suggested canonical: Tate Press
  - Equipment: unspecified
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Tempo Triceps Extension**
  - Suggested canonical: Tempo Triceps Extension
  - Equipment: unspecified
  - Muscle group: ARMS
  - Why missing: No catalog entry represents this specific exercise variant or drill.

### Legs (35)

- **Monster Walk**
  - Suggested canonical: Monster Walk
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Standing Band Hip Abduction**
  - Suggested canonical: Standing Band Hip Abduction
  - Equipment: resistance band
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Copenhagen Plank**
  - Suggested canonical: Copenhagen Plank
  - Equipment: varies / conditioning
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Shrimp Squat**
  - Suggested canonical: Shrimp Squat
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Cable Squat**
  - Suggested canonical: Cable Squat
  - Equipment: cable
  - Muscle group: LEGS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Leg Press Calf Raise**
  - Suggested canonical: Leg Press Calf Raise
  - Equipment: machine
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Donkey Kick**
  - Suggested canonical: Donkey Kick
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Frog Pump**
  - Suggested canonical: Frog Pump
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Glute-Ham Raise (GHR)**
  - Suggested canonical: Glute-Ham Raise (GHR)
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Standing Leg Curl**
  - Suggested canonical: Standing Leg Curl
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Curtsy Lunge**
  - Suggested canonical: Curtsy Lunge
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Deficit Lunge**
  - Suggested canonical: Deficit Lunge
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Forward Lunge**
  - Suggested canonical: Forward Lunge
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Landmine Lunge**
  - Suggested canonical: Landmine Lunge
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Lateral Lunge**
  - Suggested canonical: Lateral Lunge
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Step-Back Lunge**
  - Suggested canonical: Step-Back Lunge
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Broad Jump**
  - Suggested canonical: Broad Jump
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Depth Jump**
  - Suggested canonical: Depth Jump
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Lateral Bounds**
  - Suggested canonical: Lateral Bounds
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Skater Jump**
  - Suggested canonical: Skater Jump
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Split Squat Jump**
  - Suggested canonical: Split Squat Jump
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Tuck Jump**
  - Suggested canonical: Tuck Jump
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Sissy Squat**
  - Suggested canonical: Sissy Squat
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Spanish Squat**
  - Suggested canonical: Spanish Squat
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Band Lunge**
  - Suggested canonical: Band Lunge
  - Equipment: resistance band
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Band Monster Walk**
  - Suggested canonical: Band Monster Walk
  - Equipment: resistance band
  - Muscle group: LEGS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Stair Calf Raise**
  - Suggested canonical: Stair Calf Raise
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Safety Bar Squat**
  - Suggested canonical: Safety Bar Squat
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Zercher Squat**
  - Suggested canonical: Zercher Squat
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Barbell Step-Up**
  - Suggested canonical: Barbell Step-Up
  - Equipment: barbell
  - Muscle group: LEGS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Dumbbell Step-Up**
  - Suggested canonical: Dumbbell Step-Up
  - Equipment: dumbbell
  - Muscle group: LEGS
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Heel Walk**
  - Suggested canonical: Heel Walk
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Resistance Band Dorsiflexion**
  - Suggested canonical: Resistance Band Dorsiflexion
  - Equipment: resistance band
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Tibialis Raise**
  - Suggested canonical: Tibialis Raise
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Toe Raise**
  - Suggested canonical: Toe Raise
  - Equipment: unspecified
  - Muscle group: LEGS
  - Why missing: No catalog entry represents this specific exercise variant or drill.

### Abs/Core (19)

- **Bear Crawl Hold**
  - Suggested canonical: Bear Crawl Hold
  - Equipment: unspecified
  - Muscle group: CORE
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Stability Ball Rollout**
  - Suggested canonical: Stability Ball Rollout
  - Equipment: unspecified
  - Muscle group: CORE
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Stomach Vacuum**
  - Suggested canonical: Stomach Vacuum
  - Equipment: unspecified
  - Muscle group: CORE
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Renegade Rows**
  - Suggested canonical: Renegade Rows
  - Equipment: unspecified
  - Muscle group: CORE
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **TRX Knee Tucks**
  - Suggested canonical: TRX Knee Tucks
  - Equipment: varies / conditioning
  - Muscle group: CORE
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **TRX Pike**
  - Suggested canonical: TRX Pike
  - Equipment: varies / conditioning
  - Muscle group: CORE
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Garhammer Raises**
  - Suggested canonical: Garhammer Raises
  - Equipment: unspecified
  - Muscle group: CORE
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Cable Woodchoppers**
  - Suggested canonical: Cable Woodchoppers
  - Equipment: cable
  - Muscle group: CORE
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Cross-Body Mountain Climbers**
  - Suggested canonical: Cross-Body Mountain Climbers
  - Equipment: unspecified
  - Muscle group: CORE
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Heel Touches**
  - Suggested canonical: Heel Touches
  - Equipment: unspecified
  - Muscle group: CORE
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Landmine Twists**
  - Suggested canonical: Landmine Twists
  - Equipment: unspecified
  - Muscle group: CORE
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Oblique Crunches**
  - Suggested canonical: Oblique Crunches
  - Equipment: unspecified
  - Muscle group: CORE
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Seated Twists**
  - Suggested canonical: Seated Twists
  - Equipment: unspecified
  - Muscle group: CORE
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Side Plank Hip Dips**
  - Suggested canonical: Side Plank Hip Dips
  - Equipment: varies / conditioning
  - Muscle group: CORE
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Ab Mat Sit-Ups**
  - Suggested canonical: Ab Mat Sit-Ups
  - Equipment: unspecified
  - Muscle group: CORE
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Machine Crunches**
  - Suggested canonical: Machine Crunches
  - Equipment: machine
  - Muscle group: CORE
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Stability Ball Crunches**
  - Suggested canonical: Stability Ball Crunches
  - Equipment: unspecified
  - Muscle group: CORE
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Toe Touch Crunches**
  - Suggested canonical: Toe Touch Crunches
  - Equipment: unspecified
  - Muscle group: CORE
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Weighted Crunches**
  - Suggested canonical: Weighted Crunches
  - Equipment: unspecified
  - Muscle group: CORE
  - Why missing: No catalog exercise matches this identity under strict matching rules.

### Sports/Fitness (42)

- **Cycling**
  - Suggested canonical: Cycling
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Interval Running**
  - Suggested canonical: Interval Running
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Long-Distance Running**
  - Suggested canonical: Long-Distance Running
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Rowing**
  - Suggested canonical: Rowing
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Swimming**
  - Suggested canonical: Swimming
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Bounding**
  - Suggested canonical: Bounding
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Broad Jumps**
  - Suggested canonical: Broad Jumps
  - Equipment: unspecified
  - Muscle group: FULL_BODY
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Depth Jumps**
  - Suggested canonical: Depth Jumps
  - Equipment: unspecified
  - Muscle group: FULL_BODY
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Hill Sprints**
  - Suggested canonical: Hill Sprints
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Plyometric Push-Ups**
  - Suggested canonical: Plyometric Push-Ups
  - Equipment: unspecified
  - Muscle group: FULL_BODY
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Power Skips**
  - Suggested canonical: Power Skips
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Sled Pull**
  - Suggested canonical: Sled Pull
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Sled Push**
  - Suggested canonical: Sled Push
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Tuck Jumps**
  - Suggested canonical: Tuck Jumps
  - Equipment: unspecified
  - Muscle group: FULL_BODY
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Arm Circles**
  - Suggested canonical: Arm Circles
  - Equipment: unspecified
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Deep Squat Hold**
  - Suggested canonical: Deep Squat Hold
  - Equipment: unspecified
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Dynamic Stretching**
  - Suggested canonical: Dynamic Stretching
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **Hip Mobility Drills**
  - Suggested canonical: Hip Mobility Drills
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Leg Swings**
  - Suggested canonical: Leg Swings
  - Equipment: unspecified
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Shoulder Mobility Drills**
  - Suggested canonical: Shoulder Mobility Drills
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **World's Greatest Stretch**
  - Suggested canonical: World's Greatest Stretch
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog exercise matches this identity under strict matching rules.
- **5-10-5 Pro Agility Drill**
  - Suggested canonical: 5-10-5 Pro Agility Drill
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Acceleration Sprints**
  - Suggested canonical: Acceleration Sprints
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Change of Direction Drills**
  - Suggested canonical: Change of Direction Drills
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Cone Drills**
  - Suggested canonical: Cone Drills
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Deceleration Drills**
  - Suggested canonical: Deceleration Drills
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Ladder Drills**
  - Suggested canonical: Ladder Drills
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Reaction Sprints**
  - Suggested canonical: Reaction Sprints
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Shuttle Runs**
  - Suggested canonical: Shuttle Runs
  - Equipment: unspecified
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Sprint Intervals**
  - Suggested canonical: Sprint Intervals
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Zig-Zag Runs**
  - Suggested canonical: Zig-Zag Runs
  - Equipment: unspecified
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Agility Ladder Training**
  - Suggested canonical: Agility Ladder Training
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Balance Training**
  - Suggested canonical: Balance Training
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Coordination Drills**
  - Suggested canonical: Coordination Drills
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Defensive Slides**
  - Suggested canonical: Defensive Slides
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Footwork Drills**
  - Suggested canonical: Footwork Drills
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Jump Training**
  - Suggested canonical: Jump Training
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Lateral Shuffle**
  - Suggested canonical: Lateral Shuffle
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Plyometric Training**
  - Suggested canonical: Plyometric Training
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Reaction Ball Drills**
  - Suggested canonical: Reaction Ball Drills
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Sprint Starts**
  - Suggested canonical: Sprint Starts
  - Equipment: varies / conditioning
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.
- **Snatches**
  - Suggested canonical: Snatches
  - Equipment: unspecified
  - Muscle group: FULL_BODY
  - Why missing: No catalog entry represents this specific exercise variant or drill.

## OUTPUT 5 — Human review (D only)

### Leg Raises (Abs/Core)

Generic or ambiguous client label; manual catalogId required (3 catalog variant(s) differ by equipment/grip/attachment).

| catalogId | Catalog name | muscleGroup | equipment |
|---|---|---|---|
| captains-chair-leg-raise | Captain's Chair Leg Raise | CORE |  |
| hanging-leg-raise | Hanging Leg Raise | CORE | pull up bar |
| lying-leg-raise | Lying Leg Raise | CORE |  |

### Dumbbell row (Back)

Generic or ambiguous client label; manual catalogId required (5 catalog variant(s) differ by equipment/grip/attachment).

| catalogId | Catalog name | muscleGroup | equipment |
|---|---|---|---|
| bent-over-db-row | Bent-Over Dumbbell Row | BACK | dumbbell |
| chest-supported-db-row | Chest-Supported Dumbbell Row | BACK | dumbbell |
| dumbbell-upright-row | Dumbbell Upright Row | SHOULDERS | dumbbell |
| single-arm-chest-supported-dumbbell-row | Single-Arm Chest-Supported Dumbbell Row | BACK | dumbbell |
| single-arm-db-row | Single-Arm Dumbbell Row | BACK | dumbbell |

### Machine row (Back)

Generic or ambiguous client label; manual catalogId required (5 catalog variant(s) differ by equipment/grip/attachment).

| catalogId | Catalog name | muscleGroup | equipment |
|---|---|---|---|
| chest-supported-smith-machine-row | Chest-Supported Smith Machine Row | BACK | smith machine |
| rowing-machine | Rowing Machine | LEGS | rower |
| smith-machine-bent-over-row | Smith Machine Bent Over Row | BACK | smith machine |
| smith-machine-reverse-grip-bent-over-row | Smith Machine Reverse Grip Bent Over Row | BACK | smith machine |
| smith-machine-upright-row | Smith Machine Upright Row | SHOULDERS | smith machine |

### Lat pulldown machine (Back)

Generic or ambiguous client label; manual catalogId required (6 catalog variant(s) differ by equipment/grip/attachment).

| catalogId | Catalog name | muscleGroup | equipment |
|---|---|---|---|
| behind-the-neck-lat-pulldown | Behind-the-Neck Lat Pulldown | BACK | lat pulldown machine |
| close-grip-lat-pulldown | Close Grip Lat Pulldown | BACK | cable |
| lat-pulldown | Lat Pulldown | BACK | cable |
| one-arm-lat-pulldown | One-Arm Lat Pulldown | BACK | cable |
| reverse-grip-lat-pulldown | Reverse Grip Lat Pulldown | BACK | cable |
| v-bar-lat-pulldown | V-Bar Lat Pulldown | BACK | lat pulldown machine |

### Rear delt row (Back)

Multiple catalog candidates (2); equipment/grip/machine variant unclear.

| catalogId | Catalog name | muscleGroup | equipment |
|---|---|---|---|
| barbell-rear-delt-row | Barbell Rear Delt Row | SHOULDERS | barbell |
| double-kettlebell-rear-delt-row | Double Kettlebell Rear Delt Row | SHOULDERS | kettlebell |

### Wide-grip lat pulldown (Back)

Generic or ambiguous client label; manual catalogId required (6 catalog variant(s) differ by equipment/grip/attachment).

| catalogId | Catalog name | muscleGroup | equipment |
|---|---|---|---|
| behind-the-neck-lat-pulldown | Behind-the-Neck Lat Pulldown | BACK | lat pulldown machine |
| close-grip-lat-pulldown | Close Grip Lat Pulldown | BACK | cable |
| lat-pulldown | Lat Pulldown | BACK | cable |
| one-arm-lat-pulldown | One-Arm Lat Pulldown | BACK | cable |
| reverse-grip-lat-pulldown | Reverse Grip Lat Pulldown | BACK | cable |
| v-bar-lat-pulldown | V-Bar Lat Pulldown | BACK | lat pulldown machine |

### Calf Raise (Legs)

Generic or ambiguous client label; manual catalogId required (12 catalog variant(s) differ by equipment/grip/attachment).

| catalogId | Catalog name | muscleGroup | equipment |
|---|---|---|---|
| banded-calf-stretch | Banded Calf Stretch | LEGS | resistance band |
| barbell-calf-raise | Barbell Calf Raise | LEGS | barbell |
| bench-calf-stretch | Bench Calf Stretch | LEGS | flat bench |
| bodyweight-calf-raise | Bodyweight Calf Raise | LEGS |  |
| donkey-calf-raise | Donkey Calf Raise | LEGS |  |
| dumbbell-calf-raise | Dumbbell Calf Raise | LEGS | dumbbell |
| hack-squat-calf-raise | Hack Squat Calf Raise | LEGS | hack squat |
| machine-calf-raise | Machine Calf Raise | LEGS | standing calf raise machine |
| plate-loaded-donkey-calf-raise | Plate-Loaded Donkey Calf Raise | LEGS | donkey calf raise machine |
| seated-calf-raise | Seated Calf Raise | LEGS | seated calf raise machine |
| single-leg-calf-raise | Single Leg Calf Raise | LEGS |  |
| smith-machine-calf-raise | Smith Machine Calf Raise | LEGS | smith machine |

### Hamstring Stretch (Sports/Fitness)

Generic or ambiguous client label; manual catalogId required (4 catalog variant(s) differ by equipment/grip/attachment).

| catalogId | Catalog name | muscleGroup | equipment |
|---|---|---|---|
| banded-hamstring-stretch | Banded Hamstring Stretch | LEGS | resistance band |
| bench-hamstring-stretch | Bench Hamstring Stretch | LEGS | flat bench |
| nordic-hamstring-curl | Nordic Hamstring Curl | LEGS | glute ham developer |
| trx-hamstring-curl | TRX Hamstring Curl | LEGS | suspension trainer |

### Hip Flexor Stretch (Sports/Fitness)

Generic or ambiguous client label; manual catalogId required (2 catalog variant(s) differ by equipment/grip/attachment).

| catalogId | Catalog name | muscleGroup | equipment |
|---|---|---|---|
| half-kneeling-hip-flexor-rock | Half-Kneeling Hip Flexor Rock | LEGS |  |
| kneeling-hip-flexor-stretch | Kneeling Hip Flexor Stretch | LEGS |  |

### Deadlifts (Sports/Fitness)

Generic or ambiguous client label; manual catalogId required (12 catalog variant(s) differ by equipment/grip/attachment).

| catalogId | Catalog name | muscleGroup | equipment |
|---|---|---|---|
| banded-romanian-deadlift | Banded Romanian Deadlift | LEGS | loop band |
| db-kickstand-deadlift | Dumbbell Kickstand Deadlift | BACK | dumbbell |
| deadlift | Barbell Deadlift | BACK | barbell |
| deficit-deadlift | Deficit Deadlift | BACK | barbell |
| double-db-kickstand-deadlift | Double Dumbbell Kickstand Deadlift | BACK | dumbbell |
| dumbbell-deadlift | Dumbbell Deadlift | BACK | dumbbell |
| dumbbell-romanian-deadlift | Dumbbell Romanian Deadlift | BACK | dumbbell |
| ez-bar-romanian-deadlift | EZ-Bar Romanian Deadlift | LEGS | ez bar |
| hex-bar-deadlift | Hex Bar Deadlift | BACK | trap bar |
| kettlebell-deadlift | Kettlebell Deadlift | BACK | kettlebell |
| kettlebell-kickstand-deadlift | Kettlebell Kickstand Deadlift | BACK | kettlebell |
| kettlebell-single-leg-deadlift | Kettlebell Single Leg Deadlift | BACK | kettlebell |

### Dips (Sports/Fitness)

Generic or ambiguous client label; manual catalogId required (8 catalog variant(s) differ by equipment/grip/attachment).

| catalogId | Catalog name | muscleGroup | equipment |
|---|---|---|---|
| assisted-dips | Machine Assisted Dips | ARMS | dip machine |
| bench-dips | Bench Dips | ARMS |  |
| crab-dips | Crab Dips | ARMS |  |
| dips | Chest Dips | CHEST | dip station |
| reverse-plank-dips | Reverse Plank Dips | ARMS |  |
| ring-dips | Ring Dips | CHEST | rings |
| straight-bar-dips | Straight Bar Dips | CHEST | pull up bar |
| weighted-dips | Weighted Dips | CHEST | dip station |

### Squats (Sports/Fitness)

Generic or ambiguous client label; manual catalogId required (12 catalog variant(s) differ by equipment/grip/attachment).

| catalogId | Catalog name | muscleGroup | equipment |
|---|---|---|---|
| banded-squat | Banded Squat | LEGS | loop band |
| bodyweight-squat | Bodyweight Squat | LEGS |  |
| box-squat | Box Squat | LEGS |  |
| bulgarian-split-squat | Bulgarian Split Squat | LEGS | dumbbell |
| cossack-squat | Cossack Squat | LEGS |  |
| db-somersault-squat | Dumbbell Somersault Squat | LEGS | dumbbell |
| db-squat | Dumbbell Squat | LEGS | dumbbell |
| db-sumo-squat | Dumbbell Sumo Squat | LEGS | dumbbell |
| dumbbell-front-squat | Dumbbell Front Squat | LEGS | dumbbell |
| dumbbell-pistol-squat | Dumbbell Pistol Squat | LEGS | dumbbell |
| dumbbell-split-squat | Dumbbell Split Squat | LEGS | dumbbell |
| front-squat | Front Squat | LEGS | barbell |

## OUTPUT 6 — Duplicates / aliases

### 1. Different client labels → same catalog exercise (A/B mappings)

- **Plank** (`plank`): `Forearm Plank`, `Plank`
- **Battle Ropes** (`battle-ropes`): `Battle Ropes`, `Battle Rope Waves`
- **Kettlebell Swing** (`kettlebell-swing`): `Kettlebell Swings`, `Kettlebell Swing`
- **Medicine Ball Slam** (`medicine-ball-slam`): `Medicine Ball Slams`, `Medicine Ball Throws`
- **Hanging Leg Raise** (`hanging-leg-raise`): `Hanging Leg Raises`, `Hanging Leg Raise`
- **Lying Leg Raise** (`lying-leg-raise`): `Lying Leg Raises`, `Side-Lying Leg Raise`
- **Russian Twist** (`russian-twist`): `Russian Twists`, `Russian Twist`
- **Romanian Deadlift** (`romanian-deadlift`): `Romanian deadlift (RDL)`, `Romanian Deadlift`, `Romanian Deadlifts`
- **Bent-Over Barbell Row** (`barbell-row`): `Barbell row`, `Bent-over barbell row`, `Barbell Rows`
- **Chest-Supported Dumbbell Row** (`chest-supported-db-row`): `Chest-supported dumbbell row`, `Chest-supported row machine`
- **Seated Cable Row** (`seated-cable-row`): `Close-grip cable row`, `Seated cable row`, `Band row`
- **Inverted Row** (`inverted-row`): `Inverted row (bodyweight)`, `Inverted Underhand Row`
- **Back Extension** (`back-extension`): `Back extension`, `Hyperextension`, `Stability ball back extension`
- **Assisted Pull Ups** (`assisted-pull-ups`): `Assisted pull-up machine`, `Assisted pull-up`
- **Cable Face Pull** (`face-pull`): `Face pull`, `Band face pull`
- **Cable Upright Row** (`cable-upright-row`): `High row`, `Cable Upright Row`
- **Lat Pulldown** (`lat-pulldown`): `Band pulldown`, `Lat pulldown`
- **Straight-Arm Pulldown** (`straight-arm-pulldown`): `Band straight-arm pulldown`, `Straight-arm pulldown`
- **Barbell Upright Row** (`upright-row`): `Upright row`, `Upright Row (wide grip)`
- **Chin-Ups** (`chin-ups`): `Chin-up`, `Chin-Up (Underhand Grip)`, `Chin-Ups`
- **Close-Grip Pull-Ups** (`close-grip-pull-ups`): `Close-grip pull-up`, `Close-Grip Chin-Up`
- **Pull-Up** (`pull-up`): `Pull-up`, `Pull-Ups`
- **Barbell Curl** (`barbell-curl`): `Barbell Curl`, `Standing Barbell Curl`, `Wide-Grip Barbell Curl`, `Reverse Barbell Curl`
- **EZ-Bar Curl** (`ez-bar-curl`): `EZ-Bar Curl`, `Reverse EZ-Bar Curl`
- **Preacher Curl** (`preacher-curl`): `Preacher Curl`, `Cable Preacher Curl`, `Preacher Dumbbell Curl`
- **Cable Curl** (`cable-curl`): `High Cable Curl`, `Low Cable Curl`, `Overhead Cable Curl`, `Reverse Cable Curl`, `Single-Arm Cable Curl`, `Standing Cable Curl`
- **Machine Preacher Curl** (`machine-preacher-curl`): `Biceps Curl Machine`, `Cable Curl Machine`, `Preacher Curl Machine`
- **Machine Hip Abduction** (`hip-abduction`): `Abductor Machine`, `Cable Hip Abduction`, `Band Hip Abduction`
- **Hip Adduction** (`hip-adduction`): `Adductor Machine`, `Band Hip Adduction`, `Cable Hip Adduction`
- **Nordic Hamstring Curl** (`nordic-hamstring-curl`): `Nordic Curl`, `Nordic Hamstring Curl`
- **Single Leg Calf Raise** (`single-leg-calf-raise`): `Single-Leg Calf Raise`, `Bodyweight Single-Leg Calf Raise`
- **Reverse Lunge** (`reverse-lunge`): `Cable Reverse Lunge`, `Reverse Lunge`
- **Standing Calf Raise** (`standing-calf-raise`): `Single-Leg Standing Calf Raise`, `Standing Calf Raise`, `Standing Calf Raise Machine`, `Band Calf Raise`
- **Barbell Hip Thrust** (`hip-thrust`): `Barbell Hip Thrust`, `Hip Thrust`, `Hip Thrusts`
- **Step Ups** (`step-ups`): `Step-Up`, `Peterson Step-Up`, `Box Step-Up`, `High Knee Step-Up`, `Lateral Step-Up`
- **Lying Leg Curl** (`leg-curl`): `Band Leg Curl`, `Cable Leg Curl`, `Lying Leg Curl`
- **Stability Ball Leg Curl** (`ball-leg-curl`): `Sliding Leg Curl`, `Stability Ball Leg Curl`
- **Bulgarian Split Squat** (`bulgarian-split-squat`): `Bulgarian Split Squat`, `Bulgarian Split Squats`
- **Walking Lunge** (`walking-lunge`): `Walking Lunge`, `Walking Lunges`
- **Hack Squat** (`hack-squat`): `Hack Squat Machine`, `Hack Squat`
- **Seated Calf Raise** (`seated-calf-raise`): `Seated Calf Raise Machine`, `Dumbbell Seated Calf Raise`, `Machine Seated Calf Raise`, `Seated Calf Raise`
- **Box Jump** (`box-jump`): `Box Jump`, `Box Jumps`
- **Jump Squat** (`jump-squat`): `Jump Squat`, `Squat Jumps`
- **Barbell Back Squat** (`squat`): `Back Squat`, `Back Squats`
- **Front Squat** (`front-squat`): `Front Squat`, `Front Squats`
- **Dumbbell Shoulder Press** (`dumbbell-shoulder-press`): `Dumbbell Shoulder Press`, `Band Shoulder Press`
- **One Arm Kettlebell Shoulder Press** (`one-arm-kettlebell-shoulder-press`): `Kettlebell Overhead Press`, `Kettlebell Shoulder Press`, `Single-Arm Kettlebell Press`
- **Machine Shoulder Press** (`machine-shoulder-press`): `Machine Shoulder Press`, `Shoulder Press Machine`
- **One-Arm Landmine Press** (`one-arm-landmine-press`): `Single-Arm Landmine Press`, `Single-Arm Cable Press`
- **Smith Machine Shoulder Press** (`smith-machine-shoulder-press`): `Smith Machine Shoulder Press`, `Smith Machine Press`
- **Barbell Overhead Press** (`ohp`): `Standing Barbell Press`, `Z Press`, `Overhead Press`
- **Bear Crawl** (`bear-crawl`): `Bear Crawl`, `Bear Crawls`
- **Pike Push Ups** (`pike-push-ups`): `Decline Pike Push-Up`, `Pike Push-Up`
- **Handstand Push Ups** (`handstand-push-ups`): `Handstand Push-Up`, `Wall Handstand Push-Up`, `Handstand Push-Up (advanced)`
- **Dumbbell Lateral Raise** (`lateral-raise`): `Band Lateral Raise`, `Dumbbell Lateral Raise`, `Resistance Band Lateral Raise`
- **Cable External Rotation** (`cable-external-rotation`): `Band External Rotation`, `Cable External Rotation`, `Dumbbell External Rotation`
- **Cable Lateral Raise** (`cable-lateral-raise`): `Behind-the-Back Cable Lateral Raise`, `Cable Lateral Raise`, `Lean-Away Cable Lateral Raise`
- **Cable Tricep Kickback** (`cable-tricep-kickback`): `Cable Kickback`, `Cable Triceps Kickback`, `Band Kickback`
- **Single Arm Tricep Pushdown** (`single-arm-tricep-pushdown`): `Cross-Body Cable Extension`, `Single-Arm Cable Extension`, `Single-Arm Pushdown`
- **Cable Tricep Pushdown** (`tricep-pushdown`): `Rope Pushdown`, `Dual Cable Pushdown`, `Resistance Band Pushdown`, `Reverse-Grip Pushdown`, `Rope Triceps Pushdown`, `Straight-Bar Pushdown`, `Band Pushdown`
- **Close-Grip Bench Press** (`close-grip-bench-press`): `Close-Grip Bench Press`, `Smith Machine Close-Grip Bench Press`
- **Close Grip Push Ups** (`close-grip-push-ups`): `Close-Grip Push-Up`, `Band Close-Grip Press`
- **Machine Assisted Dips** (`assisted-dips`): `Machine Dip`, `Assisted Dip Machine`
- **Dumbbell Tricep Kickback** (`tricep-kickback`): `Dumbbell Triceps Kickback`, `Single-Arm Kickback`
- **Machine Triceps Extension** (`machine-triceps-extension`): `Cable Triceps Machine`, `Triceps Extension Machine`
- **Single-Arm Dumbbell Overhead Tricep Extension** (`single-arm-dumbbell-overhead-tricep-extension`): `Single-Arm Cable Overhead Extension`, `Single-Arm Overhead Dumbbell Extension`
- **Skull Crusher** (`skull-crusher`): `Barbell Skull Crusher`, `EZ-Bar Skull Crusher`

### 2. Client variants kept separate (distinct labels by design)

Examples where similar naming does **not** imply same exercise:

- Barbell row ≠ Bent-over barbell row
- Pull-up ≠ Chin-Up (Underhand Grip)
- Upright row ≠ Upright Row (wide grip)
- Romanian deadlift (RDL) ≠ Romanian Deadlift
- Hip Thrust ≠ Barbell Hip Thrust
- Glute Bridge ≠ Single-Leg Glute Bridge
- Skull Crusher ≠ Incline Skull Crusher
- Lat pulldown ≠ Wide-grip lat pulldown

## OUTPUT 7 — Category coverage

| Category | Unique | A | B | C | D | Covered (A+B) |
|----------|-------:|--:|--:|--:|--:|--------------:|
| Back | 92 | 36 | 22 | 29 | 5 | 58 |
| Shoulders | 73 | 15 | 30 | 28 | 0 | 45 |
| Biceps | 55 | 11 | 23 | 21 | 0 | 34 |
| Triceps | 67 | 12 | 32 | 23 | 0 | 44 |
| Legs | 110 | 39 | 35 | 35 | 1 | 74 |
| Abs/Core | 50 | 23 | 7 | 19 | 1 | 30 |
| Sports/Fitness | 71 | 11 | 13 | 42 | 5 | 24 |
| **Total** | **518** | **147** | **162** | **197** | **12** | **309** |

Category unique sum: 518 (expected 518)

## OUTPUT 8 — Action summary

### Already covered

309 exercises (147 exact + 162 name variation) have a defensible catalog mapping.

### Requires human decision

12 exercises need manual catalogId choice (generic labels or multiple valid candidates).

### Genuine catalog gaps

197 exercises have no suitable RepDB free catalog match under the matching rules.

### Potential additions

Catalog additions to consider (C only):

- Bear Crawl Hold (Abs/Core)
- Stability Ball Rollout (Abs/Core)
- Stomach Vacuum (Abs/Core)
- Renegade Rows (Abs/Core)
- TRX Knee Tucks (Abs/Core)
- TRX Pike (Abs/Core)
- Garhammer Raises (Abs/Core)
- Cable Woodchoppers (Abs/Core)
- Cross-Body Mountain Climbers (Abs/Core)
- Heel Touches (Abs/Core)
- Landmine Twists (Abs/Core)
- Oblique Crunches (Abs/Core)
- Seated Twists (Abs/Core)
- Side Plank Hip Dips (Abs/Core)
- Ab Mat Sit-Ups (Abs/Core)
- Machine Crunches (Abs/Core)
- Stability Ball Crunches (Abs/Core)
- Toe Touch Crunches (Abs/Core)
- Weighted Crunches (Abs/Core)
- Australian pull-up (Back)
- Commando pull-up (Back)
- Front lever progression (Back)
- Cable pullover (Back)
- High cable row (Back)
- Low cable row (Back)
- Single-arm cable row (Back)
- Snatch-grip deadlift (Back)
- Trap bar deadlift (Back)
- Landmine row (Back)
- Meadows row (Back)
- One-arm cable row (Back)
- Seal row (Back)
- Yates row (Back)
- Renegade row (Back)
- Reverse hyperextension (Back)
- High row machine (Back)
- Iso-lateral row machine (Back)
- Seated row machine (Back)
- Bent-over reverse fly (Back)
- Cable reverse fly (Back)
- Reverse pec deck (Back)
- T-raise (Back)
- W-raise (Back)
- Y-raise (Back)
- Band reverse fly (Back)
- Cable shrug (Back)
- Trap bar shrug (Back)
- Rope pulldown (Back)
- Scott Curl (Biceps)
- Ring Chin-Up (Biceps)
- Towel Chin-Up (Biceps)
- Bayesian Cable Curl (Biceps)
- Alternating Dumbbell Curl (Biceps)
- Bayesian Dumbbell Curl (Biceps)
- Offset-Grip Dumbbell Curl (Biceps)
- Standing Dumbbell Curl (Biceps)
- 21s Curl (Biceps)
- Isometric Curl Hold (Biceps)
- One-and-a-Half Rep Curl (Biceps)
- Partial-Range Curl (Biceps)
- Tempo Curl (slow eccentric) (Biceps)
- Bottoms-Up Curl (Biceps)
- Assisted Chin-Up Machine (underhand grip) (Biceps)
- Band Curl (Biceps)
- Band Hammer Curl (Biceps)
- High Anchor Band Curl (Biceps)
- Reverse Band Curl (Biceps)
- Single-Arm Band Curl (Biceps)
- Reverse Dumbbell Curl (Biceps)
- Monster Walk (Legs)
- Standing Band Hip Abduction (Legs)
- Copenhagen Plank (Legs)
- Shrimp Squat (Legs)
- Cable Squat (Legs)
- Leg Press Calf Raise (Legs)
- Donkey Kick (Legs)
- Frog Pump (Legs)
- Glute-Ham Raise (GHR) (Legs)
- Standing Leg Curl (Legs)
- Curtsy Lunge (Legs)
- Deficit Lunge (Legs)
- Forward Lunge (Legs)
- Landmine Lunge (Legs)
- Lateral Lunge (Legs)
- Step-Back Lunge (Legs)
- Broad Jump (Legs)
- Depth Jump (Legs)
- Lateral Bounds (Legs)
- Skater Jump (Legs)
- Split Squat Jump (Legs)
- Tuck Jump (Legs)
- Sissy Squat (Legs)
- Spanish Squat (Legs)
- Band Lunge (Legs)
- Band Monster Walk (Legs)
- Stair Calf Raise (Legs)
- Safety Bar Squat (Legs)
- Zercher Squat (Legs)
- Barbell Step-Up (Legs)
- Dumbbell Step-Up (Legs)
- Heel Walk (Legs)
- Resistance Band Dorsiflexion (Legs)
- Tibialis Raise (Legs)
- Toe Raise (Legs)
- Bradford Press (Shoulders)
- Crab Walk (Shoulders)
- Hindu Push-Up (Shoulders)
- Planche Lean (Shoulders)
- Wall Walk (Shoulders)
- Cable Shoulder Press (Shoulders)
- Alternating Front Raise (Shoulders)
- Incline Front Raise (Shoulders)
- Kettlebell Front Raise (Shoulders)
- Landmine Front Raise (Shoulders)
- Plate Front Raise (Shoulders)
- Rope Front Raise (Shoulders)
- Kettlebell High Pull (Shoulders)
- Lateral Raise Machine (Shoulders)
- Ring Reverse Fly (Shoulders)
- TRX Reverse Fly (Shoulders)
- Band Front Raise (Shoulders)
- Cuban Press (Shoulders)
- Internal Rotation with Band (Shoulders)
- Internal Rotation with Cable (Shoulders)
- Prone T Raise (Shoulders)
- Prone W Raise (Shoulders)
- Prone Y Raise (Shoulders)
- Scaption Raise (Shoulders)
- Side-Lying External Rotation (Shoulders)
- Incline Lateral Raise (Shoulders)
- One-Arm Lateral Raise (Shoulders)
- Standing Lateral Raise (Shoulders)
- Cycling (Sports/Fitness)
- Interval Running (Sports/Fitness)
- Long-Distance Running (Sports/Fitness)
- Rowing (Sports/Fitness)
- Swimming (Sports/Fitness)
- Bounding (Sports/Fitness)
- Broad Jumps (Sports/Fitness)
- Depth Jumps (Sports/Fitness)
- Hill Sprints (Sports/Fitness)
- Plyometric Push-Ups (Sports/Fitness)
- Power Skips (Sports/Fitness)
- Sled Pull (Sports/Fitness)
- Sled Push (Sports/Fitness)
- Tuck Jumps (Sports/Fitness)
- Arm Circles (Sports/Fitness)
- Deep Squat Hold (Sports/Fitness)
- Dynamic Stretching (Sports/Fitness)
- Hip Mobility Drills (Sports/Fitness)
- Leg Swings (Sports/Fitness)
- Shoulder Mobility Drills (Sports/Fitness)
- World's Greatest Stretch (Sports/Fitness)
- 5-10-5 Pro Agility Drill (Sports/Fitness)
- Acceleration Sprints (Sports/Fitness)
- Change of Direction Drills (Sports/Fitness)
- Cone Drills (Sports/Fitness)
- Deceleration Drills (Sports/Fitness)
- Ladder Drills (Sports/Fitness)
- Reaction Sprints (Sports/Fitness)
- Shuttle Runs (Sports/Fitness)
- Sprint Intervals (Sports/Fitness)
- Zig-Zag Runs (Sports/Fitness)
- Agility Ladder Training (Sports/Fitness)
- Balance Training (Sports/Fitness)
- Coordination Drills (Sports/Fitness)
- Defensive Slides (Sports/Fitness)
- Footwork Drills (Sports/Fitness)
- Jump Training (Sports/Fitness)
- Lateral Shuffle (Sports/Fitness)
- Plyometric Training (Sports/Fitness)
- Reaction Ball Drills (Sports/Fitness)
- Sprint Starts (Sports/Fitness)
- Snatches (Sports/Fitness)
- Tiger Bend Push-Up (Triceps)
- Cable Overhead Extension (Triceps)
- JM Press (Triceps)
- Parallel Bar Dip (Triceps)
- Kettlebell Tate Press (Triceps)
- Resistance Band Kickback (Triceps)
- Cable Overhead Triceps Extension (Triceps)
- Overhead Dumbbell Triceps Extension (Triceps)
- Resistance Band Overhead Extension (Triceps)
- Rope Overhead Triceps Extension (Triceps)
- Two-Arm Overhead Dumbbell Extension (Triceps)
- Band Overhead Extension (Triceps)
- Cable Skull Crusher (Triceps)
- Decline Skull Crusher (Triceps)
- Floor Skull Crusher (Triceps)
- Incline Skull Crusher (Triceps)
- Cross-Body Triceps Extension (Triceps)
- Isometric Triceps Hold (Triceps)
- One-and-a-Half Rep Extension (Triceps)
- PJR Pullover (Triceps)
- Rolling Dumbbell Extension (Triceps)
- Tate Press (Triceps)
- Tempo Triceps Extension (Triceps)
