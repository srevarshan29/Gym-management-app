export class TenantIsolationError extends Error {
  constructor(message = "Document does not belong to the requested gym.") {
    super(message);
    this.name = "TenantIsolationError";
  }
}

export class DocumentNotFoundError extends Error {
  constructor(collection: string, id: string) {
    super(`${collection}/${id} not found.`);
    this.name = "DocumentNotFoundError";
  }
}

export function isFirestoreNotFound(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as { code?: number | string }).code;
  return code === 5 || code === "NOT_FOUND";
}
