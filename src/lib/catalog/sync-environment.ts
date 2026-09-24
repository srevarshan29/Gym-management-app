export type CatalogSyncEnvironment = {
  projectId: string | null;
  firestoreEmulatorHost: string | null;
  isEmulator: boolean;
  allowProduction: boolean;
};

export class CatalogSyncProductionBlockedError extends Error {
  constructor() {
    super(
      "Refusing Firestore catalog writes outside the emulator. " +
        "Start the Firestore emulator (FIRESTORE_EMULATOR_HOST) or set " +
        "CATALOG_SYNC_ALLOW_PRODUCTION=true after explicit review.",
    );
    this.name = "CatalogSyncProductionBlockedError";
  }
}

export class CatalogSyncWriteNotConfirmedError extends Error {
  constructor() {
    super(
      "Write mode requires explicit confirmation. Re-run with --write --confirm-write.",
    );
    this.name = "CatalogSyncWriteNotConfirmedError";
  }
}

export function resolveCatalogSyncEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): CatalogSyncEnvironment {
  return {
    projectId: env.FIREBASE_PROJECT_ID ?? null,
    firestoreEmulatorHost: env.FIRESTORE_EMULATOR_HOST ?? null,
    isEmulator: Boolean(env.FIRESTORE_EMULATOR_HOST),
    allowProduction: env.CATALOG_SYNC_ALLOW_PRODUCTION === "true",
  };
}

export function assertCatalogSyncWriteEnvironment(
  env: CatalogSyncEnvironment,
): void {
  if (env.isEmulator || env.allowProduction) return;
  throw new CatalogSyncProductionBlockedError();
}

export type ParsedCatalogSyncCliArgs = {
  dryRun: boolean;
  writeRequested: boolean;
  writeConfirmed: boolean;
  help: boolean;
};

export function parseCatalogSyncCliArgs(argv: string[]): ParsedCatalogSyncCliArgs {
  const help = argv.includes("--help") || argv.includes("-h");
  const writeRequested = argv.includes("--write");
  const writeConfirmed = argv.includes("--confirm-write");
  const dryRun = !writeRequested || argv.includes("--dry-run");
  return {
    dryRun: writeRequested ? false : dryRun,
    writeRequested,
    writeConfirmed,
    help,
  };
}

export function assertCatalogSyncWriteConfirmed(args: ParsedCatalogSyncCliArgs): void {
  if (!args.writeRequested) return;
  if (!args.writeConfirmed) {
    throw new CatalogSyncWriteNotConfirmedError();
  }
}
