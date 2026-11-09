export type AgreedMembershipPriceResult =
  | {
      ok: true;
      standardPackagePrice: number;
      agreedMembershipPrice: number;
      discountAmount: number;
    }
  | { ok: false; error: string };

/** Server-side validation — never trust client-submitted discount amounts. */
export function parseAgreedMembershipPrice(
  standardPackagePrice: number,
  raw: string | undefined,
): AgreedMembershipPriceResult {
  if (!Number.isFinite(standardPackagePrice) || standardPackagePrice < 0) {
    return { ok: false, error: "Selected package has an invalid price." };
  }

  const trimmed = raw?.trim() ?? "";
  if (!trimmed) {
    return { ok: false, error: "Enter the agreed membership price." };
  }

  const agreed = Number(trimmed);
  if (!Number.isFinite(agreed)) {
    return { ok: false, error: "Enter a valid agreed membership price." };
  }
  if (agreed < 0) {
    return { ok: false, error: "Agreed membership price cannot be negative." };
  }
  if (agreed > standardPackagePrice) {
    return {
      ok: false,
      error: "Agreed price cannot exceed the standard package price.",
    };
  }

  const discountAmount = Math.round((standardPackagePrice - agreed) * 100) / 100;

  return {
    ok: true,
    standardPackagePrice,
    agreedMembershipPrice: agreed,
    discountAmount,
  };
}
