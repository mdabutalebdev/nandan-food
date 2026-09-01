// Money + misc formatting helpers for the storefront.

/** Format a number as Bangladeshi Taka, e.g. 1263 → "৳1,263". */
export function taka(amount: number): string {
  const n = Math.round(Number(amount) || 0);
  return `৳${n.toLocaleString("en-BD")}`;
}

/** Discount % from an original vs current price (0 when none). */
export function discountPct(price: number, originalPrice?: number | null): number {
  if (!originalPrice || originalPrice <= price) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}
