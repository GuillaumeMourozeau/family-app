type TFunction = (key: string, options?: Record<string, unknown>) => string;

// The default place is seeded per-family with the literal English name "Anywhere".
// Once a user renames it, respect their custom text instead of overriding it.
export function displayPlaceName(place: { name: string; is_default: boolean }, t: TFunction): string {
  if (place.is_default && place.name === "Anywhere") return t("groceries.anywhere");
  return place.name;
}
