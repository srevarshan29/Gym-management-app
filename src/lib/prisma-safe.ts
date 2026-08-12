/** Coerce optional form/schema values to null before Prisma write boundaries. */
export function prismaNull<T>(value: T | null | undefined): T | null {
  return value ?? null;
}
