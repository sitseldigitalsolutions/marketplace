import { Prisma } from '@prisma/client';

/**
 * Money helpers. All arithmetic is done in integer paise to avoid floating point drift;
 * values are converted to Prisma.Decimal / numbers at the edges.
 */
export type Paise = number;

export const toPaise = (v: Prisma.Decimal | number | string | null | undefined): Paise => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'object' ? Number(v.toString()) : Number(v);
  return Math.round(n * 100);
};

export const fromPaise = (p: Paise): number => Math.round(p) / 100;
export const decimal = (p: Paise) => new Prisma.Decimal(fromPaise(p).toFixed(2));
export const num = (v: Prisma.Decimal | number | string | null | undefined): number =>
  v === null || v === undefined ? 0 : fromPaise(toPaise(v));

/** Percentage of an amount, rounded half-up to the paisa. */
export const pct = (amount: Paise, percent: number): Paise => Math.round((amount * percent) / 100);

/** Tax contained in a tax-inclusive amount: amount × r / (100 + r). */
export const inclusiveTax = (amount: Paise, rate: number): Paise =>
  rate > 0 ? Math.round((amount * rate) / (100 + rate)) : 0;

/**
 * Split `total` across `weights` proportionally so the parts always sum to exactly `total`
 * (largest-remainder method). Used to allocate coupon discounts and shipping to line items.
 */
export function allocate(total: Paise, weights: number[]): Paise[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (total === 0 || sum === 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const floored = raw.map(Math.floor);
  let remainder = total - floored.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floored[i] += 1;
    remainder -= 1;
  }
  return floored;
}
