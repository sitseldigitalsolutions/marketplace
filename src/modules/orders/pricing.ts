import { allocate, inclusiveTax, pct, type Paise } from '../../shared/money';

/**
 * Pure pricing engine shared by cart, checkout quote and order placement. All amounts are
 * integer paise. The server always recomputes totals from database prices — client totals are
 * never trusted.
 */
export interface PricingLine {
  key: string; // listingId
  sellerId: string;
  productId: string;
  /** Category of the product plus all its ancestors (for category-scoped coupons). */
  categoryIds: string[];
  unitPrice: Paise;
  unitMrp: Paise;
  quantity: number;
  taxRate: number;
}

export interface PricingCoupon {
  code: string;
  type: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING';
  value: number; // percent or rupees
  maxDiscount: Paise | null;
  minOrderAmount: Paise;
  scope: 'ALL' | 'CATEGORY' | 'PRODUCT' | 'SELLER';
  scopeIds: string[];
  fundedBy: 'PLATFORM' | 'SELLER';
}

export interface ShippingRule {
  baseFee: Paise;
  freeAbove: Paise | null;
}

export interface PricingInput {
  lines: PricingLine[];
  coupon?: PricingCoupon | null;
  shipping: ShippingRule;
  taxInclusive: boolean;
  codFee: Paise;
}

export interface PricedLine extends PricingLine {
  lineSubtotal: Paise;
  lineMrp: Paise;
  discount: Paise;
  sellerFundedDiscount: Paise;
  shipping: Paise;
  tax: Paise;
  total: Paise;
}

export interface PricedGroup {
  sellerId: string;
  lines: PricedLine[];
  itemsSubtotal: Paise;
  discount: Paise;
  shipping: Paise;
  shippingWaived: boolean;
  tax: Paise;
  total: Paise;
}

export interface CouponOutcome {
  code: string;
  applied: boolean;
  discount: Paise;
  shippingWaived: Paise;
  message: string;
}

export interface PricingResult {
  groups: PricedGroup[];
  mrpTotal: Paise;
  itemsSubtotal: Paise;
  savingsOnMrp: Paise;
  discountTotal: Paise;
  shippingTotal: Paise;
  codFee: Paise;
  taxTotal: Paise;
  grandTotal: Paise;
  coupon: CouponOutcome | null;
}

function eligible(line: PricingLine, coupon: PricingCoupon) {
  switch (coupon.scope) {
    case 'ALL':
      return true;
    case 'CATEGORY':
      return line.categoryIds.some((c) => coupon.scopeIds.includes(c));
    case 'PRODUCT':
      return coupon.scopeIds.includes(line.productId);
    case 'SELLER':
      return coupon.scopeIds.includes(line.sellerId);
  }
}

export function price(input: PricingInput): PricingResult {
  const lines = input.lines.map((l) => ({
    ...l,
    lineSubtotal: l.unitPrice * l.quantity,
    lineMrp: Math.max(l.unitMrp, l.unitPrice) * l.quantity,
    discount: 0,
    sellerFundedDiscount: 0,
    shipping: 0,
    tax: 0,
    total: 0,
  }));
  const itemsSubtotal = lines.reduce((s, l) => s + l.lineSubtotal, 0);

  // ── Coupon ────────────────────────────────────────────────
  let couponOutcome: CouponOutcome | null = null;
  let freeShippingSellers = new Set<string>();
  const c = input.coupon;
  if (c) {
    const eligibleLines = lines.filter((l) => eligible(l, c));
    const eligibleSubtotal = eligibleLines.reduce((s, l) => s + l.lineSubtotal, 0);
    if (eligibleLines.length === 0) {
      couponOutcome = { code: c.code, applied: false, discount: 0, shippingWaived: 0, message: 'This coupon does not apply to the items in your cart' };
    } else if (eligibleSubtotal < c.minOrderAmount) {
      couponOutcome = {
        code: c.code,
        applied: false,
        discount: 0,
        shippingWaived: 0,
        message: `Add items worth ₹${((c.minOrderAmount - eligibleSubtotal) / 100).toFixed(0)} more to use this coupon`,
      };
    } else if (c.type === 'FREE_SHIPPING') {
      freeShippingSellers = new Set(eligibleLines.map((l) => l.sellerId));
      couponOutcome = { code: c.code, applied: true, discount: 0, shippingWaived: 0, message: 'Free shipping applied' };
    } else {
      let discount = c.type === 'PERCENTAGE' ? pct(eligibleSubtotal, c.value) : Math.round(c.value * 100);
      if (c.maxDiscount !== null) discount = Math.min(discount, c.maxDiscount);
      discount = Math.min(discount, eligibleSubtotal);
      const parts = allocate(discount, eligibleLines.map((l) => l.lineSubtotal));
      eligibleLines.forEach((l, i) => {
        l.discount = parts[i];
        if (c.fundedBy === 'SELLER') l.sellerFundedDiscount = parts[i];
      });
      couponOutcome = { code: c.code, applied: true, discount, shippingWaived: 0, message: `You saved ₹${(discount / 100).toFixed(2).replace(/\.00$/, '')}` };
    }
  }

  // ── Per-seller groups: shipping + tax ─────────────────────
  const bySeller = new Map<string, typeof lines>();
  for (const l of lines) {
    if (!bySeller.has(l.sellerId)) bySeller.set(l.sellerId, []);
    bySeller.get(l.sellerId)!.push(l);
  }
  const groups: PricedGroup[] = [];
  let shippingWaivedTotal = 0;
  for (const [sellerId, gl] of bySeller) {
    const groupSubtotal = gl.reduce((s, l) => s + l.lineSubtotal, 0);
    const qualifiesFree = input.shipping.freeAbove !== null && groupSubtotal >= input.shipping.freeAbove;
    let shipping = qualifiesFree ? 0 : input.shipping.baseFee;
    const waived = shipping > 0 && freeShippingSellers.has(sellerId);
    if (waived) {
      shippingWaivedTotal += shipping;
      shipping = 0;
    }
    const shipParts = allocate(shipping, gl.map((l) => l.lineSubtotal || 1));
    gl.forEach((l, i) => {
      l.shipping = shipParts[i];
      const taxable = l.lineSubtotal - l.discount;
      l.tax = input.taxInclusive ? inclusiveTax(taxable, l.taxRate) : pct(taxable, l.taxRate);
      l.total = taxable + (input.taxInclusive ? 0 : l.tax) + l.shipping;
    });
    groups.push({
      sellerId,
      lines: gl,
      itemsSubtotal: groupSubtotal,
      discount: gl.reduce((s, l) => s + l.discount, 0),
      shipping,
      shippingWaived: waived,
      tax: gl.reduce((s, l) => s + l.tax, 0),
      total: gl.reduce((s, l) => s + l.total, 0),
    });
  }
  if (couponOutcome?.applied && input.coupon?.type === 'FREE_SHIPPING') {
    couponOutcome.shippingWaived = shippingWaivedTotal;
    couponOutcome.message = shippingWaivedTotal > 0 ? `Free shipping applied — you saved ₹${(shippingWaivedTotal / 100).toFixed(0)}` : 'Your order already ships free';
  }

  const discountTotal = lines.reduce((s, l) => s + l.discount, 0);
  const shippingTotal = groups.reduce((s, g) => s + g.shipping, 0);
  const taxTotal = lines.reduce((s, l) => s + l.tax, 0);
  const mrpTotal = lines.reduce((s, l) => s + l.lineMrp, 0);
  const linesTotal = lines.reduce((s, l) => s + l.total, 0);
  return {
    groups,
    mrpTotal,
    itemsSubtotal,
    savingsOnMrp: mrpTotal - itemsSubtotal,
    discountTotal,
    shippingTotal,
    codFee: lines.length ? input.codFee : 0,
    taxTotal,
    grandTotal: linesTotal + (lines.length ? input.codFee : 0),
    coupon: couponOutcome,
  };
}

// ── Commission ─────────────────────────────────────────────

export interface CommissionRuleLike {
  id: string;
  scope: 'GLOBAL' | 'CATEGORY' | 'SELLER' | 'SELLER_CATEGORY' | 'PRODUCT';
  sellerId: string | null;
  categoryId: string | null;
  productId: string | null;
  percentage: number;
  fixedAmount: Paise;
}

export interface ResolvedCommission {
  ruleId: string | null;
  scope: CommissionRuleLike['scope'];
  percentage: number;
  fixedPerUnit: Paise;
}

/**
 * Commission precedence — the most specific active rule wins:
 *   PRODUCT > SELLER_CATEGORY > SELLER > CATEGORY (nearest ancestor first) > GLOBAL > env default.
 */
export function resolveCommission(
  rules: CommissionRuleLike[],
  ctx: { sellerId: string; productId: string; categoryLineage: string[] /* nearest first */ },
  defaultPercent: number,
): ResolvedCommission {
  const pick = (r: CommissionRuleLike | undefined): ResolvedCommission | null =>
    r ? { ruleId: r.id, scope: r.scope, percentage: r.percentage, fixedPerUnit: r.fixedAmount } : null;
  const product = rules.find((r) => r.scope === 'PRODUCT' && r.productId === ctx.productId);
  if (product) return pick(product)!;
  for (const cat of ctx.categoryLineage) {
    const sc = rules.find((r) => r.scope === 'SELLER_CATEGORY' && r.sellerId === ctx.sellerId && r.categoryId === cat);
    if (sc) return pick(sc)!;
  }
  const seller = rules.find((r) => r.scope === 'SELLER' && r.sellerId === ctx.sellerId);
  if (seller) return pick(seller)!;
  for (const cat of ctx.categoryLineage) {
    const cr = rules.find((r) => r.scope === 'CATEGORY' && r.categoryId === cat);
    if (cr) return pick(cr)!;
  }
  const global = rules.find((r) => r.scope === 'GLOBAL');
  if (global) return pick(global)!;
  return { ruleId: null, scope: 'GLOBAL', percentage: defaultPercent, fixedPerUnit: 0 };
}

export interface CommissionAmounts {
  base: Paise;
  commission: Paise;
  commissionTax: Paise;
  /** What the seller earns for the line before shipping credit: base − commission − tax. */
  sellerNet: Paise;
}

/**
 * Commission is charged on the seller's realised item value: line subtotal minus any
 * seller-funded discount. Platform-funded coupons do not reduce the seller's earnings.
 */
export function commissionFor(
  line: { lineSubtotal: Paise; sellerFundedDiscount: Paise; quantity: number },
  rule: ResolvedCommission,
  commissionTaxRate: number,
): CommissionAmounts {
  const base = line.lineSubtotal - line.sellerFundedDiscount;
  const commission = Math.min(base, pct(base, rule.percentage) + rule.fixedPerUnit * line.quantity);
  const commissionTax = pct(commission, commissionTaxRate);
  return { base, commission, commissionTax, sellerNet: base - commission - commissionTax };
}

/** Pro-rate a line's amounts for a partial quantity (cancellations/returns). */
export function prorate(amount: Paise, part: number, whole: number): Paise {
  if (whole <= 0) return 0;
  return Math.round((amount * part) / whole);
}
