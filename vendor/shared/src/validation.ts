import { z } from 'zod';
import {
  ADDRESS_TYPES,
  ATTRIBUTE_TYPES,
  BANNER_PLACEMENTS,
  BUSINESS_TYPES,
  COMMISSION_SCOPES,
  COUPON_SCOPES,
  COUPON_TYPES,
  HOME_SECTION_TYPES,
  ORDER_STATUSES,
  PRODUCT_STATUSES,
  SELLER_DOCUMENT_TYPES,
  SELLER_STATUSES,
  SETTLEMENT_STATUSES,
  SHIPPING_METHODS,
} from './enums';

// ── Primitives ────────────────────────────────────────────────
export const idSchema = z.string().min(1).max(64);
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');
export const pincodeSchema = z
  .string()
  .trim()
  .regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit PIN code');
export const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Enter a valid 15-character GSTIN');
export const panSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Enter a valid 10-character PAN');
export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(128)
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[0-9]/, 'Include a number');
export const emailSchema = z.email('Enter a valid email address').trim().toLowerCase().max(191);
export const moneySchema = z.coerce.number().min(0).max(10_000_000).multipleOf(0.01);
export const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens');

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined));

/** Query-string boolean: accepts true/false/1/0 (z.coerce.boolean would treat "false" as true). */
export const queryBoolean = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');

// ── Pagination ────────────────────────────────────────────────
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).optional(),
  sort: z.string().trim().max(40).optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

// ── Auth ──────────────────────────────────────────────────────
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(120),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal('').transform(() => undefined)),
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});
export const verifyEmailSchema = z.object({ token: z.string().min(20).max(200) });

// ── Seller onboarding ─────────────────────────────────────────
export const sellerPersonalSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});

export const sellerBusinessSchema = z.object({
  businessName: z.string().trim().min(2).max(160),
  businessType: z.enum(BUSINESS_TYPES),
  addressLine1: z.string().trim().min(3).max(200),
  addressLine2: optionalText(200),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: pincodeSchema,
  gstin: gstinSchema.optional().or(z.literal('').transform(() => undefined)),
  pan: panSchema,
});

export const sellerAgreementSchema = z.object({
  acceptTerms: z.literal(true, { error: 'You must accept the marketplace terms' }),
  acceptCommissionPolicy: z.literal(true, { error: 'You must accept the commission policy' }),
});

export const sellerRegistrationSchema = sellerPersonalSchema
  .extend(sellerBusinessSchema.shape)
  .extend(sellerAgreementSchema.shape);
export type SellerRegistrationInput = z.infer<typeof sellerRegistrationSchema>;

export const adminCreateSellerSchema = sellerBusinessSchema.extend({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  phone: phoneSchema,
  autoApprove: z.boolean().default(true),
});

export const sellerProfileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(160).optional(),
  description: optionalText(2000),
  supportEmail: emailSchema.optional().or(z.literal('').transform(() => undefined)),
  supportPhone: phoneSchema.optional().or(z.literal('').transform(() => undefined)),
  fulfillmentMode: z.enum(['SELLER', 'PLATFORM']).optional(),
});

export const sellerDecisionSchema = z.object({ reason: optionalText(1000) });
export const sellerStatusQuerySchema = paginationQuerySchema.extend({
  status: z.enum(SELLER_STATUSES).optional(),
});
export const sellerDocumentTypeSchema = z.enum(SELLER_DOCUMENT_TYPES);

// ── Addresses ─────────────────────────────────────────────────
export const addressSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  line1: z.string().trim().min(3).max(200),
  line2: optionalText(200),
  landmark: optionalText(120),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: pincodeSchema,
  type: z.enum(ADDRESS_TYPES).default('HOME'),
  isDefault: z.boolean().default(false),
});
export type AddressInput = z.infer<typeof addressSchema>;

// ── Catalog ───────────────────────────────────────────────────
export const categorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema.optional(),
  parentId: idSchema.nullable().optional(),
  description: optionalText(1000),
  imageUrl: optionalText(500),
  icon: optionalText(60),
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(true),
  commissionPercent: z.coerce.number().min(0).max(100).nullable().optional(),
  taxRate: z.coerce.number().min(0).max(100).nullable().optional(),
});

export const brandSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugSchema.optional(),
  logoUrl: optionalText(500),
  description: optionalText(1000),
  isActive: z.boolean().default(true),
});

export const attributeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  code: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z][a-z0-9_]*$/, 'Use lowercase letters, digits and underscores'),
  type: z.enum(ATTRIBUTE_TYPES),
  categoryId: idSchema.nullable().optional(),
  options: z.array(z.string().trim().min(1).max(80)).max(200).default([]),
  isFilterable: z.boolean().default(true),
  isVariantAxis: z.boolean().default(false),
  isRequired: z.boolean().default(false),
});

export const variantInputSchema = z
  .object({
    id: idSchema.optional(),
    options: z.record(z.string().max(60), z.string().trim().min(1).max(80)).default({}),
    sku: z
      .string()
      .trim()
      .min(2)
      .max(64)
      .regex(/^[A-Za-z0-9._-]+$/, 'SKU may contain letters, digits, dot, dash and underscore'),
    barcode: optionalText(64),
    price: moneySchema.refine((v) => v > 0, 'Price must be greater than 0'),
    mrp: moneySchema.refine((v) => v > 0, 'MRP must be greater than 0'),
    stock: z.coerce.number().int().min(0).max(1_000_000).default(0),
    lowStockThreshold: z.coerce.number().int().min(0).max(100000).default(5),
    weightGrams: z.coerce.number().int().min(0).max(1_000_000).optional(),
    lengthCm: z.coerce.number().min(0).max(10000).optional(),
    widthCm: z.coerce.number().min(0).max(10000).optional(),
    heightCm: z.coerce.number().min(0).max(10000).optional(),
    isActive: z.boolean().default(true),
  })
  .refine((v) => v.price <= v.mrp, { message: 'Selling price cannot exceed MRP', path: ['price'] });
export type VariantInput = z.infer<typeof variantInputSchema>;

export const productUpsertSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10, 'Add a description of at least 10 characters').max(20000),
  highlights: z.array(z.string().trim().min(1).max(200)).max(12).default([]),
  categoryId: idSchema,
  brandId: idSchema.nullable().optional(),
  hsnCode: optionalText(16),
  specifications: z
    .array(z.object({ key: z.string().trim().min(1).max(80), value: z.string().trim().min(1).max(400) }))
    .max(60)
    .default([]),
  attributes: z
    .array(z.object({ attributeId: idSchema, value: z.string().trim().min(1).max(200) }))
    .max(60)
    .default([]),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  isReturnable: z.boolean().default(true),
  returnWindowDays: z.coerce.number().int().min(0).max(90).default(7),
  codAvailable: z.boolean().default(true),
  videoUrl: optionalText(500),
  variants: z.array(variantInputSchema).min(1, 'Add at least one variant').max(100),
  /** When true the product is submitted for review, otherwise it is saved as a draft. */
  submit: z.boolean().default(false),
});
export type ProductUpsertInput = z.infer<typeof productUpsertSchema>;

export const productDecisionSchema = z.object({ reason: optionalText(1000) });
export const productRejectSchema = z.object({ reason: z.string().trim().min(3).max(1000) });

export const productListQuerySchema = paginationQuerySchema.extend({
  category: z.string().trim().max(160).optional(),
  brand: z.string().trim().max(400).optional(), // comma-separated slugs
  seller: z.string().trim().max(160).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  inStock: queryBoolean.optional(),
  onSale: queryBoolean.optional(),
  attrs: z.string().trim().max(1000).optional(), // code:value|value;code:value
  sort: z.enum(['relevance', 'newest', 'price_asc', 'price_desc', 'rating', 'popular', 'discount']).optional(),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const managedProductQuerySchema = paginationQuerySchema.extend({
  status: z.enum(PRODUCT_STATUSES).optional(),
  categoryId: idSchema.optional(),
  sellerId: idSchema.optional(),
});

export const inventoryAdjustSchema = z.object({
  delta: z.coerce.number().int().min(-1_000_000).max(1_000_000).optional(),
  setTo: z.coerce.number().int().min(0).max(1_000_000).optional(),
  reason: z.string().trim().min(2).max(300),
  lowStockThreshold: z.coerce.number().int().min(0).max(100000).optional(),
});

export const bulkInventorySchema = z.object({
  items: z
    .array(
      z.object({
        sku: z.string().trim().min(1).max(64),
        quantity: z.coerce.number().int().min(0).max(1_000_000),
      }),
    )
    .min(1)
    .max(1000),
  reason: z.string().trim().min(2).max(300).default('Bulk update'),
});

// ── Cart & checkout ───────────────────────────────────────────
export const addCartItemSchema = z.object({
  listingId: idSchema,
  quantity: z.coerce.number().int().min(1).max(10).default(1),
});
export const updateCartItemSchema = z.object({ quantity: z.coerce.number().int().min(1).max(10) });
export const applyCouponSchema = z.object({ code: z.string().trim().toUpperCase().min(3).max(40) });

export const checkoutQuoteSchema = z.object({
  addressId: idSchema.optional(),
  pincode: pincodeSchema.optional(),
  shippingMethod: z.enum(SHIPPING_METHODS).default('STANDARD'),
  couponCode: z.string().trim().toUpperCase().max(40).optional().or(z.literal('').transform(() => undefined)),
});

export const placeOrderSchema = z.object({
  addressId: idSchema,
  shippingMethod: z.enum(SHIPPING_METHODS).default('STANDARD'),
  paymentMethod: z.literal('COD'),
  couponCode: z.string().trim().toUpperCase().max(40).optional().or(z.literal('').transform(() => undefined)),
  /** Client-generated UUID; the same key always returns the same order. */
  idempotencyKey: z.string().trim().min(8).max(64),
  /** Totals the customer saw — used only to detect price changes, never to charge. */
  expectedGrandTotal: z.coerce.number().min(0).optional(),
  notes: optionalText(500),
});
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(3).max(500),
  orderItemIds: z.array(idSchema).max(100).optional(),
});

export const returnRequestSchema = z.object({
  reason: z.string().trim().min(3).max(120),
  comments: optionalText(1000),
  items: z
    .array(z.object({ orderItemId: idSchema, quantity: z.coerce.number().int().min(1).max(100) }))
    .min(1)
    .max(100),
});

export const orderListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sellerId: idSchema.optional(),
});

export const sellerOrderStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']),
  note: optionalText(500),
  carrier: optionalText(80),
  trackingNumber: optionalText(80),
  trackingUrl: optionalText(500),
});

export const returnDecisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT', 'MARK_RECEIVED']),
  note: optionalText(500),
  restock: z.boolean().default(true),
});

// ── Reviews ───────────────────────────────────────────────────
export const reviewSchema = z.object({
  productId: idSchema,
  orderItemId: idSchema.optional(),
  rating: z.coerce.number().int().min(1).max(5),
  title: optionalText(120),
  body: optionalText(4000),
});
export const reviewReportSchema = z.object({ reason: z.string().trim().min(3).max(300) });

// ── Marketing ─────────────────────────────────────────────────
export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3)
      .max(40)
      .regex(/^[A-Z0-9_-]+$/),
    description: optionalText(300),
    type: z.enum(COUPON_TYPES),
    value: z.coerce.number().min(0).max(1_000_000).default(0),
    maxDiscount: z.coerce.number().min(0).nullable().optional(),
    minOrderAmount: z.coerce.number().min(0).default(0),
    scope: z.enum(COUPON_SCOPES).default('ALL'),
    scopeIds: z.array(idSchema).max(200).default([]),
    fundedBy: z.enum(['PLATFORM', 'SELLER']).default('PLATFORM'),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    usageLimit: z.coerce.number().int().min(1).nullable().optional(),
    perCustomerLimit: z.coerce.number().int().min(1).default(1),
    firstOrderOnly: z.boolean().default(false),
    isActive: z.boolean().default(true),
  })
  .refine((c) => c.endsAt > c.startsAt, { message: 'End date must be after start date', path: ['endsAt'] })
  .refine((c) => c.type !== 'PERCENTAGE' || c.value <= 100, { message: 'Percentage cannot exceed 100', path: ['value'] });

export const bannerSchema = z.object({
  title: z.string().trim().min(1).max(160),
  subtitle: optionalText(300),
  ctaLabel: optionalText(40),
  linkUrl: optionalText(500),
  imageUrl: optionalText(500),
  theme: optionalText(200),
  placement: z.enum(BANNER_PLACEMENTS).default('HERO'),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
});

export const homeSectionSchema = z.object({
  type: z.enum(HOME_SECTION_TYPES),
  title: z.string().trim().min(1).max(120),
  subtitle: optionalText(200),
  categoryId: idSchema.nullable().optional(),
  limit: z.coerce.number().int().min(1).max(48).default(12),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const promotionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: optionalText(500),
  discountPercent: z.coerce.number().min(1).max(90),
  categoryId: idSchema.nullable().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  isActive: z.boolean().default(true),
});

// ── Finance ───────────────────────────────────────────────────
export const commissionRuleSchema = z
  .object({
    scope: z.enum(COMMISSION_SCOPES),
    categoryId: idSchema.nullable().optional(),
    sellerId: idSchema.nullable().optional(),
    productId: idSchema.nullable().optional(),
    percentage: z.coerce.number().min(0).max(100),
    fixedAmount: z.coerce.number().min(0).max(100000).default(0),
    isActive: z.boolean().default(true),
  })
  .refine((r) => r.scope !== 'CATEGORY' || !!r.categoryId, { message: 'Category is required', path: ['categoryId'] })
  .refine((r) => r.scope !== 'SELLER' || !!r.sellerId, { message: 'Seller is required', path: ['sellerId'] })
  .refine((r) => r.scope !== 'SELLER_CATEGORY' || (!!r.sellerId && !!r.categoryId), {
    message: 'Seller and category are required',
    path: ['sellerId'],
  })
  .refine((r) => r.scope !== 'PRODUCT' || !!r.productId, { message: 'Product is required', path: ['productId'] });

export const createSettlementSchema = z.object({
  sellerId: idSchema,
  amount: z.coerce.number().positive().max(100_000_000),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
  notes: optionalText(1000),
});

export const settlementStatusSchema = z.object({
  status: z.enum(SETTLEMENT_STATUSES),
  reference: optionalText(120),
  notes: optionalText(1000),
});

export const ledgerAdjustmentSchema = z.object({
  sellerId: idSchema,
  amount: z.coerce.number().refine((v) => v !== 0, 'Amount cannot be zero'),
  reason: z.string().trim().min(3).max(500),
});

// ── Configuration ─────────────────────────────────────────────
export const shippingConfigSchema = z.object({
  method: z.enum(SHIPPING_METHODS),
  label: z.string().trim().min(2).max(80),
  baseFee: z.coerce.number().min(0).max(100000),
  freeAbove: z.coerce.number().min(0).nullable().optional(),
  minDays: z.coerce.number().int().min(0).max(60),
  maxDays: z.coerce.number().int().min(0).max(90),
  isActive: z.boolean().default(true),
});

export const taxConfigSchema = z.object({
  name: z.string().trim().min(2).max(80),
  categoryId: idSchema.nullable().optional(),
  rate: z.coerce.number().min(0).max(100),
  isInclusive: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const pincodeSchemaInput = z.object({
  pincode: pincodeSchema,
  city: optionalText(80),
  state: optionalText(80),
  isServiceable: z.boolean().default(true),
  codAvailable: z.boolean().default(true),
  extraDays: z.coerce.number().int().min(0).max(30).default(0),
});

export const settingUpdateSchema = z.object({ value: z.unknown() });

export const notificationTemplateSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(10000),
  isActive: z.boolean().default(true),
});

export const userAdminUpdateSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  roles: z.array(z.enum(['ADMIN', 'SELLER', 'CUSTOMER'])).min(1).optional(),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: phoneSchema.optional().or(z.literal('').transform(() => undefined)),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNDISCLOSED']).optional(),
  dateOfBirth: z.coerce.date().optional().nullable(),
});
