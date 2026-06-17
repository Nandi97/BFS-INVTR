export interface AvgMonthlyResult {
  avgMonthly: number;
  monthsUsed: number;  // months included after trimming
  confident:  boolean; // true when >= 3 non-zero months in the trimmed window
}

/**
 * Compute average monthly sales from a descending-sorted list of sales records.
 *
 * Leading zeros (most recent months) are stripped — they represent a current
 * hold period (legal clearance, distribution pause) and are not real demand
 * signal. Zeros scattered in the middle are kept: sporadic/reusable products
 * genuinely don't sell every month.
 *
 * "Confident" = at least 3 non-zero months in the trimmed window. Below that
 * the average is too thin to trust for ordering decisions and callers should
 * surface a low-data warning rather than treating the number as reliable.
 */
export function computeAvgMonthly(
  records: { quantity: number }[]
): AvgMonthlyResult {
  // Strip leading zeros (= most recent zero months in desc-sorted array)
  let start = 0;
  while (start < records.length && records[start].quantity <= 0) start++;

  const trimmed = records.slice(start);

  if (trimmed.length === 0) {
    return { avgMonthly: 0, monthsUsed: 0, confident: false };
  }

  const sum        = trimmed.reduce((s, r) => s + Number(r.quantity), 0);
  const avgMonthly = sum / trimmed.length;
  const nonZero    = trimmed.filter((r) => r.quantity > 0).length;

  return {
    avgMonthly,
    monthsUsed: trimmed.length,
    confident:  nonZero >= 3,
  };
}
