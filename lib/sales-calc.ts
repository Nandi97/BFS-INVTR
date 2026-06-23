export const SAFETY_DAYS = 7;

export interface AvgMonthlyResult {
	avgMonthly: number;
	monthsUsed: number; // months included after trimming
	confident: boolean; // true when >= 3 non-zero months in the trimmed window
}

/**
 * Compute a recency-weighted average monthly sales figure.
 *
 * Two adjustments over a plain mean:
 *
 * 1. Trailing-zero trim — leading zeros in the desc-sorted array (= the most
 *    recent zero months) are stripped before averaging. These represent a
 *    current hold period (legal clearance, distribution pause, etc.) and
 *    should not dilute the historical demand signal. Zeros scattered in the
 *    middle are kept: sporadic/reusable products genuinely don't sell every
 *    month, and that low frequency is valid signal.
 *
 * 2. Linear recency weighting — within the trimmed window, the most recent
 *    month gets weight n, the next n-1, …, the oldest gets weight 1. This
 *    means a product whose sales are trending up or down is weighted toward
 *    its recent trajectory rather than a flat average across the full window.
 *
 * "Confident" = at least 3 non-zero months remain after trimming. Below that
 * the estimate is too thin to trust and callers should surface a warning.
 *
 * Records must arrive sorted descending (most recent first), which matches
 * every Prisma query in this codebase that uses:
 *   orderBy: [{ year: "desc" }, { month: "desc" }]
 */
export function computeAvgMonthly(
	records: { quantity: number }[]
): AvgMonthlyResult {
	// Strip leading zeros = most recent zero months (current hold period)
	let start = 0;
	while (start < records.length && records[start].quantity <= 0) start++;

	const trimmed = records.slice(start);

	if (trimmed.length === 0) {
		return { avgMonthly: 0, monthsUsed: 0, confident: false };
	}

	// Linear recency weights: index 0 (most recent) = n, index n-1 (oldest) = 1
	const n = trimmed.length;
	let weightedSum = 0;
	let totalWeight = 0;
	for (let i = 0; i < n; i++) {
		const w = n - i;
		weightedSum += Number(trimmed[i].quantity) * w;
		totalWeight += w;
	}

	const avgMonthly = weightedSum / totalWeight;
	const nonZero = trimmed.filter((r) => r.quantity > 0).length;

	return {
		avgMonthly,
		monthsUsed: n,
		confident: nonZero >= 3,
	};
}
