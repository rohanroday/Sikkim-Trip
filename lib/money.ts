/** All money is integer paise. Rupees exist only at the edges (input forms, display). */
export type Paise = number;

export function assertPaise(value: number, label = "amount"): asserts value is Paise {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer number of paise, got ${value}`);
  }
}

export function rupeesToPaise(rupees: number): Paise {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: Paise): number {
  return paise / 100;
}

/** ₹1,25,000 style (Indian digit grouping). Paise shown only when non-zero. */
export function formatINR(paise: Paise): string {
  const rupees = paise / 100;
  const hasPaise = paise % 100 !== 0;
  return (
    "₹" +
    rupees.toLocaleString("en-IN", {
      minimumFractionDigits: hasPaise ? 2 : 0,
      maximumFractionDigits: hasPaise ? 2 : 0,
    })
  );
}

/**
 * Commission on one booking item, rounded once, half-up, to whole paise.
 * pct may carry up to two decimals (e.g. 10.5).
 */
export function commissionFor(amount: Paise, pct: number): Paise {
  assertPaise(amount);
  if (!(pct >= 0 && pct <= 100)) throw new Error(`commission pct out of range: ${pct}`);
  const bps = Math.round(pct * 100);
  return Math.floor((amount * bps + 5000) / 10000);
}

export const DEFAULT_COMMISSION_PCT = 10;
export const MIN_COMMISSION_PCT = 8;
export const MAX_COMMISSION_PCT = 12;
