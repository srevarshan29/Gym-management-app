# Proposed catalog exercises — media/source audit (read-only)

Sources: `client-catalog-proposed-additions.json` (88), `data/catalog/exercises.json` (601), `data/catalog/images/` (601 dirs), Supabase path convention in `src/lib/exercises/media-paths.ts`.

**No media was downloaded, copied, or modified.** Production catalog unchanged.

RepDB license applies only to **existing** catalog entries (provider block in `exercises.json`). Proposed exercises are **not** RepDB entries unless catalogId matches an existing exercise (none do).

---

## Per-exercise classification

### Cable Woodchop (`cable-woodchop`)

- **Proposed name:** Cable Woodchop
- **catalogId:** cable-woodchop
- **Result:** B
- **Existing media path/URL:** data/catalog/images/cable-crunch/primary.webp; data/catalog/images/cable-crunch/secondary.webp; data/catalog/images/cable-crunch/thumbnail.webp
- **Analog catalogId (not interchangeable):** cable-crunch
- **Supabase object pattern (if synced):** catalog/cable-crunch/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`cable-crunch`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Garhammer Raise (`garhammer-raise`)

- **Proposed name:** Garhammer Raise
- **catalogId:** garhammer-raise
- **Result:** B
- **Existing media path/URL:** data/catalog/images/hanging-leg-raise/primary.webp; data/catalog/images/hanging-leg-raise/secondary.webp; data/catalog/images/hanging-leg-raise/thumbnail.webp
- **Analog catalogId (not interchangeable):** hanging-leg-raise
- **Supabase object pattern (if synced):** catalog/hanging-leg-raise/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`hanging-leg-raise`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Heel Touch (`heel-touch`)

- **Proposed name:** Heel Touch
- **catalogId:** heel-touch
- **Result:** B
- **Existing media path/URL:** data/catalog/images/cross-body-crunch/primary.webp; data/catalog/images/cross-body-crunch/secondary.webp; data/catalog/images/cross-body-crunch/thumbnail.webp
- **Analog catalogId (not interchangeable):** cross-body-crunch
- **Supabase object pattern (if synced):** catalog/cross-body-crunch/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`cross-body-crunch`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Landmine Rotation (`landmine-rotation`)

- **Proposed name:** Landmine Rotation
- **catalogId:** landmine-rotation
- **Result:** B
- **Existing media path/URL:** data/catalog/images/landmine-press/primary.webp; data/catalog/images/landmine-press/secondary.webp; data/catalog/images/landmine-press/thumbnail.webp
- **Analog catalogId (not interchangeable):** landmine-press
- **Supabase object pattern (if synced):** catalog/landmine-press/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`landmine-press`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Renegade Row (`renegade-row`)

- **Proposed name:** Renegade Row
- **catalogId:** renegade-row
- **Result:** B
- **Existing media path/URL:** data/catalog/images/single-arm-db-row/primary.webp; data/catalog/images/single-arm-db-row/secondary.webp; data/catalog/images/single-arm-db-row/thumbnail.webp
- **Analog catalogId (not interchangeable):** single-arm-db-row
- **Supabase object pattern (if synced):** catalog/single-arm-db-row/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`single-arm-db-row`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Side Plank Hip Dip (`side-plank-hip-dip`)

- **Proposed name:** Side Plank Hip Dip
- **catalogId:** side-plank-hip-dip
- **Result:** B
- **Existing media path/URL:** data/catalog/images/side-plank/primary.webp; data/catalog/images/side-plank/thumbnail.webp
- **Analog catalogId (not interchangeable):** side-plank
- **Supabase object pattern (if synced):** catalog/side-plank/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`side-plank`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Stability Ball Crunch (`stability-ball-crunch`)

- **Proposed name:** Stability Ball Crunch
- **catalogId:** stability-ball-crunch
- **Result:** B
- **Existing media path/URL:** data/catalog/images/crunches/primary.webp; data/catalog/images/crunches/secondary.webp; data/catalog/images/crunches/thumbnail.webp
- **Analog catalogId (not interchangeable):** crunches
- **Supabase object pattern (if synced):** catalog/crunches/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`crunches`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Stability Ball Rollout (`stability-ball-rollout`)

- **Proposed name:** Stability Ball Rollout
- **catalogId:** stability-ball-rollout
- **Result:** B
- **Existing media path/URL:** data/catalog/images/ab-wheel-rollout/primary.webp; data/catalog/images/ab-wheel-rollout/secondary.webp; data/catalog/images/ab-wheel-rollout/thumbnail.webp
- **Analog catalogId (not interchangeable):** ab-wheel-rollout
- **Supabase object pattern (if synced):** catalog/ab-wheel-rollout/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`ab-wheel-rollout`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Stomach Vacuum (`stomach-vacuum`)

- **Proposed name:** Stomach Vacuum
- **catalogId:** stomach-vacuum
- **Result:** D
- **Existing media path/URL:** —
- **Source/provider:** —
- **License information:** Not documented in repo for this proposed exercise (not a RepDB catalog row).
- **Explanation:** No RepDB entry or defensible similar catalog media; requires external demonstration source and license verification before import.

### Toe Touch Crunch (`toe-touch-crunch`)

- **Proposed name:** Toe Touch Crunch
- **catalogId:** toe-touch-crunch
- **Result:** B
- **Existing media path/URL:** data/catalog/images/crunches/primary.webp; data/catalog/images/crunches/secondary.webp; data/catalog/images/crunches/thumbnail.webp
- **Analog catalogId (not interchangeable):** crunches
- **Supabase object pattern (if synced):** catalog/crunches/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`crunches`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### TRX Knee Tuck (`trx-knee-tuck`)

- **Proposed name:** TRX Knee Tuck
- **catalogId:** trx-knee-tuck
- **Result:** B
- **Existing media path/URL:** data/catalog/images/stability-ball-knee-tuck/primary.webp; data/catalog/images/stability-ball-knee-tuck/secondary.webp; data/catalog/images/stability-ball-knee-tuck/thumbnail.webp
- **Analog catalogId (not interchangeable):** stability-ball-knee-tuck
- **Supabase object pattern (if synced):** catalog/stability-ball-knee-tuck/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`stability-ball-knee-tuck`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### TRX Pike (`trx-pike`)

- **Proposed name:** TRX Pike
- **catalogId:** trx-pike
- **Result:** B
- **Existing media path/URL:** data/catalog/images/ball-pike/primary.webp; data/catalog/images/ball-pike/secondary.webp; data/catalog/images/ball-pike/thumbnail.webp
- **Analog catalogId (not interchangeable):** ball-pike
- **Supabase object pattern (if synced):** catalog/ball-pike/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`ball-pike`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Cable Pullover (`cable-pullover`)

- **Proposed name:** Cable Pullover
- **catalogId:** cable-pullover
- **Result:** B
- **Existing media path/URL:** data/catalog/images/db-pullover/primary.webp; data/catalog/images/db-pullover/secondary.webp; data/catalog/images/db-pullover/thumbnail.webp
- **Analog catalogId (not interchangeable):** db-pullover
- **Supabase object pattern (if synced):** catalog/db-pullover/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`db-pullover`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Cable Shrug (`cable-shrug`)

- **Proposed name:** Cable Shrug
- **catalogId:** cable-shrug
- **Result:** B
- **Existing media path/URL:** data/catalog/images/shrug/primary.webp; data/catalog/images/shrug/secondary.webp; data/catalog/images/shrug/thumbnail.webp
- **Analog catalogId (not interchangeable):** shrug
- **Supabase object pattern (if synced):** catalog/shrug/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`shrug`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Commando Pull-Up (`commando-pull-up`)

- **Proposed name:** Commando Pull-Up
- **catalogId:** commando-pull-up
- **Result:** B
- **Existing media path/URL:** data/catalog/images/archer-pull-ups/primary.webp; data/catalog/images/archer-pull-ups/secondary.webp; data/catalog/images/archer-pull-ups/thumbnail.webp
- **Analog catalogId (not interchangeable):** archer-pull-ups
- **Supabase object pattern (if synced):** catalog/archer-pull-ups/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`archer-pull-ups`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### High Cable Row (`high-cable-row`)

- **Proposed name:** High Cable Row
- **catalogId:** high-cable-row
- **Result:** B
- **Existing media path/URL:** data/catalog/images/seated-cable-row/primary.webp; data/catalog/images/seated-cable-row/secondary.webp; data/catalog/images/seated-cable-row/thumbnail.webp
- **Analog catalogId (not interchangeable):** seated-cable-row
- **Supabase object pattern (if synced):** catalog/seated-cable-row/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`seated-cable-row`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### High Row Machine (`high-row-machine`)

- **Proposed name:** High Row Machine
- **catalogId:** high-row-machine
- **Result:** B
- **Existing media path/URL:** data/catalog/images/chest-supported-db-row/primary.webp; data/catalog/images/chest-supported-db-row/secondary.webp; data/catalog/images/chest-supported-db-row/thumbnail.webp
- **Analog catalogId (not interchangeable):** chest-supported-db-row
- **Supabase object pattern (if synced):** catalog/chest-supported-db-row/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`chest-supported-db-row`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Iso-Lateral Row Machine (`iso-lateral-row-machine`)

- **Proposed name:** Iso-Lateral Row Machine
- **catalogId:** iso-lateral-row-machine
- **Result:** B
- **Existing media path/URL:** data/catalog/images/single-arm-db-row/primary.webp; data/catalog/images/single-arm-db-row/secondary.webp; data/catalog/images/single-arm-db-row/thumbnail.webp
- **Analog catalogId (not interchangeable):** single-arm-db-row
- **Supabase object pattern (if synced):** catalog/single-arm-db-row/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`single-arm-db-row`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Landmine Row (`landmine-row`)

- **Proposed name:** Landmine Row
- **catalogId:** landmine-row
- **Result:** B
- **Existing media path/URL:** data/catalog/images/one-arm-landmine-press/primary.webp; data/catalog/images/one-arm-landmine-press/secondary.webp; data/catalog/images/one-arm-landmine-press/thumbnail.webp
- **Analog catalogId (not interchangeable):** one-arm-landmine-press
- **Supabase object pattern (if synced):** catalog/one-arm-landmine-press/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`one-arm-landmine-press`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Meadows Row (`meadows-row`)

- **Proposed name:** Meadows Row
- **catalogId:** meadows-row
- **Result:** B
- **Existing media path/URL:** data/catalog/images/t-bar-row/primary.webp; data/catalog/images/t-bar-row/secondary.webp; data/catalog/images/t-bar-row/thumbnail.webp
- **Analog catalogId (not interchangeable):** t-bar-row
- **Supabase object pattern (if synced):** catalog/t-bar-row/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`t-bar-row`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Single-Arm Cable Row (`single-arm-cable-row`)

- **Proposed name:** Single-Arm Cable Row
- **catalogId:** single-arm-cable-row
- **Result:** B
- **Existing media path/URL:** data/catalog/images/kneeling-cable-row/primary.webp; data/catalog/images/kneeling-cable-row/secondary.webp; data/catalog/images/kneeling-cable-row/thumbnail.webp
- **Analog catalogId (not interchangeable):** kneeling-cable-row
- **Supabase object pattern (if synced):** catalog/kneeling-cable-row/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`kneeling-cable-row`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Reverse Hyperextension (`reverse-hyperextension`)

- **Proposed name:** Reverse Hyperextension
- **catalogId:** reverse-hyperextension
- **Result:** B
- **Existing media path/URL:** data/catalog/images/back-extension/primary.webp; data/catalog/images/back-extension/secondary.webp; data/catalog/images/back-extension/thumbnail.webp
- **Analog catalogId (not interchangeable):** back-extension
- **Supabase object pattern (if synced):** catalog/back-extension/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`back-extension`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Seal Row (`seal-row`)

- **Proposed name:** Seal Row
- **catalogId:** seal-row
- **Result:** B
- **Existing media path/URL:** data/catalog/images/chest-supported-db-row/primary.webp; data/catalog/images/chest-supported-db-row/secondary.webp; data/catalog/images/chest-supported-db-row/thumbnail.webp
- **Analog catalogId (not interchangeable):** chest-supported-db-row
- **Supabase object pattern (if synced):** catalog/chest-supported-db-row/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`chest-supported-db-row`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Snatch-Grip Deadlift (`snatch-grip-deadlift`)

- **Proposed name:** Snatch-Grip Deadlift
- **catalogId:** snatch-grip-deadlift
- **Result:** B
- **Existing media path/URL:** data/catalog/images/deadlift/primary.webp; data/catalog/images/deadlift/secondary.webp; data/catalog/images/deadlift/thumbnail.webp
- **Analog catalogId (not interchangeable):** deadlift
- **Supabase object pattern (if synced):** catalog/deadlift/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`deadlift`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### T Raise (`t-raise`)

- **Proposed name:** T Raise
- **catalogId:** t-raise
- **Result:** B
- **Existing media path/URL:** data/catalog/images/dumbbell-reverse-fly/primary.webp; data/catalog/images/dumbbell-reverse-fly/secondary.webp; data/catalog/images/dumbbell-reverse-fly/thumbnail.webp
- **Analog catalogId (not interchangeable):** dumbbell-reverse-fly
- **Supabase object pattern (if synced):** catalog/dumbbell-reverse-fly/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`dumbbell-reverse-fly`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Trap Bar Shrug (`trap-bar-shrug`)

- **Proposed name:** Trap Bar Shrug
- **catalogId:** trap-bar-shrug
- **Result:** B
- **Existing media path/URL:** data/catalog/images/shrug/primary.webp; data/catalog/images/shrug/secondary.webp; data/catalog/images/shrug/thumbnail.webp
- **Analog catalogId (not interchangeable):** shrug
- **Supabase object pattern (if synced):** catalog/shrug/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`shrug`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### W Raise (`w-raise`)

- **Proposed name:** W Raise
- **catalogId:** w-raise
- **Result:** B
- **Existing media path/URL:** data/catalog/images/dumbbell-reverse-fly/primary.webp; data/catalog/images/dumbbell-reverse-fly/secondary.webp; data/catalog/images/dumbbell-reverse-fly/thumbnail.webp
- **Analog catalogId (not interchangeable):** dumbbell-reverse-fly
- **Supabase object pattern (if synced):** catalog/dumbbell-reverse-fly/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`dumbbell-reverse-fly`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Y Raise (`y-raise`)

- **Proposed name:** Y Raise
- **catalogId:** y-raise
- **Result:** B
- **Existing media path/URL:** data/catalog/images/dumbbell-reverse-fly/primary.webp; data/catalog/images/dumbbell-reverse-fly/secondary.webp; data/catalog/images/dumbbell-reverse-fly/thumbnail.webp
- **Analog catalogId (not interchangeable):** dumbbell-reverse-fly
- **Supabase object pattern (if synced):** catalog/dumbbell-reverse-fly/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`dumbbell-reverse-fly`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Yates Row (`yates-row`)

- **Proposed name:** Yates Row
- **catalogId:** yates-row
- **Result:** B
- **Existing media path/URL:** data/catalog/images/barbell-row/primary.webp; data/catalog/images/barbell-row/secondary.webp; data/catalog/images/barbell-row/thumbnail.webp
- **Analog catalogId (not interchangeable):** barbell-row
- **Supabase object pattern (if synced):** catalog/barbell-row/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`barbell-row`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Alternating Dumbbell Curl (`alternating-dumbbell-curl`)

- **Proposed name:** Alternating Dumbbell Curl
- **catalogId:** alternating-dumbbell-curl
- **Result:** B
- **Existing media path/URL:** data/catalog/images/seated-dumbbell-curl/primary.webp; data/catalog/images/seated-dumbbell-curl/secondary.webp; data/catalog/images/seated-dumbbell-curl/thumbnail.webp
- **Analog catalogId (not interchangeable):** seated-dumbbell-curl
- **Supabase object pattern (if synced):** catalog/seated-dumbbell-curl/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`seated-dumbbell-curl`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Band Biceps Curl (`band-biceps-curl`)

- **Proposed name:** Band Biceps Curl
- **catalogId:** band-biceps-curl
- **Result:** D
- **Existing media path/URL:** —
- **Source/provider:** —
- **License information:** Not documented in repo for this proposed exercise (not a RepDB catalog row).
- **Explanation:** No RepDB entry or defensible similar catalog media; requires external demonstration source and license verification before import.

### Band Hammer Curl (`band-hammer-curl`)

- **Proposed name:** Band Hammer Curl
- **catalogId:** band-hammer-curl
- **Result:** B
- **Existing media path/URL:** data/catalog/images/hammer-curl/primary.webp; data/catalog/images/hammer-curl/secondary.webp; data/catalog/images/hammer-curl/thumbnail.webp
- **Analog catalogId (not interchangeable):** hammer-curl
- **Supabase object pattern (if synced):** catalog/hammer-curl/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`hammer-curl`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Bayesian Cable Curl (`bayesian-cable-curl`)

- **Proposed name:** Bayesian Cable Curl
- **catalogId:** bayesian-cable-curl
- **Result:** D
- **Existing media path/URL:** —
- **Source/provider:** —
- **License information:** Not documented in repo for this proposed exercise (not a RepDB catalog row).
- **Explanation:** No RepDB entry or defensible similar catalog media; requires external demonstration source and license verification before import.

### Bayesian Dumbbell Curl (`bayesian-dumbbell-curl`)

- **Proposed name:** Bayesian Dumbbell Curl
- **catalogId:** bayesian-dumbbell-curl
- **Result:** D
- **Existing media path/URL:** —
- **Source/provider:** —
- **License information:** Not documented in repo for this proposed exercise (not a RepDB catalog row).
- **Explanation:** No RepDB entry or defensible similar catalog media; requires external demonstration source and license verification before import.

### Bottoms-Up Kettlebell Curl (`bottoms-up-kettlebell-curl`)

- **Proposed name:** Bottoms-Up Kettlebell Curl
- **catalogId:** bottoms-up-kettlebell-curl
- **Result:** B
- **Existing media path/URL:** data/catalog/images/one-arm-kettlebell-bottoms-up-press/primary.webp; data/catalog/images/one-arm-kettlebell-bottoms-up-press/secondary.webp; data/catalog/images/one-arm-kettlebell-bottoms-up-press/thumbnail.webp
- **Analog catalogId (not interchangeable):** one-arm-kettlebell-bottoms-up-press
- **Supabase object pattern (if synced):** catalog/one-arm-kettlebell-bottoms-up-press/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`one-arm-kettlebell-bottoms-up-press`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Offset-Grip Dumbbell Curl (`offset-grip-dumbbell-curl`)

- **Proposed name:** Offset-Grip Dumbbell Curl
- **catalogId:** offset-grip-dumbbell-curl
- **Result:** B
- **Existing media path/URL:** data/catalog/images/hammer-curl/primary.webp; data/catalog/images/hammer-curl/secondary.webp; data/catalog/images/hammer-curl/thumbnail.webp
- **Analog catalogId (not interchangeable):** hammer-curl
- **Supabase object pattern (if synced):** catalog/hammer-curl/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`hammer-curl`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Standing Dumbbell Curl (`standing-dumbbell-curl`)

- **Proposed name:** Standing Dumbbell Curl
- **catalogId:** standing-dumbbell-curl
- **Result:** B
- **Existing media path/URL:** data/catalog/images/seated-dumbbell-curl/primary.webp; data/catalog/images/seated-dumbbell-curl/secondary.webp; data/catalog/images/seated-dumbbell-curl/thumbnail.webp
- **Analog catalogId (not interchangeable):** seated-dumbbell-curl
- **Supabase object pattern (if synced):** catalog/seated-dumbbell-curl/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`seated-dumbbell-curl`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Barbell Step-Up (`barbell-step-up`)

- **Proposed name:** Barbell Step-Up
- **catalogId:** barbell-step-up
- **Result:** B
- **Existing media path/URL:** data/catalog/images/step-ups/primary.webp; data/catalog/images/step-ups/secondary.webp; data/catalog/images/step-ups/thumbnail.webp
- **Analog catalogId (not interchangeable):** step-ups
- **Supabase object pattern (if synced):** catalog/step-ups/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`step-ups`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Broad Jump (`broad-jump`)

- **Proposed name:** Broad Jump
- **catalogId:** broad-jump
- **Result:** B
- **Existing media path/URL:** data/catalog/images/box-jump/primary.webp; data/catalog/images/box-jump/secondary.webp; data/catalog/images/box-jump/thumbnail.webp
- **Analog catalogId (not interchangeable):** box-jump
- **Supabase object pattern (if synced):** catalog/box-jump/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`box-jump`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Copenhagen Plank (`copenhagen-plank`)

- **Proposed name:** Copenhagen Plank
- **catalogId:** copenhagen-plank
- **Result:** B
- **Existing media path/URL:** data/catalog/images/side-plank/primary.webp; data/catalog/images/side-plank/thumbnail.webp
- **Analog catalogId (not interchangeable):** side-plank
- **Supabase object pattern (if synced):** catalog/side-plank/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`side-plank`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Curtsy Lunge (`curtsy-lunge`)

- **Proposed name:** Curtsy Lunge
- **catalogId:** curtsy-lunge
- **Result:** B
- **Existing media path/URL:** data/catalog/images/side-lunge/primary.webp; data/catalog/images/side-lunge/secondary.webp; data/catalog/images/side-lunge/thumbnail.webp
- **Analog catalogId (not interchangeable):** side-lunge
- **Supabase object pattern (if synced):** catalog/side-lunge/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`side-lunge`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Deficit Lunge (`deficit-lunge`)

- **Proposed name:** Deficit Lunge
- **catalogId:** deficit-lunge
- **Result:** B
- **Existing media path/URL:** data/catalog/images/deficit-deadlift/primary.webp; data/catalog/images/deficit-deadlift/secondary.webp; data/catalog/images/deficit-deadlift/thumbnail.webp
- **Analog catalogId (not interchangeable):** deficit-deadlift
- **Supabase object pattern (if synced):** catalog/deficit-deadlift/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`deficit-deadlift`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Depth Jump (`depth-jump`)

- **Proposed name:** Depth Jump
- **catalogId:** depth-jump
- **Result:** B
- **Existing media path/URL:** data/catalog/images/box-jump/primary.webp; data/catalog/images/box-jump/secondary.webp; data/catalog/images/box-jump/thumbnail.webp
- **Analog catalogId (not interchangeable):** box-jump
- **Supabase object pattern (if synced):** catalog/box-jump/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`box-jump`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Dumbbell Step-Up (`dumbbell-step-up`)

- **Proposed name:** Dumbbell Step-Up
- **catalogId:** dumbbell-step-up
- **Result:** B
- **Existing media path/URL:** data/catalog/images/step-ups/primary.webp; data/catalog/images/step-ups/secondary.webp; data/catalog/images/step-ups/thumbnail.webp
- **Analog catalogId (not interchangeable):** step-ups
- **Supabase object pattern (if synced):** catalog/step-ups/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`step-ups`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Frog Pump (`frog-pump`)

- **Proposed name:** Frog Pump
- **catalogId:** frog-pump
- **Result:** B
- **Existing media path/URL:** data/catalog/images/glute-bridge/primary.webp; data/catalog/images/glute-bridge/secondary.webp; data/catalog/images/glute-bridge/thumbnail.webp
- **Analog catalogId (not interchangeable):** glute-bridge
- **Supabase object pattern (if synced):** catalog/glute-bridge/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`glute-bridge`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Glute-Ham Raise (`glute-ham-raise`)

- **Proposed name:** Glute-Ham Raise
- **catalogId:** glute-ham-raise
- **Result:** B
- **Existing media path/URL:** data/catalog/images/nordic-hamstring-curl/primary.webp; data/catalog/images/nordic-hamstring-curl/secondary.webp; data/catalog/images/nordic-hamstring-curl/thumbnail.webp
- **Analog catalogId (not interchangeable):** nordic-hamstring-curl
- **Supabase object pattern (if synced):** catalog/nordic-hamstring-curl/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`nordic-hamstring-curl`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Landmine Lunge (`landmine-lunge`)

- **Proposed name:** Landmine Lunge
- **catalogId:** landmine-lunge
- **Result:** B
- **Existing media path/URL:** data/catalog/images/barbell-lunge/primary.webp; data/catalog/images/barbell-lunge/secondary.webp; data/catalog/images/barbell-lunge/thumbnail.webp
- **Analog catalogId (not interchangeable):** barbell-lunge
- **Supabase object pattern (if synced):** catalog/barbell-lunge/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`barbell-lunge`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Lateral Bound (`lateral-bound`)

- **Proposed name:** Lateral Bound
- **catalogId:** lateral-bound
- **Result:** B
- **Existing media path/URL:** data/catalog/images/box-jump/primary.webp; data/catalog/images/box-jump/secondary.webp; data/catalog/images/box-jump/thumbnail.webp
- **Analog catalogId (not interchangeable):** box-jump
- **Supabase object pattern (if synced):** catalog/box-jump/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`box-jump`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Safety Bar Squat (`safety-bar-squat`)

- **Proposed name:** Safety Bar Squat
- **catalogId:** safety-bar-squat
- **Result:** B
- **Existing media path/URL:** data/catalog/images/squat/primary.webp; data/catalog/images/squat/secondary.webp; data/catalog/images/squat/thumbnail.webp
- **Analog catalogId (not interchangeable):** squat
- **Supabase object pattern (if synced):** catalog/squat/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`squat`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Shrimp Squat (`shrimp-squat`)

- **Proposed name:** Shrimp Squat
- **catalogId:** shrimp-squat
- **Result:** B
- **Existing media path/URL:** data/catalog/images/pistol-squat/primary.webp; data/catalog/images/pistol-squat/secondary.webp; data/catalog/images/pistol-squat/thumbnail.webp
- **Analog catalogId (not interchangeable):** pistol-squat
- **Supabase object pattern (if synced):** catalog/pistol-squat/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`pistol-squat`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Sissy Squat (`sissy-squat`)

- **Proposed name:** Sissy Squat
- **catalogId:** sissy-squat
- **Result:** B
- **Existing media path/URL:** data/catalog/images/leg-extension/primary.webp; data/catalog/images/leg-extension/secondary.webp; data/catalog/images/leg-extension/thumbnail.webp
- **Analog catalogId (not interchangeable):** leg-extension
- **Supabase object pattern (if synced):** catalog/leg-extension/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`leg-extension`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Skater Jump (`skater-jump`)

- **Proposed name:** Skater Jump
- **catalogId:** skater-jump
- **Result:** B
- **Existing media path/URL:** data/catalog/images/jump-squat/primary.webp; data/catalog/images/jump-squat/secondary.webp; data/catalog/images/jump-squat/thumbnail.webp
- **Analog catalogId (not interchangeable):** jump-squat
- **Supabase object pattern (if synced):** catalog/jump-squat/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`jump-squat`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Spanish Squat (`spanish-squat`)

- **Proposed name:** Spanish Squat
- **catalogId:** spanish-squat
- **Result:** B
- **Existing media path/URL:** data/catalog/images/hack-squat/primary.webp; data/catalog/images/hack-squat/secondary.webp; data/catalog/images/hack-squat/thumbnail.webp
- **Analog catalogId (not interchangeable):** hack-squat
- **Supabase object pattern (if synced):** catalog/hack-squat/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`hack-squat`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Split Squat Jump (`split-squat-jump`)

- **Proposed name:** Split Squat Jump
- **catalogId:** split-squat-jump
- **Result:** B
- **Existing media path/URL:** data/catalog/images/jump-squat/primary.webp; data/catalog/images/jump-squat/secondary.webp; data/catalog/images/jump-squat/thumbnail.webp
- **Analog catalogId (not interchangeable):** jump-squat
- **Supabase object pattern (if synced):** catalog/jump-squat/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`jump-squat`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Stair Calf Raise (`stair-calf-raise`)

- **Proposed name:** Stair Calf Raise
- **catalogId:** stair-calf-raise
- **Result:** B
- **Existing media path/URL:** data/catalog/images/standing-calf-raise/primary.webp; data/catalog/images/standing-calf-raise/secondary.webp; data/catalog/images/standing-calf-raise/thumbnail.webp
- **Analog catalogId (not interchangeable):** standing-calf-raise
- **Supabase object pattern (if synced):** catalog/standing-calf-raise/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`standing-calf-raise`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Standing Leg Curl (`standing-leg-curl`)

- **Proposed name:** Standing Leg Curl
- **catalogId:** standing-leg-curl
- **Result:** B
- **Existing media path/URL:** data/catalog/images/leg-curl/primary.webp; data/catalog/images/leg-curl/secondary.webp; data/catalog/images/leg-curl/thumbnail.webp
- **Analog catalogId (not interchangeable):** leg-curl
- **Supabase object pattern (if synced):** catalog/leg-curl/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`leg-curl`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Tibialis Raise (`tibialis-raise`)

- **Proposed name:** Tibialis Raise
- **catalogId:** tibialis-raise
- **Result:** B
- **Existing media path/URL:** data/catalog/images/bodyweight-calf-raise/primary.webp; data/catalog/images/bodyweight-calf-raise/secondary.webp; data/catalog/images/bodyweight-calf-raise/thumbnail.webp
- **Analog catalogId (not interchangeable):** bodyweight-calf-raise
- **Supabase object pattern (if synced):** catalog/bodyweight-calf-raise/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`bodyweight-calf-raise`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Toe Raise (`toe-raise`)

- **Proposed name:** Toe Raise
- **catalogId:** toe-raise
- **Result:** B
- **Existing media path/URL:** data/catalog/images/bodyweight-calf-raise/primary.webp; data/catalog/images/bodyweight-calf-raise/secondary.webp; data/catalog/images/bodyweight-calf-raise/thumbnail.webp
- **Analog catalogId (not interchangeable):** bodyweight-calf-raise
- **Supabase object pattern (if synced):** catalog/bodyweight-calf-raise/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`bodyweight-calf-raise`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Tuck Jump (`tuck-jump`)

- **Proposed name:** Tuck Jump
- **catalogId:** tuck-jump
- **Result:** B
- **Existing media path/URL:** data/catalog/images/jump-squat/primary.webp; data/catalog/images/jump-squat/secondary.webp; data/catalog/images/jump-squat/thumbnail.webp
- **Analog catalogId (not interchangeable):** jump-squat
- **Supabase object pattern (if synced):** catalog/jump-squat/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`jump-squat`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Zercher Squat (`zercher-squat`)

- **Proposed name:** Zercher Squat
- **catalogId:** zercher-squat
- **Result:** B
- **Existing media path/URL:** data/catalog/images/front-squat/primary.webp; data/catalog/images/front-squat/secondary.webp; data/catalog/images/front-squat/thumbnail.webp
- **Analog catalogId (not interchangeable):** front-squat
- **Supabase object pattern (if synced):** catalog/front-squat/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`front-squat`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Band Front Raise (`band-front-raise`)

- **Proposed name:** Band Front Raise
- **catalogId:** band-front-raise
- **Result:** B
- **Existing media path/URL:** data/catalog/images/dumbbell-front-raise/primary.webp; data/catalog/images/dumbbell-front-raise/secondary.webp; data/catalog/images/dumbbell-front-raise/thumbnail.webp
- **Analog catalogId (not interchangeable):** dumbbell-front-raise
- **Supabase object pattern (if synced):** catalog/dumbbell-front-raise/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`dumbbell-front-raise`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Bradford Press (`bradford-press`)

- **Proposed name:** Bradford Press
- **catalogId:** bradford-press
- **Result:** B
- **Existing media path/URL:** data/catalog/images/ohp/primary.webp; data/catalog/images/ohp/secondary.webp; data/catalog/images/ohp/thumbnail.webp
- **Analog catalogId (not interchangeable):** ohp
- **Supabase object pattern (if synced):** catalog/ohp/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`ohp`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Cable Shoulder Press (`cable-shoulder-press`)

- **Proposed name:** Cable Shoulder Press
- **catalogId:** cable-shoulder-press
- **Result:** B
- **Existing media path/URL:** data/catalog/images/dumbbell-shoulder-press/primary.webp; data/catalog/images/dumbbell-shoulder-press/secondary.webp; data/catalog/images/dumbbell-shoulder-press/thumbnail.webp
- **Analog catalogId (not interchangeable):** dumbbell-shoulder-press
- **Supabase object pattern (if synced):** catalog/dumbbell-shoulder-press/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`dumbbell-shoulder-press`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Cuban Press (`cuban-press`)

- **Proposed name:** Cuban Press
- **catalogId:** cuban-press
- **Result:** B
- **Existing media path/URL:** data/catalog/images/cable-external-rotation/primary.webp; data/catalog/images/cable-external-rotation/secondary.webp; data/catalog/images/cable-external-rotation/thumbnail.webp
- **Analog catalogId (not interchangeable):** cable-external-rotation
- **Supabase object pattern (if synced):** catalog/cable-external-rotation/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`cable-external-rotation`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Hindu Push-Up (`hindu-push-up`)

- **Proposed name:** Hindu Push-Up
- **catalogId:** hindu-push-up
- **Result:** B
- **Existing media path/URL:** data/catalog/images/pike-push-ups/primary.webp; data/catalog/images/pike-push-ups/secondary.webp; data/catalog/images/pike-push-ups/thumbnail.webp
- **Analog catalogId (not interchangeable):** pike-push-ups
- **Supabase object pattern (if synced):** catalog/pike-push-ups/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`pike-push-ups`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Incline Front Raise (`incline-front-raise`)

- **Proposed name:** Incline Front Raise
- **catalogId:** incline-front-raise
- **Result:** B
- **Existing media path/URL:** data/catalog/images/dumbbell-front-raise/primary.webp; data/catalog/images/dumbbell-front-raise/secondary.webp; data/catalog/images/dumbbell-front-raise/thumbnail.webp
- **Analog catalogId (not interchangeable):** dumbbell-front-raise
- **Supabase object pattern (if synced):** catalog/dumbbell-front-raise/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`dumbbell-front-raise`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Incline Lateral Raise (`incline-lateral-raise`)

- **Proposed name:** Incline Lateral Raise
- **catalogId:** incline-lateral-raise
- **Result:** B
- **Existing media path/URL:** data/catalog/images/lateral-raise/primary.webp; data/catalog/images/lateral-raise/secondary.webp; data/catalog/images/lateral-raise/thumbnail.webp
- **Analog catalogId (not interchangeable):** lateral-raise
- **Supabase object pattern (if synced):** catalog/lateral-raise/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`lateral-raise`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Band Internal Rotation (`band-internal-rotation`)

- **Proposed name:** Band Internal Rotation
- **catalogId:** band-internal-rotation
- **Result:** D
- **Existing media path/URL:** —
- **Source/provider:** —
- **License information:** Not documented in repo for this proposed exercise (not a RepDB catalog row).
- **Explanation:** No RepDB entry or defensible similar catalog media; requires external demonstration source and license verification before import.

### Cable Internal Rotation (`cable-internal-rotation`)

- **Proposed name:** Cable Internal Rotation
- **catalogId:** cable-internal-rotation
- **Result:** B
- **Existing media path/URL:** data/catalog/images/cable-external-rotation/primary.webp; data/catalog/images/cable-external-rotation/secondary.webp; data/catalog/images/cable-external-rotation/thumbnail.webp
- **Analog catalogId (not interchangeable):** cable-external-rotation
- **Supabase object pattern (if synced):** catalog/cable-external-rotation/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`cable-external-rotation`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Kettlebell Front Raise (`kettlebell-front-raise`)

- **Proposed name:** Kettlebell Front Raise
- **catalogId:** kettlebell-front-raise
- **Result:** B
- **Existing media path/URL:** data/catalog/images/dumbbell-front-raise/primary.webp; data/catalog/images/dumbbell-front-raise/secondary.webp; data/catalog/images/dumbbell-front-raise/thumbnail.webp
- **Analog catalogId (not interchangeable):** dumbbell-front-raise
- **Supabase object pattern (if synced):** catalog/dumbbell-front-raise/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`dumbbell-front-raise`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Landmine Front Raise (`landmine-front-raise`)

- **Proposed name:** Landmine Front Raise
- **catalogId:** landmine-front-raise
- **Result:** B
- **Existing media path/URL:** data/catalog/images/cable-front-raise/primary.webp; data/catalog/images/cable-front-raise/secondary.webp; data/catalog/images/cable-front-raise/thumbnail.webp
- **Analog catalogId (not interchangeable):** cable-front-raise
- **Supabase object pattern (if synced):** catalog/cable-front-raise/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`cable-front-raise`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Plate Front Raise (`plate-front-raise`)

- **Proposed name:** Plate Front Raise
- **catalogId:** plate-front-raise
- **Result:** B
- **Existing media path/URL:** data/catalog/images/dumbbell-front-raise/primary.webp; data/catalog/images/dumbbell-front-raise/secondary.webp; data/catalog/images/dumbbell-front-raise/thumbnail.webp
- **Analog catalogId (not interchangeable):** dumbbell-front-raise
- **Supabase object pattern (if synced):** catalog/dumbbell-front-raise/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`dumbbell-front-raise`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Prone T Raise (`prone-t-raise`)

- **Proposed name:** Prone T Raise
- **catalogId:** prone-t-raise
- **Result:** B
- **Existing media path/URL:** data/catalog/images/dumbbell-reverse-fly/primary.webp; data/catalog/images/dumbbell-reverse-fly/secondary.webp; data/catalog/images/dumbbell-reverse-fly/thumbnail.webp
- **Analog catalogId (not interchangeable):** dumbbell-reverse-fly
- **Supabase object pattern (if synced):** catalog/dumbbell-reverse-fly/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`dumbbell-reverse-fly`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Prone W Raise (`prone-w-raise`)

- **Proposed name:** Prone W Raise
- **catalogId:** prone-w-raise
- **Result:** B
- **Existing media path/URL:** data/catalog/images/dumbbell-reverse-fly/primary.webp; data/catalog/images/dumbbell-reverse-fly/secondary.webp; data/catalog/images/dumbbell-reverse-fly/thumbnail.webp
- **Analog catalogId (not interchangeable):** dumbbell-reverse-fly
- **Supabase object pattern (if synced):** catalog/dumbbell-reverse-fly/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`dumbbell-reverse-fly`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Prone Y Raise (`prone-y-raise`)

- **Proposed name:** Prone Y Raise
- **catalogId:** prone-y-raise
- **Result:** B
- **Existing media path/URL:** data/catalog/images/dumbbell-reverse-fly/primary.webp; data/catalog/images/dumbbell-reverse-fly/secondary.webp; data/catalog/images/dumbbell-reverse-fly/thumbnail.webp
- **Analog catalogId (not interchangeable):** dumbbell-reverse-fly
- **Supabase object pattern (if synced):** catalog/dumbbell-reverse-fly/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`dumbbell-reverse-fly`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Scaption Raise (`scaption-raise`)

- **Proposed name:** Scaption Raise
- **catalogId:** scaption-raise
- **Result:** B
- **Existing media path/URL:** data/catalog/images/dumbbell-front-raise/primary.webp; data/catalog/images/dumbbell-front-raise/secondary.webp; data/catalog/images/dumbbell-front-raise/thumbnail.webp
- **Analog catalogId (not interchangeable):** dumbbell-front-raise
- **Supabase object pattern (if synced):** catalog/dumbbell-front-raise/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`dumbbell-front-raise`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Side-Lying External Rotation (`side-lying-external-rotation`)

- **Proposed name:** Side-Lying External Rotation
- **catalogId:** side-lying-external-rotation
- **Result:** B
- **Existing media path/URL:** data/catalog/images/cable-external-rotation/primary.webp; data/catalog/images/cable-external-rotation/secondary.webp; data/catalog/images/cable-external-rotation/thumbnail.webp
- **Analog catalogId (not interchangeable):** cable-external-rotation
- **Supabase object pattern (if synced):** catalog/cable-external-rotation/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`cable-external-rotation`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Cable Overhead Triceps Extension (`cable-overhead-triceps-extension`)

- **Proposed name:** Cable Overhead Triceps Extension
- **catalogId:** cable-overhead-triceps-extension
- **Result:** B
- **Existing media path/URL:** data/catalog/images/ez-bar-overhead-extension/primary.webp; data/catalog/images/ez-bar-overhead-extension/secondary.webp; data/catalog/images/ez-bar-overhead-extension/thumbnail.webp
- **Analog catalogId (not interchangeable):** ez-bar-overhead-extension
- **Supabase object pattern (if synced):** catalog/ez-bar-overhead-extension/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`ez-bar-overhead-extension`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Cable Skull Crusher (`cable-skull-crusher`)

- **Proposed name:** Cable Skull Crusher
- **catalogId:** cable-skull-crusher
- **Result:** B
- **Existing media path/URL:** data/catalog/images/skull-crusher/primary.webp; data/catalog/images/skull-crusher/secondary.webp; data/catalog/images/skull-crusher/thumbnail.webp
- **Analog catalogId (not interchangeable):** skull-crusher
- **Supabase object pattern (if synced):** catalog/skull-crusher/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`skull-crusher`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Cross-Body Triceps Extension (`cross-body-triceps-extension`)

- **Proposed name:** Cross-Body Triceps Extension
- **catalogId:** cross-body-triceps-extension
- **Result:** B
- **Existing media path/URL:** data/catalog/images/single-arm-tricep-pushdown/primary.webp; data/catalog/images/single-arm-tricep-pushdown/secondary.webp; data/catalog/images/single-arm-tricep-pushdown/thumbnail.webp
- **Analog catalogId (not interchangeable):** single-arm-tricep-pushdown
- **Supabase object pattern (if synced):** catalog/single-arm-tricep-pushdown/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`single-arm-tricep-pushdown`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### JM Press (`jm-press`)

- **Proposed name:** JM Press
- **catalogId:** jm-press
- **Result:** D
- **Existing media path/URL:** —
- **Source/provider:** —
- **License information:** Not documented in repo for this proposed exercise (not a RepDB catalog row).
- **Explanation:** No RepDB entry or defensible similar catalog media; requires external demonstration source and license verification before import.

### Kettlebell Tate Press (`kettlebell-tate-press`)

- **Proposed name:** Kettlebell Tate Press
- **catalogId:** kettlebell-tate-press
- **Result:** D
- **Existing media path/URL:** —
- **Source/provider:** —
- **License information:** Not documented in repo for this proposed exercise (not a RepDB catalog row).
- **Explanation:** No RepDB entry or defensible similar catalog media; requires external demonstration source and license verification before import.

### PJR Pullover (`pjr-pullover`)

- **Proposed name:** PJR Pullover
- **catalogId:** pjr-pullover
- **Result:** B
- **Existing media path/URL:** data/catalog/images/db-pullover/primary.webp; data/catalog/images/db-pullover/secondary.webp; data/catalog/images/db-pullover/thumbnail.webp
- **Analog catalogId (not interchangeable):** db-pullover
- **Supabase object pattern (if synced):** catalog/db-pullover/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`db-pullover`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Band Overhead Triceps Extension (`band-overhead-triceps-extension`)

- **Proposed name:** Band Overhead Triceps Extension
- **catalogId:** band-overhead-triceps-extension
- **Result:** B
- **Existing media path/URL:** data/catalog/images/overhead-tricep-extension/primary.webp; data/catalog/images/overhead-tricep-extension/secondary.webp; data/catalog/images/overhead-tricep-extension/thumbnail.webp
- **Analog catalogId (not interchangeable):** overhead-tricep-extension
- **Supabase object pattern (if synced):** catalog/overhead-tricep-extension/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`overhead-tricep-extension`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Rolling Dumbbell Triceps Extension (`rolling-dumbbell-triceps-extension`)

- **Proposed name:** Rolling Dumbbell Triceps Extension
- **catalogId:** rolling-dumbbell-triceps-extension
- **Result:** B
- **Existing media path/URL:** data/catalog/images/lying-tricep-extension/primary.webp; data/catalog/images/lying-tricep-extension/secondary.webp; data/catalog/images/lying-tricep-extension/thumbnail.webp
- **Analog catalogId (not interchangeable):** lying-tricep-extension
- **Supabase object pattern (if synced):** catalog/lying-tricep-extension/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`lying-tricep-extension`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Rope Overhead Triceps Extension (`rope-overhead-triceps-extension`)

- **Proposed name:** Rope Overhead Triceps Extension
- **catalogId:** rope-overhead-triceps-extension
- **Result:** B
- **Existing media path/URL:** data/catalog/images/ez-bar-overhead-extension/primary.webp; data/catalog/images/ez-bar-overhead-extension/secondary.webp; data/catalog/images/ez-bar-overhead-extension/thumbnail.webp
- **Analog catalogId (not interchangeable):** ez-bar-overhead-extension
- **Supabase object pattern (if synced):** catalog/ez-bar-overhead-extension/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`ez-bar-overhead-extension`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

### Tate Press (`tate-press`)

- **Proposed name:** Tate Press
- **catalogId:** tate-press
- **Result:** D
- **Existing media path/URL:** —
- **Source/provider:** —
- **License information:** Not documented in repo for this proposed exercise (not a RepDB catalog row).
- **Explanation:** No RepDB entry or defensible similar catalog media; requires external demonstration source and license verification before import.

### Tiger Bend Push-Up (`tiger-bend-push-up`)

- **Proposed name:** Tiger Bend Push-Up
- **catalogId:** tiger-bend-push-up
- **Result:** B
- **Existing media path/URL:** data/catalog/images/close-grip-push-ups/primary.webp; data/catalog/images/close-grip-push-ups/secondary.webp; data/catalog/images/close-grip-push-ups/thumbnail.webp
- **Analog catalogId (not interchangeable):** close-grip-push-ups
- **Supabase object pattern (if synced):** catalog/close-grip-push-ups/{primary|secondary|thumbnail}.webp (Supabase public bucket per media-paths.ts)
- **Source/provider (analog/existing entry only):** repdb (`close-grip-push-ups`)
- **License (documented on catalog entry):** tier `free`; Exercise data by RepDB (repdb.co) — https://repdb.co
- **Explanation:** RepDB media exists locally for a different catalog exercise (analog); must not be reused as depiction of this proposed exercise. New media must still be sourced for the proposed catalogId.

---

## MEDIA SUMMARY

- **A — existing usable media:** 0
- **B — similar but not interchangeable:** 80 _(RepDB media exists for a different `catalogId`; still requires new media for the proposed exercise.)_
- **C — no existing media:** 0
- **D — source research needed:** 8 _(no defensible similar catalog media mapped; external source/licensing research first.)_

_All 88 proposed `catalogId` values have **no** folder under `data/catalog/images/`. None are RepDB catalog rows today. Even **B** exercises need newly imported demonstration media for the proposed identity._

**Verify:** A+B+C+D = 88

## EXERCISES WITH NO MEDIA

_Classification **C** or **D** (no exact usable media for the proposed exercise)._

- **Stomach Vacuum** (`stomach-vacuum`) — **D**
- **Band Biceps Curl** (`band-biceps-curl`) — **D**
- **Bayesian Cable Curl** (`bayesian-cable-curl`) — **D**
- **Bayesian Dumbbell Curl** (`bayesian-dumbbell-curl`) — **D**
- **Band Internal Rotation** (`band-internal-rotation`) — **D**
- **JM Press** (`jm-press`) — **D**
- **Kettlebell Tate Press** (`kettlebell-tate-press`) — **D**
- **Tate Press** (`tate-press`) — **D**

## EXISTING MEDIA DETAILS

_Classification **A** only._

_None. No proposed `catalogId` has a matching folder under `data/catalog/images/`, and no proposed exercise matches an existing catalog entry with dedicated media._


## SOURCE RESEARCH QUEUE

_Classification **D** — external demonstration media and license/use rights must be verified before any import._

- **Stomach Vacuum** (`stomach-vacuum`)
- **Band Biceps Curl** (`band-biceps-curl`)
- **Bayesian Cable Curl** (`bayesian-cable-curl`)
- **Bayesian Dumbbell Curl** (`bayesian-dumbbell-curl`)
- **Band Internal Rotation** (`band-internal-rotation`)
- **JM Press** (`jm-press`)
- **Kettlebell Tate Press** (`kettlebell-tate-press`)
- **Tate Press** (`tate-press`)

## NOTES

- Local bundle layout: `data/catalog/images/<catalogId>/primary.webp` (and secondary/thumbnail per `mediaAssets` in `exercises.json`).
- Supabase sync targets `catalog/<catalogId>/<pose>.<ext>` in the configured `gym-assets` bucket (`catalog-media-population.ts`, `catalog-media-storage.ts`).
- **B** entries document RepDB-licensed media for **other** exercises only; importing or relabeling that media as the proposed exercise would misrepresent the movement.
