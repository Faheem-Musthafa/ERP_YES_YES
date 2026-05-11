/**
 * Money helpers backed by decimal.js. Replaces native JS `Number` arithmetic
 * for monetary values across CreateOrder / Billing / CreditNote / Payments /
 * OrderReview / InventoryReports.
 *
 * Why: native double-precision float drifts on chained * and *(1 - d/100)
 * (`0.1 + 0.2 = 0.30000000000000004`), and ERP totals derived from
 * `dp * qty * (1 - disc/100)` accumulate error on long orders.
 *
 * Storage: Postgres `numeric(14,2)` is exact decimal already. This module
 * only protects the *in-flight* JS computation between fetch and persist.
 */
import Decimal from 'decimal.js';

// Banker's rounding-free, half-up rounding to 2dp. Configure once.
Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

export type Money = Decimal;

/** Cast anything plausibly numeric to a Decimal. NaN-safe: returns 0. */
export const toMoney = (value: number | string | Decimal | null | undefined): Money => {
  if (value == null || value === '') return new Decimal(0);
  if (value instanceof Decimal) return value;
  try {
    const d = new Decimal(value);
    return d.isFinite() ? d : new Decimal(0);
  } catch {
    return new Decimal(0);
  }
};

export const addMoney = (...values: Array<number | string | Decimal>): Money =>
  values.reduce((acc: Decimal, v) => acc.plus(toMoney(v)), new Decimal(0));

export const subMoney = (a: number | string | Decimal, b: number | string | Decimal): Money =>
  toMoney(a).minus(toMoney(b));

export const mulMoney = (a: number | string | Decimal, b: number | string | Decimal): Money =>
  toMoney(a).times(toMoney(b));

export const divMoney = (a: number | string | Decimal, b: number | string | Decimal): Money => {
  const d = toMoney(b);
  if (d.isZero()) return new Decimal(0);
  return toMoney(a).dividedBy(d);
};

/** `pct` of `amount` — e.g. `pctMoney(1000, 18) = 180`. */
export const pctMoney = (amount: number | string | Decimal, pct: number | string | Decimal): Money =>
  toMoney(amount).times(toMoney(pct)).dividedBy(100);

/** Round to N decimal places (default 2). */
export const roundMoney = (value: number | string | Decimal, dp = 2): Money =>
  toMoney(value).toDecimalPlaces(dp);

/** Plain number — call only at persistence/display boundary. */
export const toNumber = (value: number | string | Decimal): number => {
  return toMoney(value).toDecimalPlaces(2).toNumber();
};

/** Plain string at fixed dp — useful for DB writes that prefer text. */
export const toFixedString = (value: number | string | Decimal, dp = 2): string =>
  toMoney(value).toFixed(dp);

/**
 * Indian-locale currency formatter.
 *   formatMoney(1234.5) -> "₹ 1,234.50"
 *   formatMoney(1234.5, { paise: false }) -> "₹ 1,234" (compact dashboards)
 */
export const formatMoney = (
  value: number | string | Decimal | null | undefined,
  opts: { paise?: boolean; sign?: 'auto' | 'always' } = {},
): string => {
  const paise = opts.paise !== false;
  const d = toMoney(value).toDecimalPlaces(paise ? 2 : 0);
  const sign = opts.sign === 'always' && !d.isNegative() ? '+' : '';
  const num = d.toNumber().toLocaleString('en-IN', {
    minimumFractionDigits: paise ? 2 : 0,
    maximumFractionDigits: paise ? 2 : 0,
  });
  return `${sign}₹ ${num}`;
};

/**
 * Compact INR formatter (used in dashboards). 1L / 1K abbreviations for
 * large amounts, full formatter otherwise.
 */
export const formatMoneyCompact = (value: number | string | Decimal | null | undefined): string => {
  const d = toMoney(value);
  const abs = d.abs();
  if (abs.gte(100_000)) {
    return `₹ ${d.dividedBy(100_000).toFixed(1)}L`;
  }
  if (abs.gte(1000)) {
    return `₹ ${d.dividedBy(1000).toFixed(1)}K`;
  }
  return formatMoney(d, { paise: false });
};

/**
 * Compute line amount given dealer-price, quantity, and discount percent.
 * Matches the existing CreateOrder/OrderReview formula but in exact decimal:
 *   amount = round(dp * qty * (100 - disc) / 100, 2)
 */
export const computeLineAmount = (
  dealerPrice: number | string | Decimal,
  quantity: number | string | Decimal,
  discountPct: number | string | Decimal,
): Money => {
  const dp = toMoney(dealerPrice);
  const qty = toMoney(quantity);
  const disc = toMoney(discountPct);
  return dp.times(qty).times(new Decimal(100).minus(disc)).dividedBy(100).toDecimalPlaces(2);
};
