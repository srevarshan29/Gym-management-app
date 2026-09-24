/**
 * Deterministic bootstrap tenant IDs shared by Postgres and Firestore seeds.
 * Used only for the default demo gym — super-admin provisioning uses generated IDs
 * mirrored to Postgres at creation time.
 */
export const DEFAULT_SEED_GYM_ID = "gym_default_0000000001";

export const DEFAULT_SEED_OWNER_USER_ID = "user_default_owner_0000000001";

/** Stable QR / self-registration token for the default seeded gym. */
export const DEFAULT_SEED_REGISTRATION_TOKEN = "reg_default_0000000001";
