// ../shared/src/enums.ts
var values = (o) => Object.values(o);
var RoleCode = { ADMIN: "ADMIN", SELLER: "SELLER", CUSTOMER: "CUSTOMER" };
var ROLE_CODES = values(RoleCode);
var SellerStatus = {
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED",
  INACTIVE: "INACTIVE"
};
var SELLER_STATUSES = values(SellerStatus);
var BusinessType = {
  INDIVIDUAL: "INDIVIDUAL",
  PROPRIETORSHIP: "PROPRIETORSHIP",
  PARTNERSHIP: "PARTNERSHIP",
  LLP: "LLP",
  PRIVATE_LIMITED: "PRIVATE_LIMITED",
  PUBLIC_LIMITED: "PUBLIC_LIMITED",
  OTHER: "OTHER"
};
var BUSINESS_TYPES = values(BusinessType);
var ProductStatus = {
  DRAFT: "DRAFT",
  PENDING_REVIEW: "PENDING_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED",
  ARCHIVED: "ARCHIVED"
};
var PRODUCT_STATUSES = values(ProductStatus);
var OrderStatus = {
  PENDING_CONFIRMATION: "PENDING_CONFIRMATION",
  CONFIRMED: "CONFIRMED",
  PROCESSING: "PROCESSING",
  SHIPPED: "SHIPPED",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  RETURN_REQUESTED: "RETURN_REQUESTED",
  RETURN_APPROVED: "RETURN_APPROVED",
  RETURN_REJECTED: "RETURN_REJECTED",
  RETURNED: "RETURNED",
  REFUND_PENDING: "REFUND_PENDING",
  REFUNDED: "REFUNDED"
};
var ORDER_STATUSES = values(OrderStatus);
var ShippingMethod = { STANDARD: "STANDARD", EXPRESS: "EXPRESS" };
var SHIPPING_METHODS = values(ShippingMethod);
var SettlementStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  PROCESSING: "PROCESSING",
  PAID: "PAID",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED"
};
var SETTLEMENT_STATUSES = values(SettlementStatus);
var CommissionScope = {
  GLOBAL: "GLOBAL",
  CATEGORY: "CATEGORY",
  SELLER: "SELLER",
  SELLER_CATEGORY: "SELLER_CATEGORY",
  PRODUCT: "PRODUCT"
};
var COMMISSION_SCOPES = values(CommissionScope);
var CouponType = { PERCENTAGE: "PERCENTAGE", FIXED: "FIXED", FREE_SHIPPING: "FREE_SHIPPING" };
var COUPON_TYPES = values(CouponType);
var CouponScope = { ALL: "ALL", CATEGORY: "CATEGORY", PRODUCT: "PRODUCT", SELLER: "SELLER" };
var COUPON_SCOPES = values(CouponScope);
var BannerPlacement = { HERO: "HERO", STRIP: "STRIP", CATEGORY: "CATEGORY" };
var BANNER_PLACEMENTS = values(BannerPlacement);
var HomeSectionType = {
  CATEGORY_GRID: "CATEGORY_GRID",
  TRENDING: "TRENDING",
  BEST_SELLERS: "BEST_SELLERS",
  NEW_ARRIVALS: "NEW_ARRIVALS",
  ON_SALE: "ON_SALE",
  FEATURED_PRODUCTS: "FEATURED_PRODUCTS",
  CATEGORY_PRODUCTS: "CATEGORY_PRODUCTS",
  FEATURED_SELLERS: "FEATURED_SELLERS",
  RECOMMENDED: "RECOMMENDED",
  RECENTLY_VIEWED: "RECENTLY_VIEWED"
};
var HOME_SECTION_TYPES = values(HomeSectionType);
var AttributeType = { TEXT: "TEXT", NUMBER: "NUMBER", SELECT: "SELECT", BOOLEAN: "BOOLEAN" };
var ATTRIBUTE_TYPES = values(AttributeType);
var SellerDocumentType = {
  GST_CERTIFICATE: "GST_CERTIFICATE",
  PAN_CARD: "PAN_CARD",
  ADDRESS_PROOF: "ADDRESS_PROOF",
  CANCELLED_CHEQUE: "CANCELLED_CHEQUE",
  OTHER: "OTHER"
};
var SELLER_DOCUMENT_TYPES = values(SellerDocumentType);
var AddressType = { HOME: "HOME", WORK: "WORK", OTHER: "OTHER" };
var ADDRESS_TYPES = values(AddressType);

// ../shared/src/permissions.ts
var Permissions = {
  // Admin — users & access
  USERS_READ: "users:read",
  USERS_MANAGE: "users:manage",
  ROLES_MANAGE: "roles:manage",
  // Admin — sellers
  SELLERS_READ: "sellers:read",
  SELLERS_MANAGE: "sellers:manage",
  SELLERS_APPROVE: "sellers:approve",
  // Admin — catalog
  CATALOG_MANAGE: "catalog:manage",
  PRODUCTS_READ_ALL: "products:read_all",
  PRODUCTS_MANAGE_ALL: "products:manage_all",
  PRODUCTS_APPROVE: "products:approve",
  INVENTORY_MANAGE_ALL: "inventory:manage_all",
  // Admin — orders & finance
  ORDERS_READ_ALL: "orders:read_all",
  ORDERS_MANAGE_ALL: "orders:manage_all",
  COMMISSIONS_MANAGE: "commissions:manage",
  SETTLEMENTS_MANAGE: "settlements:manage",
  // Admin — marketing & config
  COUPONS_MANAGE: "coupons:manage",
  CONTENT_MANAGE: "content:manage",
  REVIEWS_MODERATE: "reviews:moderate",
  SETTINGS_MANAGE: "settings:manage",
  REPORTS_READ: "reports:read",
  AUDIT_READ: "audit:read",
  NOTIFICATIONS_MANAGE: "notifications:manage",
  // Seller (always scoped to the authenticated seller)
  SELLER_DASHBOARD: "seller:dashboard",
  SELLER_PRODUCTS: "seller:products",
  SELLER_INVENTORY: "seller:inventory",
  SELLER_ORDERS: "seller:orders",
  SELLER_SETTLEMENTS: "seller:settlements",
  SELLER_PROFILE: "seller:profile",
  // Customer
  CUSTOMER_ORDERS: "customer:orders",
  CUSTOMER_PROFILE: "customer:profile",
  CUSTOMER_REVIEWS: "customer:reviews"
};
var ALL_PERMISSIONS = Object.values(Permissions);
var ADMIN_PERMISSIONS = ALL_PERMISSIONS.filter((p) => !p.startsWith("seller:"));
var SELLER_PERMISSIONS = [
  Permissions.SELLER_DASHBOARD,
  Permissions.SELLER_PRODUCTS,
  Permissions.SELLER_INVENTORY,
  Permissions.SELLER_ORDERS,
  Permissions.SELLER_SETTLEMENTS,
  Permissions.SELLER_PROFILE
];
var CUSTOMER_PERMISSIONS = [
  Permissions.CUSTOMER_ORDERS,
  Permissions.CUSTOMER_PROFILE,
  Permissions.CUSTOMER_REVIEWS
];
var DEFAULT_ROLE_PERMISSIONS = {
  ADMIN: ADMIN_PERMISSIONS,
  SELLER: [...SELLER_PERMISSIONS, ...CUSTOMER_PERMISSIONS],
  CUSTOMER: CUSTOMER_PERMISSIONS
};

// ../shared/src/order-flow.ts
var SELLER_ORDER_TRANSITIONS = {
  PENDING_CONFIRMATION: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
  RETURN_REQUESTED: [],
  RETURN_APPROVED: [],
  RETURN_REJECTED: [],
  RETURNED: [],
  REFUND_PENDING: [],
  REFUNDED: []
};
function canTransition(from, to) {
  return SELLER_ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}
var CUSTOMER_CANCELLABLE = ["PENDING_CONFIRMATION", "CONFIRMED", "PROCESSING"];
var PROGRESS_RANK = {
  PENDING_CONFIRMATION: 0,
  CONFIRMED: 1,
  PROCESSING: 2,
  SHIPPED: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5
};
function deriveParentStatus(subStatuses) {
  const active = subStatuses.filter((s2) => s2 !== "CANCELLED");
  if (active.length === 0) return OrderStatus.CANCELLED;
  let best = active[0];
  for (const s2 of active) {
    const r = PROGRESS_RANK[s2] ?? 5;
    if (r < (PROGRESS_RANK[best] ?? 5)) best = s2;
  }
  return best;
}
var ORDER_STATUS_LABELS = {
  PENDING_CONFIRMATION: "Awaiting confirmation",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURN_REQUESTED: "Return requested",
  RETURN_APPROVED: "Return approved",
  RETURN_REJECTED: "Return rejected",
  RETURNED: "Returned",
  REFUND_PENDING: "Refund pending",
  REFUNDED: "Refunded"
};

// ../shared/src/validation.ts
import { z } from "zod";
var idSchema = z.string().min(1).max(64);
var phoneSchema = z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");
var pincodeSchema = z.string().trim().regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit PIN code");
var gstinSchema = z.string().trim().toUpperCase().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid 15-character GSTIN");
var panSchema = z.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Enter a valid 10-character PAN");
var passwordSchema = z.string().min(8, "Use at least 8 characters").max(128).regex(/[a-z]/, "Include a lowercase letter").regex(/[A-Z]/, "Include an uppercase letter").regex(/[0-9]/, "Include a number");
var emailSchema = z.email("Enter a valid email address").trim().toLowerCase().max(191);
var moneySchema = z.coerce.number().min(0).max(1e7).multipleOf(0.01);
var slugSchema = z.string().trim().min(2).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens");
var optionalText = (max) => z.string().trim().max(max).optional().or(z.literal("").transform(() => void 0));
var queryBoolean = z.enum(["true", "false", "1", "0"]).transform((v) => v === "true" || v === "1");
var paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).optional(),
  sort: z.string().trim().max(40).optional()
});
var registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal("").transform(() => void 0)),
  password: passwordSchema
});
var loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(128)
});
var forgotPasswordSchema = z.object({ email: emailSchema });
var resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema
});
var changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema
});
var verifyEmailSchema = z.object({ token: z.string().min(20).max(200) });
var sellerPersonalSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema
});
var sellerBusinessSchema = z.object({
  businessName: z.string().trim().min(2).max(160),
  businessType: z.enum(BUSINESS_TYPES),
  addressLine1: z.string().trim().min(3).max(200),
  addressLine2: optionalText(200),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: pincodeSchema,
  gstin: gstinSchema.optional().or(z.literal("").transform(() => void 0)),
  pan: panSchema
});
var sellerAgreementSchema = z.object({
  acceptTerms: z.literal(true, { error: "You must accept the marketplace terms" }),
  acceptCommissionPolicy: z.literal(true, { error: "You must accept the commission policy" })
});
var sellerRegistrationSchema = sellerPersonalSchema.extend(sellerBusinessSchema.shape).extend(sellerAgreementSchema.shape);
var adminCreateSellerSchema = sellerBusinessSchema.extend({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  phone: phoneSchema,
  autoApprove: z.boolean().default(true)
});
var sellerProfileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(160).optional(),
  description: optionalText(2e3),
  supportEmail: emailSchema.optional().or(z.literal("").transform(() => void 0)),
  supportPhone: phoneSchema.optional().or(z.literal("").transform(() => void 0)),
  fulfillmentMode: z.enum(["SELLER", "PLATFORM"]).optional()
});
var sellerDecisionSchema = z.object({ reason: optionalText(1e3) });
var sellerStatusQuerySchema = paginationQuerySchema.extend({
  status: z.enum(SELLER_STATUSES).optional()
});
var sellerDocumentTypeSchema = z.enum(SELLER_DOCUMENT_TYPES);
var addressSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  line1: z.string().trim().min(3).max(200),
  line2: optionalText(200),
  landmark: optionalText(120),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: pincodeSchema,
  type: z.enum(ADDRESS_TYPES).default("HOME"),
  isDefault: z.boolean().default(false)
});
var categorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema.optional(),
  parentId: idSchema.nullable().optional(),
  description: optionalText(1e3),
  imageUrl: optionalText(500),
  icon: optionalText(60),
  sortOrder: z.coerce.number().int().min(0).max(1e5).default(0),
  isActive: z.boolean().default(true),
  commissionPercent: z.coerce.number().min(0).max(100).nullable().optional(),
  taxRate: z.coerce.number().min(0).max(100).nullable().optional()
});
var brandSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugSchema.optional(),
  logoUrl: optionalText(500),
  description: optionalText(1e3),
  isActive: z.boolean().default(true)
});
var attributeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  code: z.string().trim().min(1).max(60).regex(/^[a-z][a-z0-9_]*$/, "Use lowercase letters, digits and underscores"),
  type: z.enum(ATTRIBUTE_TYPES),
  categoryId: idSchema.nullable().optional(),
  options: z.array(z.string().trim().min(1).max(80)).max(200).default([]),
  isFilterable: z.boolean().default(true),
  isVariantAxis: z.boolean().default(false),
  isRequired: z.boolean().default(false)
});
var variantInputSchema = z.object({
  id: idSchema.optional(),
  options: z.record(z.string().max(60), z.string().trim().min(1).max(80)).default({}),
  sku: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9._-]+$/, "SKU may contain letters, digits, dot, dash and underscore"),
  barcode: optionalText(64),
  price: moneySchema.refine((v) => v > 0, "Price must be greater than 0"),
  mrp: moneySchema.refine((v) => v > 0, "MRP must be greater than 0"),
  stock: z.coerce.number().int().min(0).max(1e6).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).max(1e5).default(5),
  weightGrams: z.coerce.number().int().min(0).max(1e6).optional(),
  lengthCm: z.coerce.number().min(0).max(1e4).optional(),
  widthCm: z.coerce.number().min(0).max(1e4).optional(),
  heightCm: z.coerce.number().min(0).max(1e4).optional(),
  isActive: z.boolean().default(true)
}).refine((v) => v.price <= v.mrp, { message: "Selling price cannot exceed MRP", path: ["price"] });
var productUpsertSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10, "Add a description of at least 10 characters").max(2e4),
  highlights: z.array(z.string().trim().min(1).max(200)).max(12).default([]),
  categoryId: idSchema,
  brandId: idSchema.nullable().optional(),
  hsnCode: optionalText(16),
  specifications: z.array(z.object({ key: z.string().trim().min(1).max(80), value: z.string().trim().min(1).max(400) })).max(60).default([]),
  attributes: z.array(z.object({ attributeId: idSchema, value: z.string().trim().min(1).max(200) })).max(60).default([]),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  isReturnable: z.boolean().default(true),
  returnWindowDays: z.coerce.number().int().min(0).max(90).default(7),
  codAvailable: z.boolean().default(true),
  videoUrl: optionalText(500),
  variants: z.array(variantInputSchema).min(1, "Add at least one variant").max(100),
  /** When true the product is submitted for review, otherwise it is saved as a draft. */
  submit: z.boolean().default(false)
});
var productDecisionSchema = z.object({ reason: optionalText(1e3) });
var productRejectSchema = z.object({ reason: z.string().trim().min(3).max(1e3) });
var productListQuerySchema = paginationQuerySchema.extend({
  category: z.string().trim().max(160).optional(),
  brand: z.string().trim().max(400).optional(),
  // comma-separated slugs
  seller: z.string().trim().max(160).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  inStock: queryBoolean.optional(),
  onSale: queryBoolean.optional(),
  attrs: z.string().trim().max(1e3).optional(),
  // code:value|value;code:value
  sort: z.enum(["relevance", "newest", "price_asc", "price_desc", "rating", "popular", "discount"]).optional()
});
var managedProductQuerySchema = paginationQuerySchema.extend({
  status: z.enum(PRODUCT_STATUSES).optional(),
  categoryId: idSchema.optional(),
  sellerId: idSchema.optional()
});
var inventoryAdjustSchema = z.object({
  delta: z.coerce.number().int().min(-1e6).max(1e6).optional(),
  setTo: z.coerce.number().int().min(0).max(1e6).optional(),
  reason: z.string().trim().min(2).max(300),
  lowStockThreshold: z.coerce.number().int().min(0).max(1e5).optional()
});
var bulkInventorySchema = z.object({
  items: z.array(
    z.object({
      sku: z.string().trim().min(1).max(64),
      quantity: z.coerce.number().int().min(0).max(1e6)
    })
  ).min(1).max(1e3),
  reason: z.string().trim().min(2).max(300).default("Bulk update")
});
var addCartItemSchema = z.object({
  listingId: idSchema,
  quantity: z.coerce.number().int().min(1).max(10).default(1)
});
var updateCartItemSchema = z.object({ quantity: z.coerce.number().int().min(1).max(10) });
var applyCouponSchema = z.object({ code: z.string().trim().toUpperCase().min(3).max(40) });
var checkoutQuoteSchema = z.object({
  addressId: idSchema.optional(),
  pincode: pincodeSchema.optional(),
  shippingMethod: z.enum(SHIPPING_METHODS).default("STANDARD"),
  couponCode: z.string().trim().toUpperCase().max(40).optional().or(z.literal("").transform(() => void 0))
});
var placeOrderSchema = z.object({
  addressId: idSchema,
  shippingMethod: z.enum(SHIPPING_METHODS).default("STANDARD"),
  paymentMethod: z.literal("COD"),
  couponCode: z.string().trim().toUpperCase().max(40).optional().or(z.literal("").transform(() => void 0)),
  /** Client-generated UUID; the same key always returns the same order. */
  idempotencyKey: z.string().trim().min(8).max(64),
  /** Totals the customer saw — used only to detect price changes, never to charge. */
  expectedGrandTotal: z.coerce.number().min(0).optional(),
  notes: optionalText(500)
});
var cancelOrderSchema = z.object({
  reason: z.string().trim().min(3).max(500),
  orderItemIds: z.array(idSchema).max(100).optional()
});
var returnRequestSchema = z.object({
  reason: z.string().trim().min(3).max(120),
  comments: optionalText(1e3),
  items: z.array(z.object({ orderItemId: idSchema, quantity: z.coerce.number().int().min(1).max(100) })).min(1).max(100)
});
var orderListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sellerId: idSchema.optional()
});
var sellerOrderStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]),
  note: optionalText(500),
  carrier: optionalText(80),
  trackingNumber: optionalText(80),
  trackingUrl: optionalText(500)
});
var returnDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT", "MARK_RECEIVED"]),
  note: optionalText(500),
  restock: z.boolean().default(true)
});
var reviewSchema = z.object({
  productId: idSchema,
  orderItemId: idSchema.optional(),
  rating: z.coerce.number().int().min(1).max(5),
  title: optionalText(120),
  body: optionalText(4e3)
});
var reviewReportSchema = z.object({ reason: z.string().trim().min(3).max(300) });
var couponSchema = z.object({
  code: z.string().trim().toUpperCase().min(3).max(40).regex(/^[A-Z0-9_-]+$/),
  description: optionalText(300),
  type: z.enum(COUPON_TYPES),
  value: z.coerce.number().min(0).max(1e6).default(0),
  maxDiscount: z.coerce.number().min(0).nullable().optional(),
  minOrderAmount: z.coerce.number().min(0).default(0),
  scope: z.enum(COUPON_SCOPES).default("ALL"),
  scopeIds: z.array(idSchema).max(200).default([]),
  fundedBy: z.enum(["PLATFORM", "SELLER"]).default("PLATFORM"),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  usageLimit: z.coerce.number().int().min(1).nullable().optional(),
  perCustomerLimit: z.coerce.number().int().min(1).default(1),
  firstOrderOnly: z.boolean().default(false),
  isActive: z.boolean().default(true)
}).refine((c2) => c2.endsAt > c2.startsAt, { message: "End date must be after start date", path: ["endsAt"] }).refine((c2) => c2.type !== "PERCENTAGE" || c2.value <= 100, { message: "Percentage cannot exceed 100", path: ["value"] });
var bannerSchema = z.object({
  title: z.string().trim().min(1).max(160),
  subtitle: optionalText(300),
  ctaLabel: optionalText(40),
  linkUrl: optionalText(500),
  imageUrl: optionalText(500),
  theme: optionalText(200),
  placement: z.enum(BANNER_PLACEMENTS).default("HERO"),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional()
});
var homeSectionSchema = z.object({
  type: z.enum(HOME_SECTION_TYPES),
  title: z.string().trim().min(1).max(120),
  subtitle: optionalText(200),
  categoryId: idSchema.nullable().optional(),
  limit: z.coerce.number().int().min(1).max(48).default(12),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true)
});
var promotionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: optionalText(500),
  discountPercent: z.coerce.number().min(1).max(90),
  categoryId: idSchema.nullable().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  isActive: z.boolean().default(true)
});
var commissionRuleSchema = z.object({
  scope: z.enum(COMMISSION_SCOPES),
  categoryId: idSchema.nullable().optional(),
  sellerId: idSchema.nullable().optional(),
  productId: idSchema.nullable().optional(),
  percentage: z.coerce.number().min(0).max(100),
  fixedAmount: z.coerce.number().min(0).max(1e5).default(0),
  isActive: z.boolean().default(true)
}).refine((r) => r.scope !== "CATEGORY" || !!r.categoryId, { message: "Category is required", path: ["categoryId"] }).refine((r) => r.scope !== "SELLER" || !!r.sellerId, { message: "Seller is required", path: ["sellerId"] }).refine((r) => r.scope !== "SELLER_CATEGORY" || !!r.sellerId && !!r.categoryId, {
  message: "Seller and category are required",
  path: ["sellerId"]
}).refine((r) => r.scope !== "PRODUCT" || !!r.productId, { message: "Product is required", path: ["productId"] });
var createSettlementSchema = z.object({
  sellerId: idSchema,
  amount: z.coerce.number().positive().max(1e8),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
  notes: optionalText(1e3)
});
var settlementStatusSchema = z.object({
  status: z.enum(SETTLEMENT_STATUSES),
  reference: optionalText(120),
  notes: optionalText(1e3)
});
var ledgerAdjustmentSchema = z.object({
  sellerId: idSchema,
  amount: z.coerce.number().refine((v) => v !== 0, "Amount cannot be zero"),
  reason: z.string().trim().min(3).max(500)
});
var shippingConfigSchema = z.object({
  method: z.enum(SHIPPING_METHODS),
  label: z.string().trim().min(2).max(80),
  baseFee: z.coerce.number().min(0).max(1e5),
  freeAbove: z.coerce.number().min(0).nullable().optional(),
  minDays: z.coerce.number().int().min(0).max(60),
  maxDays: z.coerce.number().int().min(0).max(90),
  isActive: z.boolean().default(true)
});
var taxConfigSchema = z.object({
  name: z.string().trim().min(2).max(80),
  categoryId: idSchema.nullable().optional(),
  rate: z.coerce.number().min(0).max(100),
  isInclusive: z.boolean().default(true),
  isActive: z.boolean().default(true)
});
var pincodeSchemaInput = z.object({
  pincode: pincodeSchema,
  city: optionalText(80),
  state: optionalText(80),
  isServiceable: z.boolean().default(true),
  codAvailable: z.boolean().default(true),
  extraDays: z.coerce.number().int().min(0).max(30).default(0)
});
var settingUpdateSchema = z.object({ value: z.unknown() });
var notificationTemplateSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(1e4),
  isActive: z.boolean().default(true)
});
var userAdminUpdateSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  roles: z.array(z.enum(["ADMIN", "SELLER", "CUSTOMER"])).min(1).optional()
});
var profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: phoneSchema.optional().or(z.literal("").transform(() => void 0)),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "UNDISCLOSED"]).optional(),
  dateOfBirth: z.coerce.date().optional().nullable()
});

// src/config/env.ts
import { z as z2 } from "zod";
var bool = z2.enum(["true", "false", "1", "0", ""]).optional().transform((v) => v === "true" || v === "1");
var EnvSchema = z2.object({
  NODE_ENV: z2.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z2.enum(["development", "test", "staging", "production"]).optional(),
  PORT: z2.coerce.number().int().positive().default(4e3),
  API_BASE_URL: z2.url().default("http://localhost:4000"),
  FRONTEND_URL: z2.url().default("http://localhost:5173"),
  CORS_ORIGINS: z2.string().optional().default(""),
  BACKEND_FRAMEWORK: z2.enum(["express", "hapi"]).default("express"),
  DATABASE_TYPE: z2.enum(["mysql", "mongodb"]).default("mysql"),
  ORM_PROVIDER: z2.enum(["prisma", "drizzle", "mongoose"]).default("prisma"),
  DATABASE_URL: z2.string().optional(),
  MONGODB_URL: z2.string().optional(),
  JWT_ACCESS_SECRET: z2.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z2.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  ACCESS_TOKEN_TTL: z2.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z2.coerce.number().int().min(1).max(365).default(30),
  COOKIE_SECURE: bool,
  COOKIE_DOMAIN: z2.string().optional().default(""),
  PASSWORD_HASHER: z2.enum(["argon2id", "bcrypt"]).default("argon2id"),
  LOGIN_MAX_ATTEMPTS: z2.coerce.number().int().min(1).default(5),
  LOGIN_LOCK_MINUTES: z2.coerce.number().int().min(1).default(15),
  STORAGE_PROVIDER: z2.enum(["local", "s3"]).default("local"),
  LOCAL_UPLOAD_DIR: z2.string().default("uploads"),
  UPLOAD_MAX_IMAGE_MB: z2.coerce.number().positive().default(5),
  UPLOAD_MAX_DOCUMENT_MB: z2.coerce.number().positive().default(10),
  FILE_SIGNING_SECRET: z2.string().min(16).optional(),
  AWS_REGION: z2.string().optional().default(""),
  AWS_S3_BUCKET: z2.string().optional().default(""),
  AWS_ACCESS_KEY_ID: z2.string().optional().default(""),
  AWS_SECRET_ACCESS_KEY: z2.string().optional().default(""),
  AWS_S3_ENDPOINT: z2.string().optional().default(""),
  AWS_S3_PUBLIC_URL: z2.string().optional().default(""),
  REDIS_ENABLED: bool,
  REDIS_URL: z2.string().optional().default(""),
  PAYMENT_PROVIDER: z2.enum(["cod"]).default("cod"),
  EMAIL_PROVIDER: z2.enum(["console", "smtp"]).default("console"),
  EMAIL_FROM: z2.string().default("Vyora <no-reply@vyora.local>"),
  SMTP_HOST: z2.string().optional().default(""),
  SMTP_PORT: z2.coerce.number().int().default(587),
  SMTP_USER: z2.string().optional().default(""),
  SMTP_PASSWORD: z2.string().optional().default(""),
  SMS_PROVIDER: z2.enum(["console"]).default("console"),
  WHATSAPP_PROVIDER: z2.enum(["console"]).default("console"),
  DEFAULT_CURRENCY: z2.string().length(3).default("INR"),
  DEFAULT_COUNTRY: z2.string().length(2).default("IN"),
  DEFAULT_TIMEZONE: z2.string().default("Asia/Kolkata"),
  COMMISSION_DEFAULT_PERCENTAGE: z2.coerce.number().min(0).max(100).default(10),
  RATE_LIMIT_WINDOW_SECONDS: z2.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX: z2.coerce.number().int().positive().default(300),
  /** Scales every per-route limit (tests use a large value; keep 1 in production). */
  RATE_LIMIT_ROUTE_MULTIPLIER: z2.coerce.number().positive().default(1),
  LOG_LEVEL: z2.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info")
});
var SUPPORTED_COMBINATIONS = {
  "mysql:prisma": { implemented: true, note: "Default configuration." },
  "mysql:drizzle": { implemented: false, note: "Drizzle adapter not implemented yet \u2014 see docs/DATABASE_PROVIDERS.md." },
  "mongodb:prisma": { implemented: false, note: "Prisma MongoDB adapter not implemented yet \u2014 see docs/MONGODB.md." },
  "mongodb:mongoose": { implemented: false, note: "Mongoose adapter not implemented yet \u2014 see docs/MONGODB.md." }
};
var ConfigError = class extends Error {
};
function loadEnv(source = process.env) {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  \u2022 ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
    throw new ConfigError(`Invalid environment configuration:
${issues}`);
  }
  const env2 = parsed.data;
  env2.APP_ENV = env2.APP_ENV ?? (env2.NODE_ENV === "production" ? "production" : env2.NODE_ENV);
  const combo = `${env2.DATABASE_TYPE}:${env2.ORM_PROVIDER}`;
  const support = SUPPORTED_COMBINATIONS[combo];
  if (!support) {
    throw new ConfigError(
      `Unsupported DATABASE_TYPE/ORM_PROVIDER combination "${combo}". Valid combinations: ${Object.keys(SUPPORTED_COMBINATIONS).join(", ")}.`
    );
  }
  if (!support.implemented) {
    throw new ConfigError(`DATABASE_TYPE/ORM_PROVIDER "${combo}" is recognised but not available: ${support.note}`);
  }
  if (env2.DATABASE_TYPE === "mysql" && !env2.DATABASE_URL?.startsWith("mysql://")) {
    throw new ConfigError("DATABASE_URL must be a mysql:// connection string when DATABASE_TYPE=mysql");
  }
  if (env2.DATABASE_TYPE === "mongodb" && !env2.MONGODB_URL) {
    throw new ConfigError("MONGODB_URL is required when DATABASE_TYPE=mongodb");
  }
  if (env2.STORAGE_PROVIDER === "s3" && (!env2.AWS_S3_BUCKET || !env2.AWS_REGION)) {
    throw new ConfigError("AWS_S3_BUCKET and AWS_REGION are required when STORAGE_PROVIDER=s3");
  }
  if (env2.REDIS_ENABLED && !env2.REDIS_URL) {
    throw new ConfigError("REDIS_URL is required when REDIS_ENABLED=true");
  }
  if (env2.EMAIL_PROVIDER === "smtp" && !env2.SMTP_HOST) {
    throw new ConfigError("SMTP_HOST is required when EMAIL_PROVIDER=smtp");
  }
  if (env2.APP_ENV === "production" || env2.APP_ENV === "staging") {
    const weak = [env2.JWT_ACCESS_SECRET, env2.JWT_REFRESH_SECRET].some((s2) => s2.includes("replace_me"));
    if (weak) throw new ConfigError("JWT secrets still contain placeholder values; set strong secrets for production.");
    if (env2.JWT_ACCESS_SECRET === env2.JWT_REFRESH_SECRET) {
      throw new ConfigError("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ.");
    }
    if (!env2.COOKIE_SECURE) throw new ConfigError("COOKIE_SECURE must be true in staging/production (HTTPS).");
    if (!env2.FILE_SIGNING_SECRET) throw new ConfigError("FILE_SIGNING_SECRET is required in staging/production.");
  }
  return env2;
}

// src/bootstrap/container.ts
import { Redis } from "ioredis";

// src/database/prisma/client.ts
import { Prisma, PrismaClient } from "@prisma/client";

// src/shared/logger.ts
import pino from "pino";
var level = process.env.LOG_LEVEL ?? "info";
var pretty = process.env.NODE_ENV === "development" && process.stdout.isTTY;
var logger = pino({
  level,
  base: { service: "vyora-api" },
  redact: {
    paths: [
      "password",
      "*.password",
      "*.passwordHash",
      "req.headers.authorization",
      "req.headers.cookie",
      "*.token",
      "*.refreshToken"
    ],
    censor: "[redacted]"
  },
  ...pretty ? { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } } } : {}
});

// src/database/prisma/client.ts
var PrismaMySqlProvider = class {
  type = "mysql";
  orm = "prisma";
  client;
  constructor(url) {
    const client = new PrismaClient({
      datasources: url ? { db: { url } } : void 0,
      // READ COMMITTED avoids InnoDB gap-lock deadlocks between unrelated writers; correctness-critical
      // paths use explicit conditional UPDATEs and SELECT … FOR UPDATE row locks instead.
      transactionOptions: { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 1e4, timeout: 2e4 },
      log: [
        { level: "warn", emit: "event" },
        { level: "error", emit: "event" }
      ]
    });
    client.$on("warn", (e) => logger.warn({ prisma: e.message }, "prisma warning"));
    client.$on("error", (e) => logger.error({ prisma: e.message }, "prisma error"));
    this.client = client;
  }
  async connect() {
    await this.client.$connect();
  }
  async disconnect() {
    await this.client.$disconnect();
  }
  async healthCheck() {
    const started = Date.now();
    try {
      await this.client.$queryRaw`SELECT 1`;
      return { ok: true, latencyMs: Date.now() - started };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - started, error: err.message };
    }
  }
  transaction(fn) {
    return this.client.$transaction((tx) => fn(tx), {
      maxWait: 1e4,
      timeout: 2e4,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
    });
  }
};
var isUniqueViolation = (err, field) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002" && (!field || JSON.stringify(err.meta?.target ?? "").includes(field));

// src/database/index.ts
function createDatabaseProvider(env2) {
  const combo = `${env2.DATABASE_TYPE}:${env2.ORM_PROVIDER}`;
  switch (combo) {
    case "mysql:prisma":
      return new PrismaMySqlProvider(env2.DATABASE_URL);
    default:
      throw new ConfigError(`No database provider available for ${combo}`);
  }
}

// src/database/prisma/repositories.ts
import { Prisma as Prisma2 } from "@prisma/client";
var json = (v) => v === void 0 ? void 0 : v === null ? Prisma2.JsonNull : v;
var snapshot = (v) => v === void 0 ? void 0 : JSON.parse(JSON.stringify(v));
var PrismaAuditRepository = class {
  constructor(db2) {
    this.db = db2;
  }
  db;
  async record(e) {
    await this.db.auditLog.create({
      data: {
        actorId: e.actorId ?? null,
        actorRole: e.actorRole ?? null,
        action: e.action,
        entityType: e.entityType,
        entityId: e.entityId ?? null,
        before: json(snapshot(e.before)),
        after: json(snapshot(e.after)),
        metadata: json(snapshot(e.metadata)),
        ip: e.ip ?? null,
        userAgent: e.userAgent?.slice(0, 300) ?? null
      }
    });
  }
};
var PrismaSecurityEventRepository = class {
  constructor(db2) {
    this.db = db2;
  }
  db;
  async record(e) {
    await this.db.securityEvent.create({
      data: {
        type: e.type,
        userId: e.userId ?? null,
        email: e.email ?? null,
        ip: e.ip ?? null,
        userAgent: e.userAgent?.slice(0, 300) ?? null,
        details: json(snapshot(e.details))
      }
    });
  }
};
var PrismaSettingsRepository = class {
  constructor(db2) {
    this.db = db2;
  }
  db;
  async get(key) {
    const row = await this.db.systemSetting.findUnique({ where: { key } });
    return row?.value;
  }
  async getAll() {
    const rows = await this.db.systemSetting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }
  async set(key, value, updatedById) {
    await this.db.systemSetting.upsert({
      where: { key },
      create: { key, value, updatedById: updatedById ?? null },
      update: { value, updatedById: updatedById ?? null }
    });
  }
};

// src/http/rate-limit.ts
var MemoryRateLimitStore = class {
  buckets = /* @__PURE__ */ new Map();
  timer;
  constructor() {
    this.timer = setInterval(() => {
      const now = Date.now();
      for (const [k, v] of this.buckets) if (v.resetAt <= now) this.buckets.delete(k);
    }, 6e4);
    this.timer.unref();
  }
  async hit(key, windowSeconds) {
    const now = Date.now();
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowSeconds * 1e3 };
      this.buckets.set(key, fresh);
      return fresh;
    }
    existing.count += 1;
    return existing;
  }
  async reset(key) {
    this.buckets.delete(key);
  }
};
var RedisRateLimitStore = class {
  constructor(redis) {
    this.redis = redis;
  }
  redis;
  async hit(key, windowSeconds) {
    const k = `rl:${key}`;
    const results = await this.redis.multi().incr(k).pttl(k).exec();
    const count = Number(results?.[0]?.[1] ?? 1);
    let ttl = Number(results?.[1]?.[1] ?? -1);
    if (ttl < 0) {
      await this.redis.pexpire(k, windowSeconds * 1e3);
      ttl = windowSeconds * 1e3;
    }
    return { count, resetAt: Date.now() + ttl };
  }
  async reset(key) {
    await this.redis.del(`rl:${key}`);
  }
};

// src/infrastructure/cache.ts
var MemoryCache = class {
  store = /* @__PURE__ */ new Map();
  async get(key) {
    const hit = this.store.get(key);
    if (!hit) return void 0;
    if (hit.expires < Date.now()) {
      this.store.delete(key);
      return void 0;
    }
    return hit.value;
  }
  async set(key, value, ttlSeconds2) {
    if (this.store.size > 5e3) this.store.clear();
    this.store.set(key, { value, expires: Date.now() + ttlSeconds2 * 1e3 });
  }
  async delPrefix(prefix) {
    for (const k of this.store.keys()) if (k.startsWith(prefix)) this.store.delete(k);
  }
};
var RedisCache = class {
  constructor(redis) {
    this.redis = redis;
  }
  redis;
  async get(key) {
    const raw = await this.redis.get(`cache:${key}`);
    return raw ? JSON.parse(raw) : void 0;
  }
  async set(key, value, ttlSeconds2) {
    await this.redis.set(`cache:${key}`, JSON.stringify(value), "EX", ttlSeconds2);
  }
  async delPrefix(prefix) {
    let cursor = "0";
    do {
      const [next, keys] = await this.redis.scan(cursor, "MATCH", `cache:${prefix}*`, "COUNT", 200);
      cursor = next;
      if (keys.length) await this.redis.del(...keys);
    } while (cursor !== "0");
  }
};
var NoopCache = class {
  async get() {
    return void 0;
  }
  async set() {
  }
  async delPrefix() {
  }
};

// src/infrastructure/jobs.ts
import { Queue, Worker } from "bullmq";
var InlineJobQueue = class {
  handlers = /* @__PURE__ */ new Map();
  inflight = /* @__PURE__ */ new Set();
  register(name, handler) {
    this.handlers.set(name, handler);
  }
  async enqueue(name, payload) {
    const handler = this.handlers.get(name);
    if (!handler) {
      logger.warn({ job: name }, "no handler registered for job");
      return;
    }
    const p = new Promise((resolve2) => setImmediate(resolve2)).then(() => handler(payload)).catch((err) => logger.error({ err, job: name }, "inline job failed")).finally(() => this.inflight.delete(p));
    this.inflight.add(p);
  }
  async drain() {
    while (this.inflight.size) await Promise.all([...this.inflight]);
  }
  async close() {
    await this.drain();
  }
};
var BullJobQueue = class {
  queue;
  worker = null;
  handlers = /* @__PURE__ */ new Map();
  constructor(connection, runWorker = true) {
    this.queue = new Queue("vyora", { connection });
    if (runWorker) {
      this.worker = new Worker(
        "vyora",
        async (job) => {
          const handler = this.handlers.get(job.name);
          if (handler) await handler(job.data);
        },
        { connection: connection.duplicate({ maxRetriesPerRequest: null }), concurrency: 5 }
      );
      this.worker.on("failed", (job, err) => logger.error({ err, job: job?.name }, "job failed"));
    }
  }
  register(name, handler) {
    this.handlers.set(name, handler);
  }
  async enqueue(name, payload) {
    await this.queue.add(name, payload, { attempts: 5, backoff: { type: "exponential", delay: 2e3 }, removeOnComplete: 1e3 });
  }
  async drain() {
  }
  async close() {
    await this.worker?.close();
    await this.queue.close();
  }
};

// src/infrastructure/messaging/channels.ts
import nodemailer from "nodemailer";
var ConsoleEmailChannel = class {
  name = "console";
  async send(msg) {
    logger.info({ to: msg.to, subject: msg.subject }, `\u2709\uFE0F  [dev-mail] ${msg.subject}
${msg.text}`);
  }
};
var SmtpEmailChannel = class {
  constructor(env2) {
    this.env = env2;
    this.transport = nodemailer.createTransport({
      host: env2.SMTP_HOST,
      port: env2.SMTP_PORT,
      secure: env2.SMTP_PORT === 465,
      auth: env2.SMTP_USER ? { user: env2.SMTP_USER, pass: env2.SMTP_PASSWORD } : void 0
    });
  }
  env;
  name = "smtp";
  transport;
  async send(msg) {
    await this.transport.sendMail({ from: this.env.EMAIL_FROM, ...msg });
  }
};
var ConsoleSmsChannel = class {
  name = "console";
  async send(msg) {
    logger.info({ to: msg.to }, `\u{1F4F1} [dev-sms] ${msg.text}`);
  }
};
var ConsoleWhatsAppChannel = class {
  name = "console";
  async send(msg) {
    logger.info({ to: msg.to, template: msg.template }, "\u{1F4AC} [dev-whatsapp] message");
  }
};
function createChannels(env2) {
  return {
    email: env2.EMAIL_PROVIDER === "smtp" ? new SmtpEmailChannel(env2) : new ConsoleEmailChannel(),
    sms: new ConsoleSmsChannel(),
    whatsapp: new ConsoleWhatsAppChannel()
  };
}

// src/infrastructure/storage/local.ts
import { createReadStream } from "fs";
import { mkdir, stat, unlink, writeFile } from "fs/promises";
import { dirname, extname, isAbsolute, join, resolve } from "path";

// src/shared/crypto.ts
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
var sha256 = (value) => createHash("sha256").update(value).digest("hex");
var randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
var hmac = (secret, value) => createHmac("sha256", secret).update(value).digest("base64url");
var ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function randomCode(length) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}
function referenceNumber(prefix, date = /* @__PURE__ */ new Date()) {
  const y = String(date.getUTCFullYear()).slice(2);
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${prefix}${y}${m}${d}-${randomCode(6)}`;
}

// src/infrastructure/storage/storage.ts
var CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".csv": "text/csv",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
};
var EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
  "text/csv": ".csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx"
};
function assertSafeKey(key) {
  if (!/^[A-Za-z0-9][A-Za-z0-9/_.-]{0,400}$/.test(key) || key.includes("..") || key.includes("//")) {
    throw new Error("Invalid storage key");
  }
}

// src/infrastructure/storage/local.ts
var LocalStorageProvider = class {
  constructor(uploadDir, signingSecret) {
    this.signingSecret = signingSecret;
    this.root = isAbsolute(uploadDir) ? uploadDir : resolve(process.cwd(), uploadDir);
  }
  signingSecret;
  name = "local";
  root;
  pathFor(key, visibility) {
    assertSafeKey(key);
    return join(this.root, visibility, key);
  }
  async put(key, data, _contentType, visibility) {
    const p = this.pathFor(key, visibility);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, data);
    return { key, url: visibility === "public" ? this.publicUrl(key) : `/files/private/${key}` };
  }
  async get(key, visibility) {
    const p = this.pathFor(key, visibility);
    try {
      const s2 = await stat(p);
      if (!s2.isFile()) return null;
    } catch {
      return null;
    }
    return {
      stream: createReadStream(p),
      contentType: CONTENT_TYPES[extname(p).toLowerCase()] ?? "application/octet-stream"
    };
  }
  async delete(key, visibility) {
    try {
      await unlink(this.pathFor(key, visibility));
    } catch {
    }
  }
  publicUrl(key) {
    return `/uploads/${key}`;
  }
  async signedUrl(key, ttlSeconds2) {
    const exp = Math.floor(Date.now() / 1e3) + ttlSeconds2;
    const sig = hmac(this.signingSecret, `${key}:${exp}`);
    return `/files/private/${key}?exp=${exp}&sig=${sig}`;
  }
  verifySignature(key, exp, sig) {
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1e3)) return false;
    return hmac(this.signingSecret, `${key}:${exp}`) === sig;
  }
};

// src/infrastructure/storage/s3.ts
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
var S3StorageProvider = class {
  constructor(env2) {
    this.env = env2;
    this.bucket = env2.AWS_S3_BUCKET;
    this.client = new S3Client({
      region: env2.AWS_REGION,
      endpoint: env2.AWS_S3_ENDPOINT || void 0,
      forcePathStyle: Boolean(env2.AWS_S3_ENDPOINT),
      credentials: env2.AWS_ACCESS_KEY_ID && env2.AWS_SECRET_ACCESS_KEY ? { accessKeyId: env2.AWS_ACCESS_KEY_ID, secretAccessKey: env2.AWS_SECRET_ACCESS_KEY } : void 0
    });
  }
  env;
  name = "s3";
  client;
  bucket;
  objectKey(key, visibility) {
    assertSafeKey(key);
    return `${visibility}/${key}`;
  }
  async put(key, data, contentType, visibility) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.objectKey(key, visibility),
        Body: data,
        ContentType: contentType,
        CacheControl: visibility === "public" ? "public, max-age=31536000, immutable" : "private, no-store"
      })
    );
    return { key, url: visibility === "public" ? this.publicUrl(key) : `/files/private/${key}` };
  }
  async get(key, visibility) {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: this.objectKey(key, visibility) }));
      return { stream: res.Body, contentType: res.ContentType ?? "application/octet-stream" };
    } catch {
      return null;
    }
  }
  async delete(key, visibility) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: this.objectKey(key, visibility) }));
  }
  publicUrl(key) {
    const base = this.env.AWS_S3_PUBLIC_URL || `https://${this.bucket}.s3.${this.env.AWS_REGION}.amazonaws.com`;
    return `${base.replace(/\/$/, "")}/public/${key}`;
  }
  signedUrl(key, ttlSeconds2) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: this.objectKey(key, "private") }), {
      expiresIn: ttlSeconds2
    });
  }
};

// src/infrastructure/storage/images.ts
import { randomUUID } from "crypto";
import sharp from "sharp";
async function storeOptimizedImage(storage, folder, buffer, mimeType) {
  const base = `${folder}/${(/* @__PURE__ */ new Date()).toISOString().slice(0, 7)}/${randomUUID()}`;
  if (mimeType === "image/gif") {
    const key2 = `${base}${EXTENSIONS["image/gif"]}`;
    const obj2 = await storage.put(key2, buffer, mimeType, "public");
    return { key: key2, url: obj2.url, thumbUrl: obj2.url };
  }
  const img = sharp(buffer, { failOn: "error" }).rotate();
  const [large, small] = await Promise.all([
    img.clone().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
    img.clone().resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer()
  ]);
  const key = `${base}.webp`;
  const [obj, thumb] = await Promise.all([
    storage.put(key, large, "image/webp", "public"),
    storage.put(`${base}-sm.webp`, small, "image/webp", "public")
  ]);
  return { key, url: obj.url, thumbUrl: thumb.url };
}

// src/infrastructure/storage/index.ts
function createStorage(env2) {
  if (env2.STORAGE_PROVIDER === "s3") return new S3StorageProvider(env2);
  return new LocalStorageProvider(env2.LOCAL_UPLOAD_DIR, env2.FILE_SIGNING_SECRET ?? env2.JWT_ACCESS_SECRET);
}

// src/modules/analytics/analytics.service.ts
import ExcelJS from "exceljs";
import { stringify } from "csv-stringify/sync";
var n = (v) => v === null || v === void 0 ? 0 : Number(v);
var r2 = (v) => Math.round(v * 100) / 100;
function tzOffsetMinutes(timeZone, at = /* @__PURE__ */ new Date()) {
  const local = new Date(at.toLocaleString("en-US", { timeZone }));
  const utc = new Date(at.toLocaleString("en-US", { timeZone: "UTC" }));
  return Math.round((local.getTime() - utc.getTime()) / 6e4);
}
var AnalyticsService = class {
  constructor(db2, finance, products, timeZone = "Asia/Kolkata") {
    this.db = db2;
    this.finance = finance;
    this.products = products;
    this.timeZone = timeZone;
  }
  db;
  finance;
  products;
  timeZone;
  /** Calendar day (YYYY-MM-DD) in the marketplace timezone. */
  localDay(d, offset) {
    return new Date(d.getTime() + offset * 6e4).toISOString().slice(0, 10);
  }
  async adminDashboard(range) {
    const { from, to } = range;
    const [orderAgg] = await this.db.$queryRaw`
      SELECT COUNT(*) AS orders,
             COALESCE(SUM(grandTotal), 0) AS gmv,
             SUM(status = 'CANCELLED') AS cancelled,
             COUNT(DISTINCT customerId) AS buyers
      FROM \`Order\` WHERE placedAt BETWEEN ${from} AND ${to}`;
    const [itemAgg] = await this.db.$queryRaw`
      SELECT COALESCE(SUM(oi.lineTotal * (oi.quantity - oi.cancelledQuantity) / oi.quantity), 0) AS netValue,
             COALESCE(SUM(CASE WHEN so.status = 'DELIVERED' THEN oi.lineTotal * (oi.quantity - oi.cancelledQuantity) / oi.quantity ELSE 0 END), 0) AS deliveredValue,
             COALESCE(SUM(oi.commissionAmount * (oi.quantity - oi.cancelledQuantity) / oi.quantity), 0) AS commissionAccrued,
             COALESCE(SUM(CASE WHEN so.status = 'DELIVERED' THEN oi.quantity - oi.cancelledQuantity ELSE 0 END), 0) AS deliveredUnits,
             COALESCE(SUM(oi.returnedQuantity), 0) AS returnedUnits
      FROM \`OrderItem\` oi JOIN \`SellerOrder\` so ON so.id = oi.sellerOrderId
      JOIN \`Order\` o ON o.id = oi.orderId
      WHERE o.placedAt BETWEEN ${from} AND ${to}`;
    const [payAgg] = await this.db.$queryRaw`
      SELECT COALESCE(SUM(p.collected), 0) AS collected,
             COALESCE(SUM(CASE WHEN p.status = 'COD_PENDING' THEN p.amount - p.collected ELSE 0 END), 0) AS codOutstanding
      FROM \`Payment\` p JOIN \`Order\` o ON o.id = p.orderId WHERE o.placedAt BETWEEN ${from} AND ${to}`;
    const [refundAgg] = await this.db.$queryRaw`
      SELECT COALESCE(SUM(CASE WHEN status = 'PROCESSED' THEN amount ELSE 0 END), 0) AS refunded,
             COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) AS refundPending
      FROM \`Refund\` WHERE createdAt BETWEEN ${from} AND ${to}`;
    const [ledgerAgg] = await this.db.$queryRaw`
      SELECT COALESCE(-SUM(CASE WHEN type = 'COMMISSION_DEBIT' THEN amount ELSE 0 END), 0) AS commissionEarned,
             COALESCE(SUM(CASE WHEN type = 'COMMISSION_REVERSAL_CREDIT' THEN amount ELSE 0 END), 0) AS commissionReversed
      FROM \`SellerLedger\` WHERE createdAt BETWEEN ${from} AND ${to}`;
    const [customers, newCustomers, activeSellers, pendingSellers, pendingProducts, lowStock, outstanding] = await Promise.all([
      this.db.user.count({ where: { deletedAt: null, roles: { some: { role: { code: "CUSTOMER" } } }, seller: null } }),
      this.db.user.count({ where: { createdAt: { gte: from, lte: to }, seller: null } }),
      this.db.seller.count({ where: { status: "APPROVED", deletedAt: null } }),
      this.db.seller.count({ where: { status: "PENDING_APPROVAL", deletedAt: null } }),
      this.db.product.count({ where: { status: "PENDING_REVIEW", deletedAt: null } }),
      this.db.$queryRaw`SELECT COUNT(*) AS c FROM \`Inventory\` WHERE quantity - reserved <= lowStockThreshold`,
      this.finance.outstanding()
    ]);
    const orders = n(orderAgg.orders);
    const cancelled = n(orderAgg.cancelled);
    const nonCancelled = orders - cancelled;
    const deliveredUnits = n(itemAgg.deliveredUnits);
    return {
      range,
      kpis: {
        gmv: r2(n(orderAgg.gmv)),
        netOrderValue: r2(n(itemAgg.netValue)),
        deliveredValue: r2(n(itemAgg.deliveredValue)),
        collectedRevenue: r2(n(payAgg.collected)),
        codOutstanding: r2(n(payAgg.codOutstanding)),
        refunds: r2(n(refundAgg.refunded)),
        refundsPending: r2(n(refundAgg.refundPending)),
        commissionAccrued: r2(n(itemAgg.commissionAccrued)),
        commissionEarned: r2(n(ledgerAgg.commissionEarned)),
        orders,
        cancelledOrders: cancelled,
        averageOrderValue: nonCancelled ? r2(n(itemAgg.netValue) / nonCancelled) : 0,
        cancellationRate: orders ? r2(cancelled / orders * 100) : 0,
        returnRate: deliveredUnits ? r2(n(itemAgg.returnedUnits) / deliveredUnits * 100) : 0,
        buyers: n(orderAgg.buyers),
        totalCustomers: customers,
        newCustomers,
        activeSellers,
        pendingSellerApprovals: pendingSellers,
        pendingProductApprovals: pendingProducts,
        lowStockListings: n(lowStock[0]?.c),
        outstandingSettlements: r2(outstanding.reduce((s2, o) => s2 + o.available, 0))
      },
      salesByDay: await this.salesByDay(range),
      topProducts: await this.topProducts(range, null, 8),
      topSellers: await this.topSellers(range, 8),
      categorySales: await this.categorySales(range),
      orderStatus: await this.db.order.groupBy({ by: ["status"], where: { placedAt: { gte: from, lte: to } }, _count: { _all: true } }).then((rows) => rows.map((r) => ({ status: r.status, count: r._count._all }))),
      paymentStatus: await this.db.order.groupBy({ by: ["paymentStatus"], where: { placedAt: { gte: from, lte: to } }, _count: { _all: true }, _sum: { grandTotal: true } }).then((rows) => rows.map((r) => ({ status: r.paymentStatus, count: r._count._all, amount: n(r._sum.grandTotal) })))
    };
  }
  /** Daily series bucketed by the marketplace's local calendar day (not UTC). */
  async salesByDay(range, sellerId = null) {
    const offset = tzOffsetMinutes(this.timeZone, range.to);
    const rows = await this.db.$queryRaw`
      SELECT DATE_FORMAT(DATE_ADD(o.placedAt, INTERVAL ${offset} MINUTE), '%Y-%m-%d') AS day,
             COUNT(DISTINCT oi.sellerOrderId) AS orders,
             COALESCE(SUM(oi.lineTotal * (oi.quantity - oi.cancelledQuantity) / oi.quantity), 0) AS value,
             COALESCE(SUM(oi.quantity - oi.cancelledQuantity), 0) AS units
      FROM \`OrderItem\` oi JOIN \`Order\` o ON o.id = oi.orderId
      WHERE o.placedAt BETWEEN ${range.from} AND ${range.to} AND (${sellerId} IS NULL OR oi.sellerId = ${sellerId})
      GROUP BY day ORDER BY day`;
    const map = new Map(rows.map((r) => [r.day, r]));
    const out = [];
    const last = this.localDay(range.to, offset);
    for (let key = this.localDay(range.from, offset); key <= last; key = new Date(Date.parse(`${key}T00:00:00Z`) + 864e5).toISOString().slice(0, 10)) {
      const row = map.get(key);
      out.push({ day: key, orders: n(row?.orders), value: r2(n(row?.value)), units: n(row?.units) });
    }
    return out;
  }
  async topProducts(range, sellerId, limit) {
    const rows = await this.db.$queryRaw`
      SELECT oi.productId AS productId, MAX(oi.productName) AS name,
             SUM(oi.quantity - oi.cancelledQuantity) AS units,
             SUM(oi.lineTotal * (oi.quantity - oi.cancelledQuantity) / oi.quantity) AS value
      FROM \`OrderItem\` oi JOIN \`Order\` o ON o.id = oi.orderId
      WHERE o.placedAt BETWEEN ${range.from} AND ${range.to} AND (${sellerId} IS NULL OR oi.sellerId = ${sellerId})
      GROUP BY oi.productId HAVING units > 0 ORDER BY units DESC LIMIT ${limit}`;
    return rows.map((r) => ({ productId: r.productId, name: r.name, units: n(r.units), value: r2(n(r.value)) }));
  }
  async topSellers(range, limit) {
    const rows = await this.db.$queryRaw`
      SELECT oi.sellerId AS sellerId, MAX(oi.sellerName) AS name, COUNT(DISTINCT oi.sellerOrderId) AS orders,
             SUM(oi.lineTotal * (oi.quantity - oi.cancelledQuantity) / oi.quantity) AS value,
             SUM(oi.commissionAmount * (oi.quantity - oi.cancelledQuantity) / oi.quantity) AS commission
      FROM \`OrderItem\` oi JOIN \`Order\` o ON o.id = oi.orderId
      WHERE o.placedAt BETWEEN ${range.from} AND ${range.to}
      GROUP BY oi.sellerId ORDER BY value DESC LIMIT ${limit}`;
    return rows.map((r) => ({ sellerId: r.sellerId, name: r.name, orders: n(r.orders), value: r2(n(r.value)), commission: r2(n(r.commission)) }));
  }
  async categorySales(range) {
    const rows = await this.db.$queryRaw`
      SELECT c.id AS categoryId, c.name AS name, SUM(oi.quantity - oi.cancelledQuantity) AS units,
             SUM(oi.lineTotal * (oi.quantity - oi.cancelledQuantity) / oi.quantity) AS value
      FROM \`OrderItem\` oi JOIN \`Order\` o ON o.id = oi.orderId JOIN \`Category\` c ON c.id = oi.categoryId
      WHERE o.placedAt BETWEEN ${range.from} AND ${range.to}
      GROUP BY c.id, c.name ORDER BY value DESC LIMIT 12`;
    return rows.map((r) => ({ categoryId: r.categoryId, name: r.name, units: n(r.units), value: r2(n(r.value)) }));
  }
  /** Seller dashboard — every figure is filtered by the authenticated seller's id. */
  async sellerDashboard(sellerId, range) {
    const [productCounts, activeListings, outOfStock2, orderCounts, balances, recent] = await Promise.all([
      this.products.statusCounts({ kind: "seller", sellerId }),
      this.db.sellerProductListing.count({ where: { sellerId, status: "APPROVED", isActive: true, deletedAt: null } }),
      this.db.$queryRaw`
        SELECT COUNT(*) AS c FROM \`Inventory\` i JOIN \`SellerProductListing\` l ON l.id = i.listingId
        WHERE i.sellerId = ${sellerId} AND l.deletedAt IS NULL AND i.quantity - i.reserved <= 0`,
      this.db.sellerOrder.groupBy({ by: ["status"], where: { sellerId }, _count: { _all: true } }),
      this.finance.balances(sellerId),
      this.db.sellerOrder.findMany({
        where: { sellerId },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, subOrderNumber: true, status: true, grandTotal: true, createdAt: true, order: { select: { shipName: true, shipCity: true } }, _count: { select: { items: true } } }
      })
    ]);
    const [rev] = await this.db.$queryRaw`
      SELECT COALESCE(SUM(CASE WHEN so.status = 'DELIVERED' THEN oi.lineSubtotal * (oi.quantity - oi.cancelledQuantity - oi.returnedQuantity) / oi.quantity ELSE 0 END), 0) AS deliveredRevenue,
             COALESCE(SUM(CASE WHEN so.status <> 'CANCELLED' THEN oi.lineSubtotal * (oi.quantity - oi.cancelledQuantity) / oi.quantity ELSE 0 END), 0) AS orderedRevenue,
             COALESCE(SUM(CASE WHEN so.status <> 'CANCELLED' THEN oi.commissionAmount * (oi.quantity - oi.cancelledQuantity) / oi.quantity ELSE 0 END), 0) AS commission
      FROM \`OrderItem\` oi JOIN \`SellerOrder\` so ON so.id = oi.sellerOrderId
      WHERE oi.sellerId = ${sellerId} AND so.createdAt BETWEEN ${range.from} AND ${range.to}`;
    const oc = Object.fromEntries(orderCounts.map((o) => [o.status, o._count._all]));
    const totalProducts = Object.values(productCounts).reduce((s2, v) => s2 + (v ?? 0), 0);
    return {
      range,
      products: {
        total: totalProducts,
        active: activeListings,
        pending: productCounts.PENDING_REVIEW ?? 0,
        draft: productCounts.DRAFT ?? 0,
        rejected: productCounts.REJECTED ?? 0,
        outOfStock: n(outOfStock2[0]?.c)
      },
      orders: {
        total: Object.values(oc).reduce((s2, v) => s2 + v, 0),
        pending: (oc.PENDING_CONFIRMATION ?? 0) + (oc.CONFIRMED ?? 0) + (oc.PROCESSING ?? 0),
        awaitingConfirmation: oc.PENDING_CONFIRMATION ?? 0,
        shipped: (oc.SHIPPED ?? 0) + (oc.OUT_FOR_DELIVERY ?? 0),
        delivered: oc.DELIVERED ?? 0,
        cancelled: oc.CANCELLED ?? 0
      },
      revenue: {
        ordered: r2(n(rev.orderedRevenue)),
        delivered: r2(n(rev.deliveredRevenue)),
        commissionAccrued: r2(n(rev.commission)),
        commissionDeducted: r2(balances.totals.commission + balances.totals.commissionTax - balances.totals.commissionReversals),
        netPayable: balances.availableForSettlement,
        balance: balances.balance,
        paidOut: balances.totals.paidOut
      },
      recentOrders: recent.map((r) => ({ ...r, grandTotal: n(r.grandTotal) })),
      salesByDay: await this.salesByDay(range, sellerId),
      topProducts: await this.topProducts(range, sellerId, 5)
    };
  }
  // ── Exports ────────────────────────────────────────────────
  async report(kind, range, sellerId) {
    switch (kind) {
      case "sales": {
        const days = await this.salesByDay(range, sellerId);
        return { columns: ["Date", "Orders", "Units", "Value (INR)"], rows: days.map((d) => [d.day, d.orders, d.units, d.value]) };
      }
      case "orders": {
        const items = await this.db.orderItem.findMany({
          where: { order: { placedAt: { gte: range.from, lte: range.to } }, ...sellerId ? { sellerId } : {} },
          include: { order: { select: { orderNumber: true, placedAt: true, paymentStatus: true, shipCity: true, shipState: true } }, sellerOrder: { select: { subOrderNumber: true, status: true } } },
          orderBy: { createdAt: "asc" },
          take: 5e4
        });
        return {
          columns: ["Order", "Sub-order", "Placed at (UTC)", "Seller", "SKU", "Product", "Qty", "Cancelled", "Returned", "Unit price", "Discount", "Shipping", "Tax", "Line total", "Commission", "Status", "Payment", "City", "State"],
          rows: items.map((i) => [
            i.order.orderNumber,
            i.sellerOrder.subOrderNumber,
            i.order.placedAt.toISOString(),
            i.sellerName,
            i.sku,
            i.productName,
            i.quantity,
            i.cancelledQuantity,
            i.returnedQuantity,
            n(i.unitPrice),
            n(i.discountAmount),
            n(i.shippingAmount),
            n(i.taxAmount),
            n(i.lineTotal),
            n(i.commissionAmount),
            i.sellerOrder.status,
            i.order.paymentStatus,
            i.order.shipCity,
            i.order.shipState
          ])
        };
      }
      case "products": {
        const top = await this.topProducts(range, sellerId, 1e3);
        return { columns: ["Product ID", "Product", "Units", "Value (INR)"], rows: top.map((t) => [t.productId, t.name, t.units, t.value]) };
      }
      case "sellers": {
        const top = await this.topSellers(range, 1e3);
        return { columns: ["Seller ID", "Seller", "Orders", "Value (INR)", "Commission (INR)"], rows: top.map((t) => [t.sellerId, t.name, t.orders, t.value, t.commission]) };
      }
      case "categories": {
        const rows = await this.categorySales(range);
        return { columns: ["Category", "Units", "Value (INR)"], rows: rows.map((r) => [r.name, r.units, r.value]) };
      }
      case "settlements": {
        const rows = await this.db.settlement.findMany({
          where: { createdAt: { gte: range.from, lte: range.to }, ...sellerId ? { sellerId } : {} },
          include: { seller: { select: { displayName: true, code: true } } },
          orderBy: { createdAt: "asc" }
        });
        return {
          columns: ["Settlement", "Seller", "Seller code", "Amount", "Status", "Reference", "Created (UTC)", "Paid (UTC)"],
          rows: rows.map((s2) => [s2.settlementNumber, s2.seller.displayName, s2.seller.code, n(s2.amount), s2.status, s2.reference ?? "", s2.createdAt.toISOString(), s2.paidAt?.toISOString() ?? ""])
        };
      }
      case "ledger": {
        const rows = await this.db.sellerLedger.findMany({
          where: { createdAt: { gte: range.from, lte: range.to }, ...sellerId ? { sellerId } : {} },
          include: { seller: { select: { displayName: true } } },
          orderBy: { createdAt: "asc" },
          take: 5e4
        });
        return {
          columns: ["Date (UTC)", "Seller", "Type", "Description", "Amount", "Balance after"],
          rows: rows.map((l) => [l.createdAt.toISOString(), l.seller.displayName, l.type, l.description, n(l.amount), n(l.balanceAfter)])
        };
      }
      default:
        throw new Error(`Unknown report: ${kind}`);
    }
  }
  async export(kind, range, sellerId, format) {
    const { columns, rows } = await this.report(kind, range, sellerId);
    const filename = `${kind}-${range.from.toISOString().slice(0, 10)}-to-${range.to.toISOString().slice(0, 10)}.${format}`;
    if (format === "csv") {
      const safe = rows.map((r) => r.map((c2) => typeof c2 === "string" && /^[=+\-@]/.test(c2) ? `'${c2}` : c2));
      return { filename, contentType: "text/csv; charset=utf-8", data: Buffer.from(stringify([columns, ...safe])) };
    }
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(kind);
    ws.addRow(columns).font = { bold: true };
    rows.forEach((r) => ws.addRow(r));
    ws.columns.forEach((c2) => c2.width = 18);
    const data = Buffer.from(await wb.xlsx.writeBuffer());
    return { filename, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", data };
  }
};

// src/modules/audit/audit.service.ts
var primaryRole = (auth) => auth ? auth.roles.includes("ADMIN") ? "ADMIN" : auth.roles.includes("SELLER") ? "SELLER" : "CUSTOMER" : null;
var AuditService = class {
  constructor(audit, security) {
    this.audit = audit;
    this.security = security;
  }
  audit;
  security;
  entry(actor, e) {
    return {
      ...e,
      actorId: actor?.auth?.userId ?? null,
      actorRole: primaryRole(actor?.auth ?? null),
      ip: actor?.ip ?? null,
      userAgent: actor?.userAgent ?? null
    };
  }
  /** Pass `tx` to write the audit row inside the caller's transaction (all-or-nothing). */
  async record(actor, e, tx) {
    const repo = tx ? new PrismaAuditRepository(tx) : this.audit;
    await repo.record(this.entry(actor, e));
  }
  securityEvent(type, data) {
    this.security.record({ type, ...data }).catch((err) => logger.error({ err }, "failed to record security event"));
  }
};

// src/modules/auth/auth.service.ts
import jwt from "jsonwebtoken";

// src/shared/errors.ts
var AppError = class extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
  status;
  code;
  details;
};
var badRequest = (message, details) => new AppError(400, "VALIDATION_ERROR", message, details);
var unauthenticated = (message = "Please sign in to continue") => new AppError(401, "UNAUTHENTICATED", message);
var forbidden = (message = "You do not have permission to perform this action") => new AppError(403, "FORBIDDEN", message);
var notFound = (what = "Resource") => new AppError(404, "NOT_FOUND", `${what} not found`);
var conflict = (message, details) => new AppError(409, "CONFLICT", message, details);
var businessRule = (message, details) => new AppError(422, "BUSINESS_RULE", message, details);
var outOfStock = (message, details) => new AppError(409, "OUT_OF_STOCK", message, details);

// src/modules/auth/password.ts
import argon2 from "argon2";
import bcrypt from "bcryptjs";
function createPasswordHasher(kind, fast = false) {
  return {
    async hash(plain) {
      if (kind === "bcrypt") return bcrypt.hash(plain, fast ? 4 : 12);
      return argon2.hash(plain, {
        type: argon2.argon2id,
        memoryCost: fast ? 1024 : 19456,
        timeCost: fast ? 1 : 2,
        parallelism: 1
      });
    },
    async verify(hash2, plain) {
      try {
        if (hash2.startsWith("$argon2")) return await argon2.verify(hash2, plain);
        if (hash2.startsWith("$2")) return await bcrypt.compare(plain, hash2);
        return false;
      } catch {
        return false;
      }
    }
  };
}
var DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8.m7qT9ZcU6W2yYtVlm9vP0p6uYl2e";

// src/modules/auth/auth.service.ts
var ISSUER = "vyora-api";
var AUDIENCE = "vyora";
function ttlSeconds(ttl) {
  const m = /^(\d+)\s*([smhd])$/.exec(ttl.trim());
  if (!m) return 900;
  return Number(m[1]) * { s: 1, m: 60, h: 3600, d: 86400 }[m[2]];
}
var principalInclude = {
  roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
  seller: { select: { id: true, status: true, businessName: true, slug: true } }
};
var AuthService = class {
  constructor(db2, env2, hasher, audit, notifications) {
    this.db = db2;
    this.env = env2;
    this.hasher = hasher;
    this.audit = audit;
    this.notifications = notifications;
    this.accessTtl = ttlSeconds(env2.ACCESS_TOKEN_TTL);
  }
  db;
  env;
  hasher;
  audit;
  notifications;
  principalCache = /* @__PURE__ */ new Map();
  accessTtl;
  hashPassword(plain) {
    return this.hasher.hash(plain);
  }
  // ── Sessions ─────────────────────────────────────────────
  signAccess(userId, sessionId) {
    return jwt.sign({ sid: sessionId }, this.env.JWT_ACCESS_SECRET, {
      subject: userId,
      expiresIn: this.accessTtl,
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithm: "HS256"
    });
  }
  async createRefresh(userId, familyId, meta) {
    const token = randomToken(48);
    const row = await this.db.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: sha256(`${this.env.JWT_REFRESH_SECRET}:${token}`),
        expiresAt: new Date(Date.now() + this.env.REFRESH_TOKEN_TTL_DAYS * 864e5),
        ip: meta.ip,
        userAgent: meta.userAgent
      }
    });
    return { token, row };
  }
  async issueSession(userId, meta, familyId = randomToken(16)) {
    const { token } = await this.createRefresh(userId, familyId, meta);
    return {
      accessToken: this.signAccess(userId, familyId),
      refreshToken: token,
      accessMaxAgeSeconds: this.accessTtl,
      refreshMaxAgeSeconds: this.env.REFRESH_TOKEN_TTL_DAYS * 86400,
      userId
    };
  }
  /** Rotate a refresh token. Re-use of an already-rotated token revokes the whole session family. */
  async refresh(token, meta) {
    const tokenHash = sha256(`${this.env.JWT_REFRESH_SECRET}:${token}`);
    const existing = await this.db.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!existing) throw unauthenticated("Your session has expired. Please sign in again.");
    if (existing.revokedAt) {
      await this.db.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: /* @__PURE__ */ new Date() }
      });
      this.audit.securityEvent("REFRESH_TOKEN_REUSE", { userId: existing.userId, ip: meta.ip, userAgent: meta.userAgent });
      this.invalidatePrincipal(existing.userId);
      throw unauthenticated("Your session has expired. Please sign in again.");
    }
    if (existing.expiresAt < /* @__PURE__ */ new Date() || existing.user.status !== "ACTIVE") {
      throw unauthenticated("Your session has expired. Please sign in again.");
    }
    const next = await this.createRefresh(existing.userId, existing.familyId, meta);
    const rotated = await this.db.refreshToken.updateMany({
      where: { id: existing.id, revokedAt: null },
      data: { revokedAt: /* @__PURE__ */ new Date(), replacedById: next.row.id }
    });
    if (rotated.count === 0) {
      await this.db.refreshToken.delete({ where: { id: next.row.id } });
      throw unauthenticated("Your session has expired. Please sign in again.");
    }
    return {
      accessToken: this.signAccess(existing.userId, existing.familyId),
      refreshToken: next.token,
      accessMaxAgeSeconds: this.accessTtl,
      refreshMaxAgeSeconds: this.env.REFRESH_TOKEN_TTL_DAYS * 86400,
      userId: existing.userId
    };
  }
  async logout(refreshToken, auth) {
    if (refreshToken) {
      const row = await this.db.refreshToken.findUnique({
        where: { tokenHash: sha256(`${this.env.JWT_REFRESH_SECRET}:${refreshToken}`) }
      });
      if (row) {
        await this.db.refreshToken.updateMany({ where: { familyId: row.familyId, revokedAt: null }, data: { revokedAt: /* @__PURE__ */ new Date() } });
      }
    }
    if (auth) {
      await this.db.refreshToken.updateMany({ where: { familyId: auth.sessionId, revokedAt: null }, data: { revokedAt: /* @__PURE__ */ new Date() } });
      this.invalidatePrincipal(auth.userId);
    }
  }
  async revokeAllSessions(userId) {
    await this.db.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: /* @__PURE__ */ new Date() } });
    this.invalidatePrincipal(userId);
  }
  // ── Principal resolution (called on every authenticated request) ─────────
  async resolveAuth(token) {
    let payload;
    try {
      payload = jwt.verify(token, this.env.JWT_ACCESS_SECRET, {
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithms: ["HS256"]
      });
    } catch {
      return null;
    }
    const userId = payload.sub;
    const sessionId = payload.sid;
    if (!userId || !sessionId) return null;
    const cacheKey = `${userId}:${sessionId}`;
    const cached = this.principalCache.get(cacheKey);
    if (cached && Date.now() - cached.at < 1e4) return cached.ctx;
    const [user, liveSession] = await Promise.all([
      this.db.user.findUnique({ where: { id: userId }, include: principalInclude }),
      this.db.refreshToken.findFirst({
        where: { familyId: sessionId, userId, revokedAt: null, expiresAt: { gt: /* @__PURE__ */ new Date() } },
        select: { id: true }
      })
    ]);
    if (!user || !liveSession || user.deletedAt || !["ACTIVE", "DELETION_REQUESTED"].includes(user.status)) return null;
    const roles = user.roles.map((r) => r.role.code);
    const permissions = /* @__PURE__ */ new Set();
    for (const r of user.roles) for (const p of r.role.permissions) permissions.add(p.permission.code);
    const ctx = {
      userId: user.id,
      sessionId,
      email: user.email,
      name: user.name,
      roles,
      permissions,
      sellerId: user.seller?.id ?? null,
      sellerStatus: user.seller?.status ?? null
    };
    if (this.principalCache.size > 1e4) this.principalCache.clear();
    this.principalCache.set(cacheKey, { ctx, at: Date.now() });
    return ctx;
  }
  invalidatePrincipal(userId) {
    for (const key of this.principalCache.keys()) if (key.startsWith(`${userId}:`)) this.principalCache.delete(key);
  }
  async sessionUser(userId) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId }, include: principalInclude });
    const permissions = /* @__PURE__ */ new Set();
    for (const r of user.roles) for (const p of r.role.permissions) permissions.add(p.permission.code);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      emailVerified: Boolean(user.emailVerifiedAt),
      roles: user.roles.map((r) => r.role.code),
      permissions: [...permissions],
      seller: user.seller
    };
  }
  // ── Registration & login ─────────────────────────────────
  async assertEmailAvailable(email, phone) {
    const existing = await this.db.user.findFirst({
      where: { OR: [{ email }, ...phone ? [{ phone }] : []] },
      select: { email: true }
    });
    if (existing) {
      throw conflict(
        existing.email === email ? "An account with this email already exists" : "This phone number is already registered"
      );
    }
  }
  async registerCustomer(input, meta) {
    await this.assertEmailAvailable(input.email, input.phone);
    const role = await this.db.role.findUniqueOrThrow({ where: { code: "CUSTOMER" } });
    const user = await this.db.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        passwordHash: await this.hasher.hash(input.password),
        roles: { create: [{ roleId: role.id }] },
        customerProfile: { create: {} }
      }
    });
    await this.sendVerificationEmail(user.id);
    void this.notifications.notify({ key: "auth.welcome", userId: user.id, link: "/" });
    this.audit.securityEvent("USER_REGISTERED", { userId: user.id, email: user.email, ip: meta.ip, userAgent: meta.userAgent });
    return this.issueSession(user.id, meta);
  }
  async login(email, password, meta) {
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || user.deletedAt || user.status === "DELETED") {
      await this.hasher.verify(DUMMY_HASH, password);
      this.audit.securityEvent("LOGIN_FAILED", { email, ip: meta.ip, userAgent: meta.userAgent, details: { reason: "unknown_user" } });
      throw new AppError(401, "INVALID_CREDENTIALS", "Incorrect email or password");
    }
    if (user.lockedUntil && user.lockedUntil > /* @__PURE__ */ new Date()) {
      this.audit.securityEvent("LOGIN_BLOCKED_LOCKED", { userId: user.id, email, ip: meta.ip });
      throw new AppError(
        423,
        "ACCOUNT_LOCKED",
        `Too many failed attempts. Try again after ${user.lockedUntil.toLocaleTimeString("en-IN", { timeZone: this.env.DEFAULT_TIMEZONE })}.`
      );
    }
    const valid = await this.hasher.verify(user.passwordHash, password);
    if (!valid) {
      const failed = user.failedLoginCount + 1;
      const lock = failed >= this.env.LOGIN_MAX_ATTEMPTS;
      await this.db.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: lock ? 0 : failed,
          lockedUntil: lock ? new Date(Date.now() + this.env.LOGIN_LOCK_MINUTES * 6e4) : void 0
        }
      });
      this.audit.securityEvent(lock ? "ACCOUNT_LOCKED" : "LOGIN_FAILED", {
        userId: user.id,
        email,
        ip: meta.ip,
        userAgent: meta.userAgent,
        details: { attempts: failed }
      });
      throw new AppError(401, "INVALID_CREDENTIALS", "Incorrect email or password");
    }
    if (user.status === "SUSPENDED") {
      throw new AppError(403, "FORBIDDEN", "This account has been suspended. Please contact support.");
    }
    await this.db.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: /* @__PURE__ */ new Date() }
    });
    this.audit.securityEvent("LOGIN_SUCCESS", { userId: user.id, email, ip: meta.ip, userAgent: meta.userAgent });
    return this.issueSession(user.id, meta);
  }
  // ── One-time tokens (email verification, password reset, invites) ──────────
  async createOneTimeToken(userId, type, ttlMinutes) {
    const token = randomToken(32);
    await this.db.verificationToken.updateMany({ where: { userId, type, usedAt: null }, data: { usedAt: /* @__PURE__ */ new Date() } });
    await this.db.verificationToken.create({
      data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlMinutes * 6e4) }
    });
    return token;
  }
  async consumeToken(token, types) {
    const row = await this.db.verificationToken.findUnique({ where: { tokenHash: sha256(token) } });
    if (!row || !types.includes(row.type) || row.usedAt || row.expiresAt < /* @__PURE__ */ new Date()) {
      throw badRequest("This link is invalid or has expired. Please request a new one.");
    }
    const claimed = await this.db.verificationToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: /* @__PURE__ */ new Date() }
    });
    if (claimed.count === 0) throw badRequest("This link has already been used.");
    return row;
  }
  async sendVerificationEmail(userId) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.emailVerifiedAt) return;
    const token = await this.createOneTimeToken(userId, "EMAIL_VERIFY", 24 * 60);
    await this.notifications.notify({
      key: "auth.verify_email",
      userId,
      vars: { link: `${this.notifications.frontendUrl}/verify-email?token=${token}` }
    });
  }
  async verifyEmail(token) {
    const row = await this.consumeToken(token, ["EMAIL_VERIFY"]);
    await this.db.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: /* @__PURE__ */ new Date() } });
  }
  /** Always succeeds from the caller's perspective so account existence is not revealed. */
  async forgotPassword(email, meta) {
    const user = await this.db.user.findUnique({ where: { email } });
    this.audit.securityEvent("PASSWORD_RESET_REQUESTED", { userId: user?.id, email, ip: meta.ip });
    if (!user || user.status === "DELETED" || user.deletedAt) return;
    const token = await this.createOneTimeToken(user.id, "PASSWORD_RESET", 60);
    await this.notifications.notify({
      key: "auth.password_reset",
      userId: user.id,
      channels: ["EMAIL"],
      vars: { link: `${this.notifications.frontendUrl}/reset-password?token=${token}` }
    });
  }
  /** Completes both password resets and seller invitations. */
  async resetPassword(token, password, meta) {
    const row = await this.consumeToken(token, ["PASSWORD_RESET", "SELLER_INVITE"]);
    await this.db.user.update({
      where: { id: row.userId },
      data: {
        passwordHash: await this.hasher.hash(password),
        failedLoginCount: 0,
        lockedUntil: null,
        // Opening an emailed link proves control of the mailbox.
        emailVerifiedAt: /* @__PURE__ */ new Date()
      }
    });
    await this.revokeAllSessions(row.userId);
    this.audit.securityEvent("PASSWORD_RESET", { userId: row.userId, ip: meta.ip, userAgent: meta.userAgent });
    return this.issueSession(row.userId, meta);
  }
  async changePassword(userId, current, next, meta, keepSessionId) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash || !await this.hasher.verify(user.passwordHash, current)) {
      throw new AppError(400, "INVALID_CREDENTIALS", "Your current password is incorrect");
    }
    await this.db.user.update({ where: { id: userId }, data: { passwordHash: await this.hasher.hash(next) } });
    await this.db.refreshToken.updateMany({
      where: { userId, revokedAt: null, NOT: { familyId: keepSessionId } },
      data: { revokedAt: /* @__PURE__ */ new Date() }
    });
    this.invalidatePrincipal(userId);
    this.audit.securityEvent("PASSWORD_CHANGED", { userId, ip: meta.ip, userAgent: meta.userAgent });
  }
};

// src/shared/money.ts
import { Prisma as Prisma3 } from "@prisma/client";
var toPaise = (v) => {
  if (v === null || v === void 0) return 0;
  const n2 = typeof v === "object" ? Number(v.toString()) : Number(v);
  return Math.round(n2 * 100);
};
var fromPaise = (p) => Math.round(p) / 100;
var decimal = (p) => new Prisma3.Decimal(fromPaise(p).toFixed(2));
var num = (v) => v === null || v === void 0 ? 0 : fromPaise(toPaise(v));
var pct = (amount, percent) => Math.round(amount * percent / 100);
var inclusiveTax = (amount, rate) => rate > 0 ? Math.round(amount * rate / (100 + rate)) : 0;
function allocate(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (total === 0 || sum === 0) return weights.map(() => 0);
  const raw = weights.map((w) => total * w / sum);
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

// src/modules/catalog/product-indexer.ts
var purchasableListingWhere = {
  status: "APPROVED",
  isActive: true,
  deletedAt: null,
  seller: { status: "APPROVED", deletedAt: null },
  product: { status: "APPROVED", deletedAt: null },
  variant: { deletedAt: null }
};
var ProductIndexer = class {
  constructor(db2, cache) {
    this.db = db2;
    this.cache = cache;
  }
  db;
  cache;
  async refresh(productIds, db2 = this.db) {
    const ids = [...new Set(productIds)].filter(Boolean);
    for (const productId of ids) {
      const listings = await db2.sellerProductListing.findMany({
        where: { productId, ...purchasableListingWhere },
        select: { price: true, mrp: true, inventory: { select: { quantity: true, reserved: true } } }
      });
      let minPrice = null;
      let maxMrp = null;
      let maxDiscount = 0;
      let inStock = false;
      let minInStockPrice = null;
      for (const l of listings) {
        const price2 = Number(l.price);
        const mrp = Number(l.mrp);
        const available = (l.inventory?.quantity ?? 0) - (l.inventory?.reserved ?? 0);
        if (available > 0) {
          inStock = true;
          minInStockPrice = minInStockPrice === null ? price2 : Math.min(minInStockPrice, price2);
        }
        minPrice = minPrice === null ? price2 : Math.min(minPrice, price2);
        maxMrp = maxMrp === null ? mrp : Math.max(maxMrp, mrp);
        if (mrp > price2) maxDiscount = Math.max(maxDiscount, Math.round((mrp - price2) / mrp * 100));
      }
      await db2.product.update({
        where: { id: productId },
        data: {
          minPrice: minInStockPrice ?? minPrice,
          maxMrp,
          maxDiscountPct: maxDiscount,
          inStock
        }
      });
    }
    if (ids.length) await this.cache.delPrefix("home:");
  }
  async refreshForSeller(sellerId) {
    const rows = await this.db.sellerProductListing.findMany({
      where: { sellerId },
      select: { productId: true },
      distinct: ["productId"]
    });
    await this.refresh(rows.map((r) => r.productId));
  }
  /** Rebuild the full-text search document for a product. */
  async reindexSearch(productId, db2 = this.db) {
    const p = await db2.product.findUnique({
      where: { id: productId },
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true } },
        listings: { where: { deletedAt: null }, select: { sku: true, barcode: true } },
        attributeValues: { select: { value: true } },
        variants: { where: { deletedAt: null }, select: { name: true } }
      }
    });
    if (!p) return;
    const tags = Array.isArray(p.tags) ? p.tags : [];
    const parts = [
      p.title,
      p.brand?.name,
      p.category.name,
      ...tags,
      ...p.listings.flatMap((l) => [l.sku, l.barcode]),
      ...p.attributeValues.map((a) => a.value),
      ...p.variants.map((v) => v.name)
    ].filter(Boolean);
    await db2.product.update({ where: { id: productId }, data: { searchText: [...new Set(parts)].join(" ").slice(0, 6e4) } });
  }
};

// src/shared/pagination.ts
var pageArgs = (page, pageSize) => ({ skip: (page - 1) * pageSize, take: pageSize });
function paginated(items, total, page, pageSize) {
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

// src/shared/text.ts
function slugify(input) {
  return input.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 150);
}
function plainText(input) {
  if (input === null || input === void 0) return null;
  return input.replace(/<[^>]*>/g, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}
var normalizeQuery = (q) => q.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 120);

// src/modules/catalog/storefront.service.ts
var cardSelect = {
  id: true,
  slug: true,
  title: true,
  minPrice: true,
  maxMrp: true,
  maxDiscountPct: true,
  inStock: true,
  ratingAvg: true,
  ratingCount: true,
  soldCount: true,
  isFeatured: true,
  publishedAt: true,
  codAvailable: true,
  brand: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" }, take: 2, select: { url: true, storageKey: true, alt: true } }
};
var thumbOf = (img) => img ? img.storageKey && img.url.endsWith(".webp") ? img.url.replace(/\.webp$/, "-sm.webp") : img.url : null;
var STOPWORDS = /* @__PURE__ */ new Set(["the", "and", "for", "with", "from", "into", "you", "are", "was", "this", "that"]);
function booleanQuery(q) {
  const tokens = normalizeQuery(q).replace(/[+\-><()~*"@]/g, " ").split(" ").filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  return tokens.length ? tokens.map((t) => `+${t}*`).join(" ") : null;
}
var StorefrontService = class {
  constructor(db2, catalog, cache) {
    this.db = db2;
    this.catalog = catalog;
    this.cache = cache;
  }
  db;
  catalog;
  cache;
  /** Base filter: approved, live products with at least one purchasable offer. */
  liveWhere() {
    return { status: "APPROVED", deletedAt: null, minPrice: { not: null } };
  }
  async toCards(rows) {
    if (!rows.length) return [];
    const listings = await this.db.sellerProductListing.findMany({
      where: { productId: { in: rows.map((r) => r.id) }, ...purchasableListingWhere },
      select: { id: true, productId: true, price: true, variant: { select: { isDefault: true } }, inventory: { select: { quantity: true, reserved: true } } },
      orderBy: { price: "asc" }
    });
    const quick = /* @__PURE__ */ new Map();
    const variantCount = /* @__PURE__ */ new Map();
    for (const l of listings) {
      const avail = (l.inventory?.quantity ?? 0) - (l.inventory?.reserved ?? 0);
      if (!variantCount.has(l.productId)) variantCount.set(l.productId, /* @__PURE__ */ new Set());
      variantCount.get(l.productId).add(l.variant.isDefault);
      if (avail > 0 && !quick.has(l.productId)) quick.set(l.productId, { id: l.id, variants: 0 });
    }
    const weekAgo = Date.now() - 14 * 864e5;
    return rows.map((r) => {
      const price2 = num(r.minPrice);
      const mrp = Math.max(num(r.maxMrp), price2);
      const badges = [];
      if (r.isFeatured) badges.push("Featured");
      if (r.publishedAt && r.publishedAt.getTime() > weekAgo) badges.push("New");
      if (r.soldCount >= 20) badges.push("Bestseller");
      if (r.maxDiscountPct >= 30) badges.push("Hot deal");
      return {
        id: r.id,
        slug: r.slug,
        title: r.title,
        brand: r.brand?.name ?? null,
        category: r.category.name,
        imageUrl: r.images[0]?.url ?? null,
        thumbUrl: thumbOf(r.images[0]),
        hoverImageUrl: r.images[1]?.url ?? null,
        price: price2,
        mrp,
        discountPct: mrp > price2 ? Math.round((mrp - price2) / mrp * 100) : 0,
        rating: num(r.ratingAvg),
        ratingCount: r.ratingCount,
        inStock: r.inStock,
        codAvailable: r.codAvailable,
        badges,
        quickAddListingId: quick.get(r.id)?.id ?? null
      };
    });
  }
  async fulltextIds(q) {
    const bq = booleanQuery(q);
    const ranks = /* @__PURE__ */ new Map();
    if (bq) {
      const rows = await this.db.$queryRaw`
        SELECT id, MATCH(title, searchText) AGAINST (${bq} IN BOOLEAN MODE) AS score
        FROM \`Product\`
        WHERE status = 'APPROVED' AND deletedAt IS NULL AND minPrice IS NOT NULL
          AND MATCH(title, searchText) AGAINST (${bq} IN BOOLEAN MODE)
        ORDER BY score DESC LIMIT 2000`;
      rows.forEach((r, i) => ranks.set(r.id, 1e5 - i));
    }
    if (ranks.size === 0) {
      const like = `%${normalizeQuery(q).replace(/[%_\\]/g, "")}%`;
      const rows = await this.db.$queryRaw`
        SELECT id, (title LIKE ${like}) AS titleHit FROM \`Product\`
        WHERE status = 'APPROVED' AND deletedAt IS NULL AND minPrice IS NOT NULL
          AND (title LIKE ${like} OR searchText LIKE ${like})
        ORDER BY titleHit DESC, soldCount DESC LIMIT 2000`;
      rows.forEach((r, i) => ranks.set(r.id, 1e5 - i));
    }
    return ranks;
  }
  /** Product listing / search with filters, sorting, pagination and facets. */
  async list(query, opts = {}) {
    const where = this.liveWhere();
    const and = [];
    let category = null;
    if (query.category) {
      category = await this.catalog.bySlug(query.category);
      and.push({ categoryId: { in: await this.catalog.subtreeIds(category.id) } });
    }
    let ranks = null;
    if (query.q) {
      ranks = await this.fulltextIds(query.q);
      and.push({ id: { in: [...ranks.keys()] } });
    }
    const baseWhere = { ...where, AND: [...and] };
    if (query.brand) and.push({ brand: { slug: { in: query.brand.split(",").map((s2) => s2.trim()).filter(Boolean) } } });
    if (query.seller) and.push({ listings: { some: { ...purchasableListingWhere, seller: { slug: query.seller, status: "APPROVED" } } } });
    if (query.minPrice !== void 0) and.push({ minPrice: { gte: query.minPrice } });
    if (query.maxPrice !== void 0) and.push({ minPrice: { lte: query.maxPrice } });
    if (query.rating) and.push({ ratingAvg: { gte: query.rating } });
    if (query.inStock) and.push({ inStock: true });
    if (query.onSale) and.push({ maxDiscountPct: { gte: 10 } });
    if (query.attrs) {
      for (const part of query.attrs.split(";")) {
        const [code, raw] = part.split(":");
        const values2 = (raw ?? "").split("|").map((v) => v.trim()).filter(Boolean);
        if (code && values2.length) {
          and.push({ attributeValues: { some: { attribute: { code: code.trim() }, value: { in: values2 } } } });
        }
      }
    }
    const fullWhere = { ...where, AND: and };
    const sort = query.sort ?? (query.q ? "relevance" : "popular");
    const orderBy = sort === "newest" ? [{ publishedAt: "desc" }] : sort === "price_asc" ? [{ minPrice: "asc" }] : sort === "price_desc" ? [{ minPrice: "desc" }] : sort === "rating" ? [{ ratingAvg: "desc" }, { ratingCount: "desc" }] : sort === "discount" ? [{ maxDiscountPct: "desc" }] : [{ inStock: "desc" }, { soldCount: "desc" }, { ratingCount: "desc" }, { publishedAt: "desc" }];
    let rows;
    let total;
    if (sort === "relevance" && ranks) {
      const matching = await this.db.product.findMany({ where: fullWhere, select: { id: true, inStock: true } });
      matching.sort((a, b) => Number(b.inStock) - Number(a.inStock) || (ranks.get(b.id) ?? 0) - (ranks.get(a.id) ?? 0));
      total = matching.length;
      const pageIds = matching.slice((query.page - 1) * query.pageSize, query.page * query.pageSize).map((m) => m.id);
      const found = await this.db.product.findMany({ where: { id: { in: pageIds } }, select: cardSelect });
      rows = pageIds.map((id) => found.find((f) => f.id === id)).filter(Boolean);
    } else {
      [rows, total] = await Promise.all([
        this.db.product.findMany({
          where: fullWhere,
          select: cardSelect,
          orderBy,
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize
        }),
        this.db.product.count({ where: fullWhere })
      ]);
    }
    const result = paginated(await this.toCards(rows), total, query.page, query.pageSize);
    return {
      ...result,
      category: category ? { id: category.id, name: category.name, slug: category.slug, description: category.description, breadcrumbs: category.breadcrumbs, children: category.children } : null,
      facets: opts.facets ? await this.facets(baseWhere, category?.id ?? null) : void 0
    };
  }
  async facets(baseWhere, categoryId) {
    const base = await this.db.product.findMany({ where: baseWhere, select: { id: true, brandId: true }, take: 5e3 });
    const ids = base.map((b) => b.id);
    if (!ids.length) return { brands: [], price: { min: 0, max: 0 }, attributes: [] };
    const [brandCounts, priceAgg, attrValues, attrs] = await Promise.all([
      this.db.product.groupBy({ by: ["brandId"], where: { id: { in: ids }, brandId: { not: null } }, _count: { _all: true } }),
      this.db.product.aggregate({ where: { id: { in: ids } }, _min: { minPrice: true }, _max: { minPrice: true } }),
      this.db.productAttributeValue.groupBy({
        by: ["attributeId", "value"],
        where: { productId: { in: ids } },
        _count: { productId: true }
      }),
      categoryId ? this.catalog.filterableAttributes(categoryId) : this.db.productAttribute.findMany({ where: { isFilterable: true } })
    ]);
    const brands = await this.db.brand.findMany({
      where: { id: { in: brandCounts.map((b) => b.brandId).filter(Boolean) } },
      select: { id: true, name: true, slug: true }
    });
    return {
      brands: brandCounts.map((b) => ({ ...brands.find((x) => x.id === b.brandId), count: b._count._all })).filter((b) => b.slug).sort((a, b) => b.count - a.count).slice(0, 30),
      price: { min: Math.floor(num(priceAgg._min.minPrice)), max: Math.ceil(num(priceAgg._max.minPrice)) },
      attributes: attrs.filter((a) => a.isFilterable).map((a) => ({
        code: a.code,
        name: a.name,
        values: attrValues.filter((v) => v.attributeId === a.id).map((v) => ({ value: v.value, count: v._count.productId })).sort((x, y) => y.count - x.count).slice(0, 20)
      })).filter((a) => a.values.length > 0)
    };
  }
  /** Full product page: variants, offers from every seller, specs, breadcrumbs, related items. */
  async detail(slug) {
    const product = await this.db.product.findFirst({
      where: { slug, deletedAt: null, status: "APPROVED" },
      include: {
        brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
        category: { select: { id: true, name: true, slug: true, path: true } },
        images: { orderBy: { sortOrder: "asc" } },
        variants: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
        attributeValues: { where: { variantId: null }, include: { attribute: { select: { name: true, code: true } } } }
      }
    });
    if (!product) throw notFound("Product");
    const [offers, ancestors, ratingBreakdown] = await Promise.all([
      this.db.sellerProductListing.findMany({
        where: { productId: product.id, ...purchasableListingWhere },
        include: {
          inventory: { select: { quantity: true, reserved: true } },
          seller: { select: { id: true, displayName: true, slug: true, ratingAvg: true, ratingCount: true, fulfillmentMode: true, createdAt: true } }
        },
        orderBy: { price: "asc" }
      }),
      this.db.category.findMany({
        where: { id: { in: product.category.path.split("/").filter(Boolean) } },
        select: { id: true, name: true, slug: true, depth: true },
        orderBy: { depth: "asc" }
      }),
      this.db.review.groupBy({
        by: ["rating"],
        where: { productId: product.id, status: "APPROVED", deletedAt: null },
        _count: { _all: true }
      })
    ]);
    const axes = /* @__PURE__ */ new Map();
    for (const v of product.variants) {
      for (const [k, val] of Object.entries(v.options ?? {})) {
        if (!axes.has(k)) axes.set(k, /* @__PURE__ */ new Set());
        axes.get(k).add(val);
      }
    }
    void this.db.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } }).catch(() => void 0);
    return {
      id: product.id,
      slug: product.slug,
      title: product.title,
      description: product.description,
      highlights: product.highlights ?? [],
      specifications: product.specifications ?? [],
      attributes: product.attributeValues.map((a) => ({ name: a.attribute.name, code: a.attribute.code, value: a.value })),
      brand: product.brand,
      category: { id: product.category.id, name: product.category.name, slug: product.category.slug },
      breadcrumbs: ancestors,
      images: product.images.map((i) => ({ id: i.id, url: i.url, thumbUrl: thumbOf(i), alt: i.alt, variantId: i.variantId })),
      videoUrl: product.videoUrl,
      rating: num(product.ratingAvg),
      ratingCount: product.ratingCount,
      ratingBreakdown: [5, 4, 3, 2, 1].map((star) => ({ star, count: ratingBreakdown.find((r) => r.rating === star)?._count._all ?? 0 })),
      soldCount: product.soldCount,
      isReturnable: product.isReturnable,
      returnWindowDays: product.returnWindowDays,
      codAvailable: product.codAvailable,
      price: num(product.minPrice),
      mrp: num(product.maxMrp),
      inStock: product.inStock,
      axes: [...axes.entries()].map(([code, values2]) => ({ code, values: [...values2] })),
      variants: product.variants.map((v) => ({ id: v.id, name: v.name, options: v.options, isDefault: v.isDefault })),
      offers: offers.map((o) => {
        const available = (o.inventory?.quantity ?? 0) - (o.inventory?.reserved ?? 0);
        return {
          listingId: o.id,
          variantId: o.variantId,
          sku: o.sku,
          price: num(o.price),
          mrp: num(o.mrp),
          discountPct: num(o.mrp) > num(o.price) ? Math.round((num(o.mrp) - num(o.price)) / num(o.mrp) * 100) : 0,
          available: Math.max(0, available),
          inStock: available > 0,
          lowStock: available > 0 && available <= 5,
          seller: {
            id: o.seller.id,
            name: o.seller.displayName,
            slug: o.seller.slug,
            rating: num(o.seller.ratingAvg),
            ratingCount: o.seller.ratingCount,
            fulfilledBy: o.seller.fulfillmentMode,
            since: o.seller.createdAt
          }
        };
      }),
      seo: {
        title: `${product.title}${product.brand ? ` | ${product.brand.name}` : ""}`,
        description: product.description.slice(0, 160)
      }
    };
  }
  async related(productId, limit = 12) {
    const p = await this.db.product.findUnique({ where: { id: productId }, select: { categoryId: true, brandId: true } });
    if (!p) return [];
    const rows = await this.db.product.findMany({
      where: { ...this.liveWhere(), categoryId: p.categoryId, NOT: { id: productId } },
      select: cardSelect,
      orderBy: [{ soldCount: "desc" }, { ratingAvg: "desc" }],
      take: limit
    });
    return this.toCards(rows);
  }
  /** Products most often bought in the same order; falls back to same-category bestsellers. */
  async frequentlyBoughtTogether(productId, limit = 4) {
    const rows = await this.db.$queryRaw`
      SELECT oi2.productId AS productId, COUNT(*) AS c
      FROM \`OrderItem\` oi1 JOIN \`OrderItem\` oi2 ON oi1.orderId = oi2.orderId AND oi2.productId <> oi1.productId
      WHERE oi1.productId = ${productId} AND oi2.productId IS NOT NULL
      GROUP BY oi2.productId ORDER BY c DESC LIMIT 20`;
    const ids = rows.map((r) => r.productId);
    let products = ids.length ? await this.db.product.findMany({ where: { ...this.liveWhere(), id: { in: ids }, inStock: true }, select: cardSelect }) : [];
    products.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    if (products.length < limit) {
      const more = await this.related(productId, limit * 2);
      const have = new Set(products.map((p) => p.id));
      const cards = await this.toCards(products);
      return [...cards, ...more.filter((m) => !have.has(m.id) && m.inStock)].slice(0, limit);
    }
    return this.toCards(products.slice(0, limit));
  }
  // ── Search helpers ─────────────────────────────────────────
  async suggestions(q) {
    const term = normalizeQuery(q);
    if (term.length < 2) return { products: [], categories: [], brands: [], queries: [] };
    const [products, categories, brands, queries] = await Promise.all([
      this.db.product.findMany({
        where: { ...this.liveWhere(), OR: [{ title: { contains: term } }, { searchText: { contains: term } }] },
        select: { id: true, slug: true, title: true, minPrice: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true, storageKey: true } } },
        orderBy: [{ soldCount: "desc" }],
        take: 6
      }),
      this.db.category.findMany({
        where: { isActive: true, deletedAt: null, name: { contains: term } },
        select: { id: true, name: true, slug: true },
        take: 4
      }),
      this.db.brand.findMany({ where: { isActive: true, deletedAt: null, name: { contains: term } }, select: { id: true, name: true, slug: true }, take: 4 }),
      this.db.searchHistory.groupBy({
        by: ["normalized"],
        where: { normalized: { startsWith: term }, resultsCount: { gt: 0 }, createdAt: { gte: new Date(Date.now() - 60 * 864e5) } },
        _count: { _all: true },
        orderBy: { _count: { normalized: "desc" } },
        take: 5
      })
    ]);
    return {
      products: products.map((p) => ({ id: p.id, slug: p.slug, title: p.title, price: num(p.minPrice), thumbUrl: thumbOf(p.images[0]) })),
      categories,
      brands,
      queries: queries.map((qq) => qq.normalized)
    };
  }
  async recordSearch(userId, query, resultsCount) {
    const normalized = normalizeQuery(query);
    if (normalized.length < 2) return;
    await this.db.searchHistory.create({ data: { userId, query: query.slice(0, 120), normalized, resultsCount } });
  }
  async popularSearches(limit = 10) {
    const key = "search:popular";
    const cached = await this.cache.get(key);
    if (cached) return cached;
    const rows = await this.db.searchHistory.groupBy({
      by: ["normalized"],
      where: { resultsCount: { gt: 0 }, createdAt: { gte: new Date(Date.now() - 30 * 864e5) } },
      _count: { _all: true },
      orderBy: { _count: { normalized: "desc" } },
      take: limit
    });
    const result = rows.map((r) => r.normalized);
    await this.cache.set(key, result, 600);
    return result;
  }
  async recentSearches(userId, limit = 10) {
    const rows = await this.db.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { query: true, normalized: true }
    });
    const seen = /* @__PURE__ */ new Set();
    const out = [];
    for (const r of rows) {
      if (seen.has(r.normalized)) continue;
      seen.add(r.normalized);
      out.push(r.query);
      if (out.length >= limit) break;
    }
    return out;
  }
  clearSearchHistory(userId) {
    return this.db.searchHistory.deleteMany({ where: { userId } });
  }
  // ── Merchandising blocks (homepage sections) ───────────────
  async productsBy(kind, limit, categoryId) {
    const where = { ...this.liveWhere(), inStock: true };
    if (categoryId) where.categoryId = { in: await this.catalog.subtreeIds(categoryId) };
    let orderBy = [{ soldCount: "desc" }];
    switch (kind) {
      case "TRENDING":
        orderBy = [{ viewCount: "desc" }, { soldCount: "desc" }];
        break;
      case "NEW_ARRIVALS":
        orderBy = [{ publishedAt: "desc" }];
        break;
      case "ON_SALE":
        where.maxDiscountPct = { gte: 15 };
        orderBy = [{ maxDiscountPct: "desc" }];
        break;
      case "FEATURED_PRODUCTS":
        where.isFeatured = true;
        orderBy = [{ updatedAt: "desc" }];
        break;
      case "RECOMMENDED":
        orderBy = [{ ratingAvg: "desc" }, { ratingCount: "desc" }];
        break;
    }
    const rows = await this.db.product.findMany({ where, select: cardSelect, orderBy, take: limit });
    return this.toCards(rows);
  }
  /** Personalised picks from the categories the user viewed recently. */
  async recommendedFor(userId, limit = 12) {
    const recent = await this.db.recentlyViewedProduct.findMany({
      where: { userId },
      orderBy: { viewedAt: "desc" },
      take: 20,
      select: { productId: true, product: { select: { categoryId: true } } }
    });
    if (!recent.length) return this.productsBy("RECOMMENDED", limit);
    const categoryIds = [...new Set(recent.map((r) => r.product.categoryId))];
    const rows = await this.db.product.findMany({
      where: { ...this.liveWhere(), inStock: true, categoryId: { in: categoryIds }, id: { notIn: recent.map((r) => r.productId) } },
      select: cardSelect,
      orderBy: [{ ratingAvg: "desc" }, { soldCount: "desc" }],
      take: limit
    });
    return this.toCards(rows);
  }
  async featuredSellers(limit = 8) {
    const sellers = await this.db.seller.findMany({
      where: { status: "APPROVED", deletedAt: null, isFeatured: true },
      select: { id: true, displayName: true, slug: true, logoUrl: true, description: true, ratingAvg: true, ratingCount: true, _count: { select: { listings: { where: purchasableListingWhere } } } },
      take: limit
    });
    return sellers.map((s2) => ({
      id: s2.id,
      name: s2.displayName,
      slug: s2.slug,
      logoUrl: s2.logoUrl,
      description: s2.description,
      rating: num(s2.ratingAvg),
      ratingCount: s2.ratingCount,
      productCount: s2._count.listings
    }));
  }
  async sellerStore(slug) {
    const seller = await this.db.seller.findFirst({
      where: { slug, status: "APPROVED", deletedAt: null },
      select: { id: true, displayName: true, slug: true, logoUrl: true, description: true, ratingAvg: true, ratingCount: true, createdAt: true, fulfillmentMode: true }
    });
    if (!seller) throw notFound("Seller");
    return { ...seller, ratingAvg: num(seller.ratingAvg) };
  }
  /** Data for sitemap.xml */
  async sitemapEntries() {
    const [products, categories, sellers] = await Promise.all([
      this.db.product.findMany({ where: this.liveWhere(), select: { slug: true, updatedAt: true }, take: 45e3 }),
      this.db.category.findMany({ where: { isActive: true, deletedAt: null }, select: { slug: true, updatedAt: true } }),
      this.db.seller.findMany({ where: { status: "APPROVED", deletedAt: null }, select: { slug: true, updatedAt: true } })
    ]);
    return { products, categories, sellers };
  }
};

// src/modules/orders/pricing.ts
function eligible(line, coupon) {
  switch (coupon.scope) {
    case "ALL":
      return true;
    case "CATEGORY":
      return line.categoryIds.some((c2) => coupon.scopeIds.includes(c2));
    case "PRODUCT":
      return coupon.scopeIds.includes(line.productId);
    case "SELLER":
      return coupon.scopeIds.includes(line.sellerId);
  }
}
function price(input) {
  const lines = input.lines.map((l) => ({
    ...l,
    lineSubtotal: l.unitPrice * l.quantity,
    lineMrp: Math.max(l.unitMrp, l.unitPrice) * l.quantity,
    discount: 0,
    sellerFundedDiscount: 0,
    shipping: 0,
    tax: 0,
    total: 0
  }));
  const itemsSubtotal = lines.reduce((s2, l) => s2 + l.lineSubtotal, 0);
  let couponOutcome = null;
  let freeShippingSellers = /* @__PURE__ */ new Set();
  const c2 = input.coupon;
  if (c2) {
    const eligibleLines = lines.filter((l) => eligible(l, c2));
    const eligibleSubtotal = eligibleLines.reduce((s2, l) => s2 + l.lineSubtotal, 0);
    if (eligibleLines.length === 0) {
      couponOutcome = { code: c2.code, applied: false, discount: 0, shippingWaived: 0, message: "This coupon does not apply to the items in your cart" };
    } else if (eligibleSubtotal < c2.minOrderAmount) {
      couponOutcome = {
        code: c2.code,
        applied: false,
        discount: 0,
        shippingWaived: 0,
        message: `Add items worth \u20B9${((c2.minOrderAmount - eligibleSubtotal) / 100).toFixed(0)} more to use this coupon`
      };
    } else if (c2.type === "FREE_SHIPPING") {
      freeShippingSellers = new Set(eligibleLines.map((l) => l.sellerId));
      couponOutcome = { code: c2.code, applied: true, discount: 0, shippingWaived: 0, message: "Free shipping applied" };
    } else {
      let discount = c2.type === "PERCENTAGE" ? pct(eligibleSubtotal, c2.value) : Math.round(c2.value * 100);
      if (c2.maxDiscount !== null) discount = Math.min(discount, c2.maxDiscount);
      discount = Math.min(discount, eligibleSubtotal);
      const parts = allocate(discount, eligibleLines.map((l) => l.lineSubtotal));
      eligibleLines.forEach((l, i) => {
        l.discount = parts[i];
        if (c2.fundedBy === "SELLER") l.sellerFundedDiscount = parts[i];
      });
      couponOutcome = { code: c2.code, applied: true, discount, shippingWaived: 0, message: `You saved \u20B9${(discount / 100).toFixed(2).replace(/\.00$/, "")}` };
    }
  }
  const bySeller = /* @__PURE__ */ new Map();
  for (const l of lines) {
    if (!bySeller.has(l.sellerId)) bySeller.set(l.sellerId, []);
    bySeller.get(l.sellerId).push(l);
  }
  const groups = [];
  let shippingWaivedTotal = 0;
  for (const [sellerId, gl] of bySeller) {
    const groupSubtotal = gl.reduce((s2, l) => s2 + l.lineSubtotal, 0);
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
      discount: gl.reduce((s2, l) => s2 + l.discount, 0),
      shipping,
      shippingWaived: waived,
      tax: gl.reduce((s2, l) => s2 + l.tax, 0),
      total: gl.reduce((s2, l) => s2 + l.total, 0)
    });
  }
  if (couponOutcome?.applied && input.coupon?.type === "FREE_SHIPPING") {
    couponOutcome.shippingWaived = shippingWaivedTotal;
    couponOutcome.message = shippingWaivedTotal > 0 ? `Free shipping applied \u2014 you saved \u20B9${(shippingWaivedTotal / 100).toFixed(0)}` : "Your order already ships free";
  }
  const discountTotal = lines.reduce((s2, l) => s2 + l.discount, 0);
  const shippingTotal = groups.reduce((s2, g) => s2 + g.shipping, 0);
  const taxTotal = lines.reduce((s2, l) => s2 + l.tax, 0);
  const mrpTotal = lines.reduce((s2, l) => s2 + l.lineMrp, 0);
  const linesTotal = lines.reduce((s2, l) => s2 + l.total, 0);
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
    coupon: couponOutcome
  };
}
function resolveCommission(rules, ctx, defaultPercent) {
  const pick = (r) => r ? { ruleId: r.id, scope: r.scope, percentage: r.percentage, fixedPerUnit: r.fixedAmount } : null;
  const product = rules.find((r) => r.scope === "PRODUCT" && r.productId === ctx.productId);
  if (product) return pick(product);
  for (const cat of ctx.categoryLineage) {
    const sc = rules.find((r) => r.scope === "SELLER_CATEGORY" && r.sellerId === ctx.sellerId && r.categoryId === cat);
    if (sc) return pick(sc);
  }
  const seller = rules.find((r) => r.scope === "SELLER" && r.sellerId === ctx.sellerId);
  if (seller) return pick(seller);
  for (const cat of ctx.categoryLineage) {
    const cr = rules.find((r) => r.scope === "CATEGORY" && r.categoryId === cat);
    if (cr) return pick(cr);
  }
  const global = rules.find((r) => r.scope === "GLOBAL");
  if (global) return pick(global);
  return { ruleId: null, scope: "GLOBAL", percentage: defaultPercent, fixedPerUnit: 0 };
}
function commissionFor(line, rule, commissionTaxRate) {
  const base = line.lineSubtotal - line.sellerFundedDiscount;
  const commission = Math.min(base, pct(base, rule.percentage) + rule.fixedPerUnit * line.quantity);
  const commissionTax = pct(commission, commissionTaxRate);
  return { base, commission, commissionTax, sellerNet: base - commission - commissionTax };
}
function prorate(amount, part, whole) {
  if (whole <= 0) return 0;
  return Math.round(amount * part / whole);
}

// src/modules/cart/cart.service.ts
var MAX_QTY_PER_LINE = 10;
var cartItemInclude = {
  listing: {
    include: {
      inventory: { select: { quantity: true, reserved: true } },
      seller: { select: { id: true, displayName: true, slug: true, status: true, deletedAt: true, fulfillmentMode: true } },
      variant: { select: { id: true, name: true, options: true, deletedAt: true } },
      product: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          deletedAt: true,
          categoryId: true,
          codAvailable: true,
          isReturnable: true,
          returnWindowDays: true,
          hsnCode: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true, storageKey: true } }
        }
      }
    }
  }
};
function lineIssue(item) {
  const l = item.listing;
  const available = Math.max(0, (l.inventory?.quantity ?? 0) - (l.inventory?.reserved ?? 0));
  const live = l.status === "APPROVED" && l.isActive && !l.deletedAt && l.product.status === "APPROVED" && !l.product.deletedAt && l.seller.status === "APPROVED" && !l.seller.deletedAt && !l.variant.deletedAt;
  if (!live) return { purchasable: false, available, issue: "This item is no longer available" };
  if (available <= 0) return { purchasable: false, available, issue: "Out of stock" };
  if (item.quantity > available) return { purchasable: false, available, issue: `Only ${available} left in stock` };
  return { purchasable: true, available, issue: null };
}
var CartService = class {
  constructor(db2, coupons, shipping, tax, settings) {
    this.db = db2;
    this.coupons = coupons;
    this.shipping = shipping;
    this.tax = tax;
    this.settings = settings;
  }
  db;
  coupons;
  shipping;
  tax;
  settings;
  newGuestToken() {
    return randomToken(48).slice(0, 64);
  }
  whereOwner(owner) {
    return "userId" in owner ? { userId: owner.userId } : { guestToken: owner.guestToken };
  }
  async findCart(owner) {
    return this.db.cart.findFirst({ where: this.whereOwner(owner) });
  }
  async ensureCart(owner) {
    const existing = await this.findCart(owner);
    if (existing) return existing;
    return this.db.cart.create({ data: this.whereOwner(owner) });
  }
  async items(cartId, db2 = this.db) {
    return db2.cartItem.findMany({ where: { cartId }, include: cartItemInclude, orderBy: { createdAt: "asc" } });
  }
  /** Build pricing lines (with tax rates and category lineage) for purchasable items. */
  async pricingLines(items) {
    const { rates, inclusive } = await this.tax.resolve(items.map((i) => i.listing.product.categoryId));
    return {
      taxInclusive: inclusive,
      lines: items.map((i) => {
        const t = rates.get(i.listing.product.categoryId);
        return {
          key: i.listingId,
          sellerId: i.listing.sellerId,
          productId: i.listing.productId,
          categoryIds: t.lineage,
          unitPrice: toPaise(i.listing.price),
          unitMrp: toPaise(i.listing.mrp),
          quantity: i.quantity,
          taxRate: t.rate
        };
      })
    };
  }
  /**
   * Price the purchasable part of the cart. Coupon problems are reported, not thrown, so the
   * cart always renders.
   */
  async quote(items, opts) {
    const evaluated = items.map((item) => {
      const r = lineIssue(item);
      return { item, ...r, priceChanged: toPaise(item.priceAtAdd) !== toPaise(item.listing.price) };
    });
    const buyable = evaluated.filter((e) => e.purchasable).map((e) => e.item);
    const [{ lines, taxInclusive }, shippingRule, cod] = await Promise.all([
      this.pricingLines(buyable),
      this.shipping.rule(opts.shippingMethod ?? "STANDARD"),
      this.settings.get("cod")
    ]);
    let coupon = null;
    let couponError = null;
    if (opts.couponCode) {
      try {
        coupon = this.coupons.toPricing(await this.coupons.validate(opts.couponCode, opts.userId));
      } catch (err) {
        couponError = err instanceof AppError ? err.message : "Coupon could not be applied";
      }
    }
    const pricing = price({ lines, coupon, shipping: shippingRule, taxInclusive, codFee: toPaise(cod.fee) });
    if (pricing.coupon && !pricing.coupon.applied) couponError = pricing.coupon.message;
    return { pricing, couponError, evaluated };
  }
  /** Cart view model for the storefront. */
  async view(owner) {
    const cart = owner ? await this.findCart(owner) : null;
    const items = cart ? await this.items(cart.id) : [];
    const userId = owner && "userId" in owner ? owner.userId : null;
    const { pricing, couponError, evaluated } = await this.quote(items, { userId, couponCode: cart?.couponCode });
    return {
      id: cart?.id ?? null,
      couponCode: cart?.couponCode ?? null,
      couponError,
      itemCount: items.reduce((s2, i) => s2 + i.quantity, 0),
      items: evaluated.map((e) => this.itemView(e)),
      summary: summaryView(pricing),
      hasIssues: evaluated.some((e) => !e.purchasable)
    };
  }
  itemView(e) {
    const l = e.item.listing;
    return {
      id: e.item.id,
      listingId: l.id,
      quantity: e.item.quantity,
      maxQuantity: Math.min(MAX_QTY_PER_LINE, e.available),
      product: {
        id: l.product.id,
        slug: l.product.slug,
        title: l.product.title,
        imageUrl: thumbOf(l.product.images[0]),
        codAvailable: l.product.codAvailable,
        isReturnable: l.product.isReturnable,
        returnWindowDays: l.product.returnWindowDays
      },
      variant: { id: l.variant.id, name: l.variant.name, options: l.variant.options },
      seller: { id: l.seller.id, name: l.seller.displayName, slug: l.seller.slug },
      price: fromPaise(toPaise(l.price)),
      mrp: fromPaise(toPaise(l.mrp)),
      priceAtAdd: fromPaise(toPaise(e.item.priceAtAdd)),
      priceChanged: e.priceChanged,
      available: e.available,
      purchasable: e.purchasable,
      issue: e.issue,
      lineTotal: fromPaise(toPaise(l.price) * e.item.quantity)
    };
  }
  async add(owner, listingId, quantity) {
    const listing = await this.db.sellerProductListing.findFirst({
      where: { id: listingId, ...purchasableListingWhere },
      include: { inventory: true }
    });
    if (!listing) throw notFound("Product");
    const available = (listing.inventory?.quantity ?? 0) - (listing.inventory?.reserved ?? 0);
    if (available <= 0) throw new AppError(409, "OUT_OF_STOCK", "This item is out of stock");
    const cart = await this.ensureCart(owner);
    const existing = await this.db.cartItem.findUnique({ where: { cartId_listingId: { cartId: cart.id, listingId } } });
    const next = (existing?.quantity ?? 0) + quantity;
    if (next > MAX_QTY_PER_LINE) throw businessRule(`You can buy at most ${MAX_QTY_PER_LINE} units of an item`);
    if (next > available) throw new AppError(409, "OUT_OF_STOCK", `Only ${available} unit(s) available`);
    await this.db.cartItem.upsert({
      where: { cartId_listingId: { cartId: cart.id, listingId } },
      create: { cartId: cart.id, listingId, quantity: next, priceAtAdd: listing.price },
      update: { quantity: next }
    });
    await this.db.cart.update({ where: { id: cart.id }, data: { updatedAt: /* @__PURE__ */ new Date() } });
  }
  /** Items are always looked up through the owner's own cart — never by bare ID (anti-IDOR). */
  async ownItem(owner, itemId) {
    const cart = await this.findCart(owner);
    if (!cart) throw notFound("Cart item");
    const item = await this.db.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: cartItemInclude });
    if (!item) throw notFound("Cart item");
    return item;
  }
  async update(owner, itemId, quantity) {
    const item = await this.ownItem(owner, itemId);
    const { available } = lineIssue(item);
    if (quantity > MAX_QTY_PER_LINE) throw businessRule(`You can buy at most ${MAX_QTY_PER_LINE} units of an item`);
    if (quantity > available) throw new AppError(409, "OUT_OF_STOCK", `Only ${available} unit(s) available`);
    await this.db.cartItem.update({ where: { id: item.id }, data: { quantity, priceAtAdd: item.listing.price } });
  }
  async remove(owner, itemId) {
    const item = await this.ownItem(owner, itemId);
    await this.db.cartItem.delete({ where: { id: item.id } });
  }
  async acknowledgePrices(owner) {
    const cart = await this.findCart(owner);
    if (!cart) return;
    const items = await this.items(cart.id);
    for (const i of items) {
      if (toPaise(i.priceAtAdd) !== toPaise(i.listing.price)) {
        await this.db.cartItem.update({ where: { id: i.id }, data: { priceAtAdd: i.listing.price } });
      }
    }
  }
  async clear(owner) {
    const cart = await this.findCart(owner);
    if (cart) await this.db.cartItem.deleteMany({ where: { cartId: cart.id } });
  }
  async applyCoupon(owner, code) {
    const userId = "userId" in owner ? owner.userId : null;
    await this.coupons.validate(code, userId);
    const cart = await this.ensureCart(owner);
    await this.db.cart.update({ where: { id: cart.id }, data: { couponCode: code.toUpperCase() } });
    const view = await this.view(owner);
    if (view.couponError) {
      await this.db.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
      throw businessRule(view.couponError);
    }
    return view;
  }
  async removeCoupon(owner) {
    const cart = await this.findCart(owner);
    if (cart) await this.db.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
  }
  /** Merge a guest cart into the user's cart on sign-in (quantities add up, capped). */
  async mergeGuestCart(guestToken, userId) {
    const guest = await this.db.cart.findUnique({ where: { guestToken }, include: { items: true } });
    if (!guest) return;
    const userCart = await this.ensureCart({ userId });
    for (const gi of guest.items) {
      const existing = await this.db.cartItem.findUnique({ where: { cartId_listingId: { cartId: userCart.id, listingId: gi.listingId } } });
      const quantity = Math.min(MAX_QTY_PER_LINE, (existing?.quantity ?? 0) + gi.quantity);
      await this.db.cartItem.upsert({
        where: { cartId_listingId: { cartId: userCart.id, listingId: gi.listingId } },
        create: { cartId: userCart.id, listingId: gi.listingId, quantity, priceAtAdd: gi.priceAtAdd },
        update: { quantity }
      });
    }
    if (guest.couponCode && !userCart.couponCode) {
      await this.db.cart.update({ where: { id: userCart.id }, data: { couponCode: guest.couponCode } });
    }
    await this.db.cart.delete({ where: { id: guest.id } });
  }
};
function summaryView(p) {
  return {
    mrpTotal: fromPaise(p.mrpTotal),
    itemsSubtotal: fromPaise(p.itemsSubtotal),
    savingsOnMrp: fromPaise(p.savingsOnMrp),
    couponDiscount: fromPaise(p.discountTotal),
    shippingTotal: fromPaise(p.shippingTotal),
    codFee: fromPaise(p.codFee),
    taxTotal: fromPaise(p.taxTotal),
    grandTotal: fromPaise(p.grandTotal),
    totalSavings: fromPaise(p.savingsOnMrp + p.discountTotal + (p.coupon?.shippingWaived ?? 0)),
    coupon: p.coupon ? { ...p.coupon, discount: fromPaise(p.coupon.discount), shippingWaived: fromPaise(p.coupon.shippingWaived) } : null,
    groups: p.groups.map((g) => ({
      sellerId: g.sellerId,
      itemsSubtotal: fromPaise(g.itemsSubtotal),
      discount: fromPaise(g.discount),
      shipping: fromPaise(g.shipping),
      shippingWaived: g.shippingWaived,
      tax: fromPaise(g.tax),
      total: fromPaise(g.total)
    }))
  };
}

// src/modules/catalog/category.service.ts
var CatalogService = class {
  constructor(db2, cache, audit) {
    this.db = db2;
    this.cache = cache;
    this.audit = audit;
  }
  db;
  cache;
  audit;
  async uniqueSlug(model, base, excludeId) {
    const root = slugify(base) || "item";
    for (let i = 0; i < 50; i++) {
      const slug = i === 0 ? root : `${root}-${i + 1}`;
      const existing = model === "category" ? await this.db.category.findUnique({ where: { slug }, select: { id: true } }) : await this.db.brand.findUnique({ where: { slug }, select: { id: true } });
      if (!existing || existing.id === excludeId) return slug;
    }
    return `${root}-${Date.now().toString(36)}`;
  }
  // ── Categories ─────────────────────────────────────────────
  async tree(opts = {}) {
    const key = `categories:tree:${opts.includeInactive ? "all" : "active"}`;
    const cached = await this.cache.get(key);
    if (cached) return cached;
    const rows = await this.db.category.findMany({
      where: { deletedAt: null, ...opts.includeInactive ? {} : { isActive: true } },
      orderBy: [{ depth: "asc" }, { sortOrder: "asc" }, { name: "asc" }]
    });
    const counts = await this.db.product.groupBy({
      by: ["categoryId"],
      where: { status: "APPROVED", deletedAt: null, minPrice: { not: null } },
      _count: { _all: true }
    });
    const countMap = new Map(counts.map((c2) => [c2.categoryId, c2._count._all]));
    const nodes = /* @__PURE__ */ new Map();
    const roots = [];
    for (const r of rows) {
      nodes.set(r.id, {
        id: r.id,
        name: r.name,
        slug: r.slug,
        icon: r.icon,
        imageUrl: r.imageUrl,
        description: r.description,
        sortOrder: r.sortOrder,
        isActive: r.isActive,
        depth: r.depth,
        parentId: r.parentId,
        productCount: countMap.get(r.id) ?? 0,
        children: []
      });
    }
    for (const n2 of nodes.values()) {
      if (n2.parentId && nodes.has(n2.parentId)) nodes.get(n2.parentId).children.push(n2);
      else if (!n2.parentId) roots.push(n2);
    }
    const roll = (n2) => {
      n2.productCount = (n2.productCount ?? 0) + n2.children.reduce((s2, c2) => s2 + roll(c2), 0);
      return n2.productCount;
    };
    roots.forEach(roll);
    await this.cache.set(key, roots, 300);
    return roots;
  }
  async bySlug(slug) {
    const cat = await this.db.category.findFirst({ where: { slug, deletedAt: null, isActive: true } });
    if (!cat) throw notFound("Category");
    const ancestorIds = cat.path.split("/").filter((id) => id && id !== cat.id);
    const [ancestors, children, attributes] = await Promise.all([
      this.db.category.findMany({ where: { id: { in: ancestorIds } }, select: { id: true, name: true, slug: true, depth: true } }),
      this.db.category.findMany({
        where: { parentId: cat.id, deletedAt: null, isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, slug: true, icon: true, imageUrl: true }
      }),
      this.filterableAttributes(cat.id)
    ]);
    return {
      ...cat,
      breadcrumbs: [...ancestors.sort((a, b) => a.depth - b.depth), { id: cat.id, name: cat.name, slug: cat.slug, depth: cat.depth }],
      children,
      attributes
    };
  }
  /** Category IDs of the category and all its descendants. */
  async subtreeIds(categoryId) {
    const cat = await this.db.category.findUnique({ where: { id: categoryId }, select: { path: true } });
    if (!cat) return [];
    const rows = await this.db.category.findMany({
      where: { path: { startsWith: cat.path }, deletedAt: null },
      select: { id: true }
    });
    return rows.map((r) => r.id);
  }
  /** Attributes applicable to a category: global ones plus those defined on the category or its ancestors. */
  async filterableAttributes(categoryId) {
    const cat = await this.db.category.findUnique({ where: { id: categoryId }, select: { path: true } });
    const lineage = cat ? cat.path.split("/").filter(Boolean) : [];
    return this.db.productAttribute.findMany({
      where: { OR: [{ categoryId: null }, { categoryId: { in: lineage } }] },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
  }
  async createCategory(input, actor) {
    const parent = input.parentId ? await this.db.category.findFirst({ where: { id: input.parentId, deletedAt: null } }) : null;
    if (input.parentId && !parent) throw notFound("Parent category");
    const slug = input.slug ?? await this.uniqueSlug("category", input.name);
    if (input.slug && await this.db.category.findUnique({ where: { slug } })) throw conflict("Slug is already in use");
    const created = await this.db.$transaction(async (tx) => {
      const c2 = await tx.category.create({
        data: {
          name: input.name,
          slug,
          parentId: parent?.id ?? null,
          depth: parent ? parent.depth + 1 : 0,
          path: "/",
          description: input.description ?? null,
          imageUrl: input.imageUrl ?? null,
          icon: input.icon ?? null,
          sortOrder: input.sortOrder,
          isActive: input.isActive
        }
      });
      const updated = await tx.category.update({ where: { id: c2.id }, data: { path: `${parent?.path ?? "/"}${c2.id}/` } });
      await this.applyCategoryConfig(tx, c2.id, input);
      await this.audit.record(actor, { action: "category.create", entityType: "Category", entityId: c2.id, after: updated }, tx);
      return updated;
    });
    await this.cache.delPrefix("categories:");
    await this.cache.delPrefix("home:");
    return created;
  }
  /** Category-level commission and tax overrides are stored in their own tables. */
  async applyCategoryConfig(tx, categoryId, input) {
    if (input.commissionPercent !== void 0) {
      await tx.commissionRule.deleteMany({ where: { scope: "CATEGORY", categoryId } });
      if (input.commissionPercent !== null) {
        await tx.commissionRule.create({ data: { scope: "CATEGORY", categoryId, percentage: input.commissionPercent } });
      }
    }
    if (input.taxRate !== void 0) {
      await tx.taxConfiguration.deleteMany({ where: { categoryId } });
      if (input.taxRate !== null) {
        await tx.taxConfiguration.create({ data: { name: `GST ${input.taxRate}%`, categoryId, rate: input.taxRate } });
      }
    }
  }
  async updateCategory(id, input, actor) {
    const before = await this.db.category.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw notFound("Category");
    if (input.slug && input.slug !== before.slug && await this.db.category.findUnique({ where: { slug: input.slug } })) {
      throw conflict("Slug is already in use");
    }
    let parentChange = null;
    if (input.parentId !== void 0 && input.parentId !== before.parentId) {
      const parent = input.parentId ? await this.db.category.findFirst({ where: { id: input.parentId, deletedAt: null } }) : null;
      if (input.parentId && !parent) throw notFound("Parent category");
      if (parent && parent.path.startsWith(before.path)) throw businessRule("A category cannot be moved under its own subtree");
      parentChange = {
        parentId: parent?.id ?? null,
        path: `${parent?.path ?? "/"}${before.id}/`,
        depth: parent ? parent.depth + 1 : 0
      };
    }
    const updated = await this.db.$transaction(async (tx) => {
      const u = await tx.category.update({
        where: { id },
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          imageUrl: input.imageUrl,
          icon: input.icon,
          sortOrder: input.sortOrder,
          isActive: input.isActive,
          ...parentChange ?? {}
        }
      });
      if (parentChange) {
        const descendants = await tx.category.findMany({ where: { path: { startsWith: before.path }, NOT: { id } } });
        const depthDelta = parentChange.depth - before.depth;
        for (const d of descendants) {
          await tx.category.update({
            where: { id: d.id },
            data: { path: parentChange.path + d.path.slice(before.path.length), depth: d.depth + depthDelta }
          });
        }
      }
      await this.applyCategoryConfig(tx, id, input);
      await this.audit.record(actor, { action: "category.update", entityType: "Category", entityId: id, before, after: u }, tx);
      return u;
    });
    await this.cache.delPrefix("categories:");
    await this.cache.delPrefix("home:");
    return updated;
  }
  async deleteCategory(id, actor) {
    const cat = await this.db.category.findFirst({ where: { id, deletedAt: null } });
    if (!cat) throw notFound("Category");
    const [children, products] = await Promise.all([
      this.db.category.count({ where: { parentId: id, deletedAt: null } }),
      this.db.product.count({ where: { categoryId: id, deletedAt: null } })
    ]);
    if (children > 0) throw businessRule("Move or delete the sub-categories first");
    if (products > 0) throw businessRule(`This category still has ${products} product(s). Move them before deleting.`);
    await this.db.category.update({
      where: { id },
      data: { deletedAt: /* @__PURE__ */ new Date(), isActive: false, slug: `${cat.slug}-deleted-${Date.now().toString(36)}` }
    });
    await this.audit.record(actor, { action: "category.delete", entityType: "Category", entityId: id, before: cat });
    await this.cache.delPrefix("categories:");
  }
  async reorderCategories(items, actor) {
    await this.db.$transaction(items.map((i) => this.db.category.update({ where: { id: i.id }, data: { sortOrder: i.sortOrder } })));
    await this.audit.record(actor, { action: "category.reorder", entityType: "Category", metadata: items });
    await this.cache.delPrefix("categories:");
  }
  async categoryAdminDetail(id) {
    const cat = await this.db.category.findFirst({ where: { id, deletedAt: null } });
    if (!cat) throw notFound("Category");
    const [commission, tax] = await Promise.all([
      this.db.commissionRule.findFirst({ where: { scope: "CATEGORY", categoryId: id, isActive: true } }),
      this.db.taxConfiguration.findFirst({ where: { categoryId: id, isActive: true } })
    ]);
    return { ...cat, commissionPercent: commission ? Number(commission.percentage) : null, taxRate: tax ? Number(tax.rate) : null };
  }
  // ── Brands ─────────────────────────────────────────────────
  async listBrands(opts = {}) {
    return this.db.brand.findMany({
      where: {
        deletedAt: null,
        ...opts.includeInactive ? {} : { isActive: true },
        ...opts.q ? { name: { contains: opts.q } } : {},
        ...opts.categoryId ? { products: { some: { categoryId: { in: await this.subtreeIds(opts.categoryId) }, status: "APPROVED", deletedAt: null } } } : {}
      },
      orderBy: { name: "asc" },
      take: 500
    });
  }
  async createBrand(input, actor) {
    const slug = input.slug ?? await this.uniqueSlug("brand", input.name);
    const brand = await this.db.brand.create({
      data: { name: input.name, slug, logoUrl: input.logoUrl ?? null, description: input.description ?? null, isActive: input.isActive }
    });
    await this.audit.record(actor, { action: "brand.create", entityType: "Brand", entityId: brand.id, after: brand });
    return brand;
  }
  async updateBrand(id, input, actor) {
    const before = await this.db.brand.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw notFound("Brand");
    const brand = await this.db.brand.update({ where: { id }, data: input });
    await this.audit.record(actor, { action: "brand.update", entityType: "Brand", entityId: id, before, after: brand });
    return brand;
  }
  async deleteBrand(id, actor) {
    const brand = await this.db.brand.findFirst({ where: { id, deletedAt: null } });
    if (!brand) throw notFound("Brand");
    const inUse = await this.db.product.count({ where: { brandId: id, deletedAt: null } });
    if (inUse) throw businessRule(`This brand is used by ${inUse} product(s)`);
    await this.db.brand.update({ where: { id }, data: { deletedAt: /* @__PURE__ */ new Date(), isActive: false, slug: `${brand.slug}-deleted-${Date.now().toString(36)}` } });
    await this.audit.record(actor, { action: "brand.delete", entityType: "Brand", entityId: id, before: brand });
  }
  // ── Attributes ─────────────────────────────────────────────
  listAttributes(categoryId) {
    return this.db.productAttribute.findMany({
      where: categoryId ? { OR: [{ categoryId }, { categoryId: null }] } : {},
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
  }
  async createAttribute(input, actor) {
    const attr = await this.db.productAttribute.create({
      data: {
        name: input.name,
        code: input.code,
        type: input.type,
        categoryId: input.categoryId ?? null,
        options: input.options,
        isFilterable: input.isFilterable,
        isVariantAxis: input.isVariantAxis,
        isRequired: input.isRequired
      }
    });
    await this.audit.record(actor, { action: "attribute.create", entityType: "ProductAttribute", entityId: attr.id, after: attr });
    return attr;
  }
  async updateAttribute(id, input, actor) {
    const before = await this.db.productAttribute.findUnique({ where: { id } });
    if (!before) throw notFound("Attribute");
    const attr = await this.db.productAttribute.update({
      where: { id },
      data: { ...input, options: input.options ?? void 0 }
    });
    await this.audit.record(actor, { action: "attribute.update", entityType: "ProductAttribute", entityId: id, before, after: attr });
    return attr;
  }
  async deleteAttribute(id, actor) {
    const before = await this.db.productAttribute.findUnique({ where: { id } });
    if (!before) throw notFound("Attribute");
    await this.db.productAttribute.delete({ where: { id } });
    await this.audit.record(actor, { action: "attribute.delete", entityType: "ProductAttribute", entityId: id, before });
  }
};

// src/modules/catalog/product-io.service.ts
import ExcelJS2 from "exceljs";
import { parse } from "csv-parse/sync";
import { stringify as stringify2 } from "csv-stringify/sync";
var IMPORT_COLUMNS = [
  "handle",
  "title",
  "description",
  "category_slug",
  "brand_slug",
  "sku",
  "option1_name",
  "option1_value",
  "option2_name",
  "option2_value",
  "price",
  "mrp",
  "stock",
  "hsn_code",
  "returnable",
  "return_window_days"
];
var MAX_ROWS = 2e3;
var ProductIoService = class {
  constructor(db2, products, inventory, indexer) {
    this.db = db2;
    this.products = products;
    this.inventory = inventory;
    this.indexer = indexer;
  }
  db;
  products;
  inventory;
  indexer;
  async readRows(file) {
    if (file.mimeType === "text/csv") {
      const rows2 = parse(file.buffer, { columns: (h) => h.map((c2) => c2.trim().toLowerCase()), skip_empty_lines: true, trim: true, bom: true });
      return rows2;
    }
    const wb = new ExcelJS2.Workbook();
    await wb.xlsx.load(file.buffer);
    const ws = wb.worksheets[0];
    if (!ws) return [];
    const header = ws.getRow(1).values.slice(1).map((v) => String(v ?? "").trim().toLowerCase());
    const rows = [];
    ws.eachRow((row, idx) => {
      if (idx === 1) return;
      const values2 = row.values.slice(1);
      const obj = {};
      header.forEach((h, i) => {
        const v = values2[i];
        obj[h] = v === null || v === void 0 ? "" : typeof v === "object" && "text" in v ? String(v.text) : String(v);
      });
      rows.push(obj);
    });
    return rows;
  }
  template() {
    const sample = [
      ["cotton-kurta", "Men Cotton Kurta", "Breathable pure cotton kurta for daily wear.", "mens-clothing", "ethnica", "KURTA-BLU-M", "size", "M", "color", "Blue", "799", "1299", "25", "6205", "yes", "7"],
      ["cotton-kurta", "", "", "", "", "KURTA-BLU-L", "size", "L", "color", "Blue", "799", "1299", "18", "", "", ""]
    ];
    return Buffer.from(stringify2([IMPORT_COLUMNS, ...sample]));
  }
  async import(sellerId, file, actor) {
    const rows = await this.readRows(file);
    if (!rows.length) throw badRequest("The file has no data rows");
    if (rows.length > MAX_ROWS) throw badRequest(`At most ${MAX_ROWS} rows can be imported at once`);
    const results = [];
    const existing = await this.db.sellerProductListing.findMany({
      where: { sellerId, sku: { in: rows.map((r) => r.sku ?? "").filter(Boolean) }, deletedAt: null },
      include: { inventory: true }
    });
    const bySku = new Map(existing.map((l) => [l.sku, l]));
    const creations = /* @__PURE__ */ new Map();
    for (const [i, row] of rows.entries()) {
      const rowNo = i + 2;
      const sku = (row.sku ?? "").trim();
      if (!sku) {
        results.push({ row: rowNo, sku: "", action: "error", message: "SKU is required" });
        continue;
      }
      const listing = bySku.get(sku);
      if (listing) {
        try {
          const price2 = row.price ? Number(row.price) : num(listing.price);
          const mrp = row.mrp ? Number(row.mrp) : num(listing.mrp);
          if (!(price2 > 0) || !(mrp > 0) || price2 > mrp) throw new Error("Price must be > 0 and not exceed MRP");
          await this.db.sellerProductListing.update({ where: { id: listing.id }, data: { price: decimal(toPaise(price2)), mrp: decimal(toPaise(mrp)) } });
          if (row.stock !== void 0 && row.stock !== "" && Number(row.stock) !== listing.inventory?.quantity) {
            await this.inventory.adjust(listing.id, { setTo: Number(row.stock), reason: "Bulk import" }, actor, { sellerId }, "IMPORT");
          }
          await this.indexer.refresh([listing.productId]);
          results.push({ row: rowNo, sku, action: "updated" });
        } catch (err) {
          results.push({ row: rowNo, sku, action: "error", message: err.message });
        }
        continue;
      }
      const handle = (row.handle || sku).trim().toLowerCase();
      if (!creations.has(handle)) creations.set(handle, []);
      creations.get(handle).push({ row, index: rowNo });
    }
    const categories = new Map((await this.db.category.findMany({ where: { deletedAt: null }, select: { id: true, slug: true } })).map((c2) => [c2.slug, c2.id]));
    const brands = new Map((await this.db.brand.findMany({ where: { deletedAt: null }, select: { id: true, slug: true } })).map((b) => [b.slug, b.id]));
    for (const [handle, group] of creations) {
      const head = group[0].row;
      const variants = group.map(({ row }) => {
        const options = {};
        if (row.option1_name && row.option1_value) options[row.option1_name.trim().toLowerCase()] = row.option1_value.trim();
        if (row.option2_name && row.option2_value) options[row.option2_name.trim().toLowerCase()] = row.option2_value.trim();
        return { options, sku: row.sku.trim(), price: row.price, mrp: row.mrp, stock: row.stock || "0" };
      });
      const parsed = productUpsertSchema.safeParse({
        title: head.title,
        description: head.description,
        categoryId: categories.get((head.category_slug ?? "").trim()) ?? "",
        brandId: head.brand_slug ? brands.get(head.brand_slug.trim()) ?? null : null,
        hsnCode: head.hsn_code || void 0,
        isReturnable: !/^(no|false|0)$/i.test(head.returnable ?? "yes"),
        returnWindowDays: head.return_window_days ? Number(head.return_window_days) : 7,
        variants,
        submit: false
      });
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        for (const g of group) results.push({ row: g.index, sku: g.row.sku ?? "", action: "error", message: `${handle}: ${msg}` });
        continue;
      }
      try {
        await this.products.create(sellerId, parsed.data, actor);
        for (const g of group) results.push({ row: g.index, sku: g.row.sku ?? "", action: "created" });
      } catch (err) {
        for (const g of group) results.push({ row: g.index, sku: g.row.sku ?? "", action: "error", message: err.message });
      }
    }
    results.sort((a, b) => a.row - b.row);
    return {
      total: rows.length,
      created: results.filter((r) => r.action === "created").length,
      updated: results.filter((r) => r.action === "updated").length,
      errors: results.filter((r) => r.action === "error")
    };
  }
  async export(scope, format) {
    const listings = await this.db.sellerProductListing.findMany({
      where: { deletedAt: null, ...scope.sellerId ? { sellerId: scope.sellerId } : {} },
      include: {
        inventory: true,
        variant: true,
        seller: { select: { displayName: true, code: true } },
        product: { include: { category: { select: { slug: true } }, brand: { select: { slug: true } } } }
      },
      orderBy: [{ productId: "asc" }, { createdAt: "asc" }],
      take: 5e4
    });
    const header = [...IMPORT_COLUMNS, "reserved", "status", "active", "product_id", ...scope.sellerId ? [] : ["seller", "seller_code"]];
    const rows = listings.map((l) => {
      const opts = Object.entries(l.variant.options ?? {});
      return [
        l.product.slug,
        l.product.title,
        l.product.description,
        l.product.category.slug,
        l.product.brand?.slug ?? "",
        l.sku,
        opts[0]?.[0] ?? "",
        opts[0]?.[1] ?? "",
        opts[1]?.[0] ?? "",
        opts[1]?.[1] ?? "",
        num(l.price),
        num(l.mrp),
        l.inventory?.quantity ?? 0,
        l.product.hsnCode ?? "",
        l.product.isReturnable ? "yes" : "no",
        l.product.returnWindowDays,
        l.inventory?.reserved ?? 0,
        l.status,
        l.isActive ? "yes" : "no",
        l.productId,
        ...scope.sellerId ? [] : [l.seller.displayName, l.seller.code]
      ];
    });
    const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    if (format === "csv") {
      const safe = rows.map((r) => r.map((c2) => typeof c2 === "string" && /^[=+\-@]/.test(c2) ? `'${c2}` : c2));
      return { filename: `products-${stamp}.csv`, contentType: "text/csv; charset=utf-8", data: Buffer.from(stringify2([header, ...safe])) };
    }
    const wb = new ExcelJS2.Workbook();
    const ws = wb.addWorksheet("Products");
    ws.addRow(header).font = { bold: true };
    rows.forEach((r) => ws.addRow(r));
    return {
      filename: `products-${stamp}.xlsx`,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      data: Buffer.from(await wb.xlsx.writeBuffer())
    };
  }
};

// src/modules/catalog/product.service.ts
import { Prisma as Prisma4 } from "@prisma/client";
var MAX_IMAGES = 10;
var managedInclude = {
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
  ownerSeller: { select: { id: true, displayName: true, slug: true, status: true } },
  images: { orderBy: { sortOrder: "asc" } },
  attributeValues: { include: { attribute: { select: { id: true, name: true, code: true } } } },
  variants: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } }
};
var variantName = (options) => {
  const values2 = Object.values(options).filter(Boolean);
  return values2.length ? values2.join(" / ").slice(0, 160) : "Default";
};
var ProductService = class {
  constructor(db2, storage, inventory, indexer, settings, audit, notifications) {
    this.db = db2;
    this.storage = storage;
    this.inventory = inventory;
    this.indexer = indexer;
    this.settings = settings;
    this.audit = audit;
    this.notifications = notifications;
  }
  db;
  storage;
  inventory;
  indexer;
  settings;
  audit;
  notifications;
  // ── Helpers ───────────────────────────────────────────────
  async uniqueSlug(title) {
    const base = slugify(title) || "product";
    for (let i = 0; i < 5; i++) {
      const slug = `${base}-${randomCode(5).toLowerCase()}`;
      if (!await this.db.product.findUnique({ where: { slug }, select: { id: true } })) return slug;
    }
    return `${base}-${Date.now().toString(36)}`;
  }
  /**
   * Load a product the caller may manage. Sellers only see products they own — any other ID
   * yields 404 (not 403) so the existence of other sellers' products is never revealed.
   */
  async loadManaged(productId, scope) {
    const product = await this.db.product.findFirst({
      where: {
        id: productId,
        deletedAt: null,
        ...scope.kind === "seller" ? { ownerSellerId: scope.sellerId } : {}
      },
      include: managedInclude
    });
    if (!product) throw notFound("Product");
    return product;
  }
  async assertSellerCanList(sellerId, submitting) {
    const seller = await this.db.seller.findUnique({ where: { id: sellerId }, select: { status: true, deletedAt: true } });
    if (!seller || seller.deletedAt) throw notFound("Seller");
    if (["SUSPENDED", "REJECTED", "INACTIVE"].includes(seller.status)) {
      throw forbidden(`Your seller account is ${seller.status.toLowerCase().replace("_", " ")} and cannot create or change listings`);
    }
    if (submitting && seller.status !== "APPROVED") {
      throw forbidden("Your seller account must be approved before products can be submitted for sale");
    }
  }
  async validateRefs(input) {
    const category = await this.db.category.findFirst({ where: { id: input.categoryId, deletedAt: null, isActive: true } });
    if (!category) throw badRequest("Choose a valid category", [{ path: "categoryId", message: "Unknown category" }]);
    if (input.brandId) {
      const brand = await this.db.brand.findFirst({ where: { id: input.brandId, deletedAt: null } });
      if (!brand) throw badRequest("Choose a valid brand", [{ path: "brandId", message: "Unknown brand" }]);
    }
    if (input.attributes.length) {
      const ids = [...new Set(input.attributes.map((a) => a.attributeId))];
      const found = await this.db.productAttribute.count({ where: { id: { in: ids } } });
      if (found !== ids.length) throw badRequest("Unknown product attribute");
    }
    const skus = input.variants.map((v) => v.sku.toUpperCase());
    if (new Set(skus).size !== skus.length) throw badRequest("Each variant needs a unique SKU");
    return category;
  }
  async assertSkusFree(sellerId, variants, productId) {
    const clash = await this.db.sellerProductListing.findFirst({
      where: {
        sellerId,
        sku: { in: variants.map((v) => v.sku) },
        ...productId ? { NOT: { productId } } : {}
      },
      select: { sku: true }
    });
    if (clash) throw conflict(`SKU "${clash.sku}" is already used by another of your products`);
  }
  contentData(input) {
    return {
      title: plainText(input.title),
      description: plainText(input.description),
      highlights: input.highlights.map((h) => plainText(h)),
      specifications: input.specifications.map((s2) => ({ key: plainText(s2.key), value: plainText(s2.value) })),
      tags: input.tags.map((t) => t.toLowerCase()),
      categoryId: input.categoryId,
      brandId: input.brandId ?? null,
      hsnCode: input.hsnCode ?? null,
      isReturnable: input.isReturnable,
      returnWindowDays: input.isReturnable ? input.returnWindowDays : 0,
      codAvailable: input.codAvailable,
      videoUrl: input.videoUrl ?? null
    };
  }
  // ── Create ────────────────────────────────────────────────
  async create(sellerId, input, actor, byAdmin = false) {
    if (!byAdmin) await this.assertSellerCanList(sellerId, input.submit);
    if (input.submit && !byAdmin) {
      throw businessRule("Save the product as a draft, add images, then submit it for review");
    }
    await this.validateRefs(input);
    await this.assertSkusFree(sellerId, input.variants);
    const status = input.submit ? "PENDING_REVIEW" : "DRAFT";
    const slug = await this.uniqueSlug(input.title);
    const product = await this.db.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          ...this.contentData(input),
          slug,
          searchText: input.title,
          ownerSellerId: sellerId,
          status,
          submittedAt: input.submit ? /* @__PURE__ */ new Date() : null
        }
      });
      await this.writeAttributes(tx, p.id, input);
      for (const [i, v] of input.variants.entries()) {
        await this.createVariant(tx, p.id, sellerId, v, i, status, actor);
      }
      if (input.submit) {
        await tx.productApproval.create({
          data: { productId: p.id, fromStatus: null, toStatus: "PENDING_REVIEW", actorId: actor?.auth?.userId ?? null }
        });
      }
      await this.audit.record(
        actor,
        { action: byAdmin ? "product.create_on_behalf" : "product.create", entityType: "Product", entityId: p.id, after: { ...input, sellerId } },
        tx
      );
      await this.indexer.reindexSearch(p.id, tx);
      return p;
    });
    return this.getManaged(product.id, byAdmin ? { kind: "admin" } : { kind: "seller", sellerId });
  }
  async writeAttributes(tx, productId, input) {
    await tx.productAttributeValue.deleteMany({ where: { productId, variantId: null } });
    if (input.attributes.length) {
      await tx.productAttributeValue.createMany({
        data: input.attributes.map((a) => ({ productId, attributeId: a.attributeId, value: plainText(a.value) }))
      });
    }
  }
  async createVariant(tx, productId, sellerId, v, index, status, actor) {
    const variant = await tx.productVariant.create({
      data: {
        productId,
        name: variantName(v.options),
        options: v.options,
        isDefault: index === 0,
        sortOrder: index,
        weightGrams: v.weightGrams ?? null,
        lengthCm: v.lengthCm ?? null,
        widthCm: v.widthCm ?? null,
        heightCm: v.heightCm ?? null
      }
    });
    const listing = await tx.sellerProductListing.create({
      data: {
        sellerId,
        productId,
        variantId: variant.id,
        sku: v.sku,
        barcode: v.barcode ?? null,
        price: decimal(toPaise(v.price)),
        mrp: decimal(toPaise(v.mrp)),
        status,
        isActive: v.isActive
      }
    });
    await this.inventory.initialize(tx, listing.id, sellerId, v.stock, v.lowStockThreshold, {
      reason: "Initial stock",
      actorId: actor?.auth?.userId,
      referenceType: "PRODUCT",
      referenceId: productId
    });
    await this.writeVariantAxes(tx, productId, variant.id, v.options);
    return { variant, listing };
  }
  /** Variant option values are also stored as attribute values so they are filterable. */
  async writeVariantAxes(tx, productId, variantId, options) {
    await tx.productAttributeValue.deleteMany({ where: { variantId } });
    const codes = Object.keys(options);
    if (!codes.length) return;
    const attrs = await tx.productAttribute.findMany({ where: { code: { in: codes }, isVariantAxis: true } });
    const rows = attrs.filter((a) => options[a.code]).map((a) => ({ productId, variantId, attributeId: a.id, value: options[a.code] }));
    if (rows.length) await tx.productAttributeValue.createMany({ data: rows });
  }
  // ── Update ────────────────────────────────────────────────
  async update(productId, input, scope, actor) {
    const before = await this.loadManaged(productId, scope);
    if (before.status === "ARCHIVED") throw businessRule("Archived products cannot be edited");
    const sellerId = before.ownerSellerId;
    if (!sellerId) throw businessRule("Product has no owning seller");
    if (scope.kind === "seller") await this.assertSellerCanList(sellerId, input.submit);
    await this.validateRefs(input);
    await this.assertSkusFree(sellerId, input.variants, productId);
    const listings = await this.db.sellerProductListing.findMany({
      where: { productId, sellerId, deletedAt: null },
      include: { inventory: true }
    });
    const byVariant = new Map(listings.map((l) => [l.variantId, l]));
    const inputIds = new Set(input.variants.filter((v) => v.id).map((v) => v.id));
    for (const id of inputIds) {
      if (!before.variants.some((v) => v.id === id)) throw badRequest("Unknown variant for this product");
    }
    const content = this.contentData(input);
    const contentChanged = content.title !== before.title || content.description !== before.description || content.categoryId !== before.categoryId || content.brandId !== before.brandId || JSON.stringify(content.specifications) !== JSON.stringify(before.specifications ?? []) || JSON.stringify(content.highlights) !== JSON.stringify(before.highlights ?? []) || input.variants.some((v) => !v.id) || before.variants.some((v) => !inputIds.has(v.id));
    const settings = await this.settings.get("catalog");
    let nextStatus = before.status;
    if (input.submit && ["DRAFT", "REJECTED"].includes(before.status)) nextStatus = "PENDING_REVIEW";
    else if (scope.kind === "seller" && before.status === "APPROVED" && contentChanged && settings.productChangesRequireReapproval) {
      nextStatus = "PENDING_REVIEW";
    }
    if (nextStatus === "PENDING_REVIEW" && before.status !== "PENDING_REVIEW" && before.images.length === 0) {
      throw businessRule("Add at least one product image before submitting for review");
    }
    await this.db.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          ...content,
          status: nextStatus,
          rejectionReason: nextStatus === "PENDING_REVIEW" ? null : void 0,
          submittedAt: nextStatus === "PENDING_REVIEW" && before.status !== "PENDING_REVIEW" ? /* @__PURE__ */ new Date() : void 0
        }
      });
      await this.writeAttributes(tx, productId, input);
      for (const [i, v] of input.variants.entries()) {
        if (!v.id) {
          await this.createVariant(tx, productId, sellerId, v, before.variants.length + i, nextStatus, actor);
          continue;
        }
        await tx.productVariant.update({
          where: { id: v.id },
          data: {
            name: variantName(v.options),
            options: v.options,
            sortOrder: i,
            weightGrams: v.weightGrams ?? null,
            lengthCm: v.lengthCm ?? null,
            widthCm: v.widthCm ?? null,
            heightCm: v.heightCm ?? null
          }
        });
        await this.writeVariantAxes(tx, productId, v.id, v.options);
        const listing = byVariant.get(v.id);
        if (!listing) continue;
        await tx.sellerProductListing.update({
          where: { id: listing.id },
          data: {
            sku: v.sku,
            barcode: v.barcode ?? null,
            price: decimal(toPaise(v.price)),
            mrp: decimal(toPaise(v.mrp)),
            isActive: v.isActive,
            ...nextStatus !== before.status && listing.status !== "ARCHIVED" ? { status: nextStatus } : {}
          }
        });
        if (listing.inventory && listing.inventory.quantity !== v.stock) {
          await this.inventory.adjust(
            listing.id,
            { setTo: v.stock, reason: "Updated from product editor", lowStockThreshold: v.lowStockThreshold },
            actor,
            { sellerId: scope.kind === "seller" ? sellerId : null },
            "ADJUSTMENT",
            tx
          );
        } else if (listing.inventory && listing.inventory.lowStockThreshold !== v.lowStockThreshold) {
          await tx.inventory.update({ where: { id: listing.inventory.id }, data: { lowStockThreshold: v.lowStockThreshold } });
        }
      }
      const removed = before.variants.filter((v) => !inputIds.has(v.id));
      for (const v of removed) {
        await tx.productVariant.update({ where: { id: v.id }, data: { deletedAt: /* @__PURE__ */ new Date() } });
        const listing = byVariant.get(v.id);
        if (listing) {
          await tx.sellerProductListing.update({ where: { id: listing.id }, data: { status: "ARCHIVED", deletedAt: /* @__PURE__ */ new Date(), isActive: false } });
          await tx.cartItem.deleteMany({ where: { listingId: listing.id } });
        }
      }
      if (nextStatus !== before.status) {
        await tx.productApproval.create({
          data: {
            productId,
            fromStatus: before.status,
            toStatus: nextStatus,
            actorId: actor?.auth?.userId ?? null,
            reason: nextStatus === "PENDING_REVIEW" && before.status === "APPROVED" ? "Content changed; re-review required" : null
          }
        });
      }
      await this.audit.record(
        actor,
        {
          action: scope.kind === "admin" ? "product.admin_update" : "product.update",
          entityType: "Product",
          entityId: productId,
          before,
          after: { ...input, status: nextStatus }
        },
        tx
      );
      await this.indexer.reindexSearch(productId, tx);
    });
    await this.indexer.refresh([productId]);
    return this.getManaged(productId, scope);
  }
  async submit(productId, scope, actor) {
    const p = await this.loadManaged(productId, scope);
    if (!["DRAFT", "REJECTED"].includes(p.status)) throw businessRule(`A ${p.status.toLowerCase()} product cannot be submitted`);
    if (scope.kind === "seller") await this.assertSellerCanList(scope.sellerId, true);
    if (p.images.length === 0) throw businessRule("Add at least one product image before submitting for review");
    await this.transition(p.id, p.status, "PENDING_REVIEW", actor, null, true);
    return this.getManaged(productId, scope);
  }
  /** Seller on/off switch for their approved listings on this product. */
  async setActive(productId, sellerId, isActive, actor) {
    const listings = await this.db.sellerProductListing.findMany({ where: { productId, sellerId, deletedAt: null } });
    if (!listings.length) throw notFound("Product");
    if (isActive) {
      const seller = await this.db.seller.findUnique({ where: { id: sellerId } });
      if (seller?.status !== "APPROVED") throw forbidden("Only approved sellers can activate listings");
    }
    await this.db.sellerProductListing.updateMany({ where: { productId, sellerId, deletedAt: null }, data: { isActive } });
    await this.audit.record(actor, { action: isActive ? "product.activate" : "product.deactivate", entityType: "Product", entityId: productId });
    await this.indexer.refresh([productId]);
  }
  /** Soft delete. Order history keeps its snapshots. */
  async archive(productId, scope, actor) {
    const p = await this.loadManaged(productId, scope);
    await this.db.$transaction(async (tx) => {
      await tx.product.update({ where: { id: p.id }, data: { status: "ARCHIVED", deletedAt: /* @__PURE__ */ new Date(), isFeatured: false } });
      const listings = await tx.sellerProductListing.findMany({ where: { productId: p.id }, select: { id: true } });
      await tx.sellerProductListing.updateMany({
        where: { productId: p.id },
        data: { status: "ARCHIVED", isActive: false, deletedAt: /* @__PURE__ */ new Date() }
      });
      await tx.cartItem.deleteMany({ where: { listingId: { in: listings.map((l) => l.id) } } });
      await tx.productApproval.create({ data: { productId: p.id, fromStatus: p.status, toStatus: "ARCHIVED", actorId: actor?.auth?.userId ?? null } });
      await this.audit.record(actor, { action: "product.archive", entityType: "Product", entityId: p.id, before: p }, tx);
    });
    await this.indexer.refresh([p.id]);
  }
  // ── Images ────────────────────────────────────────────────
  async addImages(productId, files, scope, actor) {
    const p = await this.loadManaged(productId, scope);
    if (!files.length) throw badRequest("Choose at least one image");
    if (p.images.length + files.length > MAX_IMAGES) throw businessRule(`A product can have at most ${MAX_IMAGES} images`);
    const stored = [];
    for (const f of files) stored.push(await storeOptimizedImage(this.storage, "products", f.buffer, f.mimeType));
    await this.db.productImage.createMany({
      data: stored.map((s2, i) => ({
        productId,
        url: s2.url,
        storageKey: s2.key,
        alt: p.title.slice(0, 200),
        sortOrder: p.images.length + i
      }))
    });
    await this.onContentChange(p, scope, actor, "Images added");
    return this.getManaged(productId, scope);
  }
  async removeImage(productId, imageId, scope, actor) {
    const p = await this.loadManaged(productId, scope);
    const img = p.images.find((i) => i.id === imageId);
    if (!img) throw notFound("Image");
    await this.db.productImage.delete({ where: { id: imageId } });
    if (img.storageKey) {
      await this.storage.delete(img.storageKey, "public");
      await this.storage.delete(img.storageKey.replace(/\.webp$/, "-sm.webp"), "public");
    }
    await this.onContentChange(p, scope, actor, "Image removed");
    return this.getManaged(productId, scope);
  }
  async reorderImages(productId, imageIds, scope) {
    const p = await this.loadManaged(productId, scope);
    const known = new Set(p.images.map((i) => i.id));
    if (imageIds.some((id) => !known.has(id))) throw badRequest("Unknown image");
    await this.db.$transaction(imageIds.map((id, i) => this.db.productImage.update({ where: { id }, data: { sortOrder: i } })));
    return this.getManaged(productId, scope);
  }
  async onContentChange(p, scope, actor, reason) {
    const settings = await this.settings.get("catalog");
    if (scope.kind === "seller" && p.status === "APPROVED" && settings.productChangesRequireReapproval) {
      await this.transition(p.id, "APPROVED", "PENDING_REVIEW", actor, `${reason}; re-review required`, true);
    }
    await this.audit.record(actor, { action: "product.images", entityType: "Product", entityId: p.id, metadata: { reason } });
  }
  // ── Status transitions (shared by seller submit and admin moderation) ──────
  async transition(productId, from, to, actor, reason, cascadeOwnerListings) {
    await this.db.$transaction(async (tx) => {
      const updated = await tx.product.updateMany({
        where: { id: productId, status: from },
        data: {
          status: to,
          rejectionReason: to === "REJECTED" || to === "SUSPENDED" ? reason : null,
          ...to === "PENDING_REVIEW" ? { submittedAt: /* @__PURE__ */ new Date() } : {}
        }
      });
      if (updated.count !== 1) throw conflict("The product status changed in the meantime. Refresh and try again.");
      if (to === "APPROVED") {
        await tx.product.updateMany({ where: { id: productId, publishedAt: null }, data: { publishedAt: /* @__PURE__ */ new Date() } });
      }
      if (cascadeOwnerListings) {
        const p = await tx.product.findUniqueOrThrow({ where: { id: productId }, select: { ownerSellerId: true } });
        if (p.ownerSellerId) {
          await tx.sellerProductListing.updateMany({
            where: {
              productId,
              sellerId: p.ownerSellerId,
              deletedAt: null,
              status: { notIn: ["ARCHIVED"] }
            },
            data: { status: to === "SUSPENDED" ? void 0 : to, rejectionReason: to === "REJECTED" ? reason : null }
          });
        }
      }
      await tx.productApproval.create({
        data: { productId, fromStatus: from, toStatus: to, reason, actorId: actor?.auth?.userId ?? null }
      });
      await this.audit.record(
        actor,
        { action: `product.status.${to.toLowerCase()}`, entityType: "Product", entityId: productId, before: { status: from }, after: { status: to, reason } },
        tx
      );
    });
    await this.indexer.refresh([productId]);
  }
  async approve(productId, actor) {
    const p = await this.loadManaged(productId, { kind: "admin" });
    if (!["PENDING_REVIEW", "REJECTED", "SUSPENDED", "DRAFT"].includes(p.status)) {
      throw businessRule(`A ${p.status.toLowerCase()} product cannot be approved`);
    }
    await this.transition(p.id, p.status, "APPROVED", actor, null, true);
    await this.notifyOwner(p.ownerSellerId, "product.approved", { productName: p.title }, `/seller/products/${p.id}`);
    return this.getManaged(productId, { kind: "admin" });
  }
  async reject(productId, reason, actor) {
    const p = await this.loadManaged(productId, { kind: "admin" });
    if (!["PENDING_REVIEW", "APPROVED", "SUSPENDED"].includes(p.status)) {
      throw businessRule(`A ${p.status.toLowerCase()} product cannot be rejected`);
    }
    await this.transition(p.id, p.status, "REJECTED", actor, reason, true);
    await this.notifyOwner(p.ownerSellerId, "product.rejected", { productName: p.title, reason }, `/seller/products/${p.id}`);
    return this.getManaged(productId, { kind: "admin" });
  }
  async suspend(productId, reason, actor) {
    const p = await this.loadManaged(productId, { kind: "admin" });
    if (p.status !== "APPROVED") throw businessRule("Only live products can be suspended");
    await this.transition(p.id, "APPROVED", "SUSPENDED", actor, reason, false);
    await this.notifyOwner(p.ownerSellerId, "product.rejected", { productName: p.title, reason: `Suspended \u2014 ${reason}` }, `/seller/products/${p.id}`);
    return this.getManaged(productId, { kind: "admin" });
  }
  async setFeatured(productId, isFeatured, actor) {
    const p = await this.loadManaged(productId, { kind: "admin" });
    await this.db.product.update({ where: { id: p.id }, data: { isFeatured } });
    await this.audit.record(actor, { action: "product.feature", entityType: "Product", entityId: p.id, after: { isFeatured } });
  }
  async notifyOwner(sellerId, key, vars, link) {
    if (!sellerId) return;
    const seller = await this.db.seller.findUnique({ where: { id: sellerId }, select: { userId: true } });
    if (seller) await this.notifications.notify({ key, userId: seller.userId, vars, link });
  }
  // ── Offers on existing catalog products (multi-seller) ─────
  async createOffer(sellerId, input, actor) {
    await this.assertSellerCanList(sellerId, true);
    const variant = await this.db.productVariant.findFirst({
      where: { id: input.variantId, productId: input.productId, deletedAt: null, product: { status: "APPROVED", deletedAt: null } }
    });
    if (!variant) throw notFound("Product");
    if (input.price > input.mrp) throw badRequest("Selling price cannot exceed MRP");
    const existing = await this.db.sellerProductListing.findFirst({ where: { sellerId, variantId: variant.id } });
    if (existing) throw conflict("You already sell this variant");
    const settings = await this.settings.get("catalog");
    const status = settings.autoApproveListingsOnApprovedProducts ? "APPROVED" : "PENDING_REVIEW";
    const listing = await this.db.$transaction(async (tx) => {
      const l = await tx.sellerProductListing.create({
        data: {
          sellerId,
          productId: input.productId,
          variantId: variant.id,
          sku: input.sku,
          price: decimal(toPaise(input.price)),
          mrp: decimal(toPaise(input.mrp)),
          status
        }
      });
      await this.inventory.initialize(tx, l.id, sellerId, input.stock, 5, { reason: "Initial stock", actorId: actor?.auth?.userId });
      await this.audit.record(actor, { action: "listing.create", entityType: "SellerProductListing", entityId: l.id, after: input }, tx);
      return l;
    });
    await this.indexer.reindexSearch(input.productId);
    await this.indexer.refresh([input.productId]);
    return listing;
  }
  async decideListing(listingId, approve, reason, actor) {
    const listing = await this.db.sellerProductListing.findFirst({ where: { id: listingId, deletedAt: null } });
    if (!listing) throw notFound("Listing");
    await this.db.sellerProductListing.update({
      where: { id: listingId },
      data: { status: approve ? "APPROVED" : "REJECTED", rejectionReason: approve ? null : reason ?? null }
    });
    await this.audit.record(actor, {
      action: approve ? "listing.approve" : "listing.reject",
      entityType: "SellerProductListing",
      entityId: listingId,
      after: { reason }
    });
    await this.indexer.refresh([listing.productId]);
  }
  // ── Reads ─────────────────────────────────────────────────
  async getManaged(productId, scope) {
    const product = scope.kind === "admin" ? await this.db.product.findFirst({ where: { id: productId }, include: managedInclude }) : await this.loadManaged(productId, scope);
    if (!product) throw notFound("Product");
    const listings = await this.db.sellerProductListing.findMany({
      where: {
        productId,
        deletedAt: null,
        // Sellers only ever see their own listings on a product.
        ...scope.kind === "seller" ? { sellerId: scope.sellerId } : {}
      },
      include: {
        inventory: true,
        seller: { select: { id: true, displayName: true, slug: true, status: true } }
      }
    });
    const approvals = await this.db.productApproval.findMany({ where: { productId }, orderBy: { createdAt: "desc" }, take: 20 });
    return {
      ...product,
      listings: listings.map((l) => ({
        ...l,
        price: num(l.price),
        mrp: num(l.mrp),
        stock: l.inventory?.quantity ?? 0,
        reserved: l.inventory?.reserved ?? 0,
        available: (l.inventory?.quantity ?? 0) - (l.inventory?.reserved ?? 0),
        lowStockThreshold: l.inventory?.lowStockThreshold ?? 5
      })),
      approvals
    };
  }
  async listManaged(scope, q) {
    const where = {
      ...q.status === "ARCHIVED" ? {} : { deletedAt: null },
      ...q.status ? { status: q.status } : { status: { not: "ARCHIVED" } },
      ...q.categoryId ? { categoryId: q.categoryId } : {},
      ...scope.kind === "seller" ? { OR: [{ ownerSellerId: scope.sellerId }, { listings: { some: { sellerId: scope.sellerId, deletedAt: null } } }] } : q.sellerId ? { OR: [{ ownerSellerId: q.sellerId }, { listings: { some: { sellerId: q.sellerId } } }] } : {},
      ...q.q ? {
        AND: [
          {
            OR: [
              { title: { contains: q.q } },
              { listings: { some: { sku: { contains: q.q }, ...scope.kind === "seller" ? { sellerId: scope.sellerId } : {} } } }
            ]
          }
        ]
      } : {}
    };
    const orderBy = q.sort === "oldest" ? { createdAt: "asc" } : q.sort === "title" ? { title: "asc" } : q.sort === "submitted" ? { submittedAt: "asc" } : { updatedAt: "desc" };
    const [items, total] = await Promise.all([
      this.db.product.findMany({
        where,
        orderBy,
        ...pageArgs(q.page, q.pageSize),
        include: {
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          ownerSeller: { select: { id: true, displayName: true } },
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          listings: {
            where: { deletedAt: null, ...scope.kind === "seller" ? { sellerId: scope.sellerId } : {} },
            select: { id: true, sku: true, price: true, mrp: true, status: true, isActive: true, sellerId: true, inventory: { select: { quantity: true, reserved: true } } }
          }
        }
      }),
      this.db.product.count({ where })
    ]);
    return paginated(
      items.map((p) => ({
        ...p,
        searchText: void 0,
        listings: p.listings.map((l) => ({
          ...l,
          price: num(l.price),
          mrp: num(l.mrp),
          available: (l.inventory?.quantity ?? 0) - (l.inventory?.reserved ?? 0)
        })),
        totalStock: p.listings.reduce((s2, l) => s2 + (l.inventory?.quantity ?? 0), 0),
        isOwner: scope.kind === "seller" ? p.ownerSellerId === scope.sellerId : void 0
      })),
      total,
      q.page,
      q.pageSize
    );
  }
  async history(productId) {
    await this.loadManaged(productId, { kind: "admin" });
    const [approvals, audit] = await Promise.all([
      this.db.productApproval.findMany({ where: { productId }, orderBy: { createdAt: "desc" } }),
      this.db.auditLog.findMany({
        where: { entityType: "Product", entityId: productId },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { actor: { select: { id: true, name: true, email: true } } }
      })
    ]);
    return { approvals, audit };
  }
  /** Counts for the seller dashboard / admin review queue. */
  async statusCounts(scope) {
    const rows = await this.db.product.groupBy({
      by: ["status"],
      where: { deletedAt: null, ...scope.kind === "seller" ? { ownerSellerId: scope.sellerId } : {} },
      _count: { _all: true }
    });
    return Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
  }
};

// src/modules/content/content.service.ts
var ContentService = class {
  constructor(db2, storefront, catalog, settings, storage, cache, audit) {
    this.db = db2;
    this.storefront = storefront;
    this.catalog = catalog;
    this.settings = settings;
    this.storage = storage;
    this.cache = cache;
    this.audit = audit;
  }
  db;
  storefront;
  catalog;
  settings;
  storage;
  cache;
  audit;
  activeWindow() {
    const now = /* @__PURE__ */ new Date();
    return {
      isActive: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }]
    };
  }
  /** The public homepage: banners + every active section resolved to real data. */
  async homepage() {
    const cached = await this.cache.get("home:page");
    if (cached) return cached;
    const [banners, sections, promotions] = await Promise.all([
      this.db.banner.findMany({ where: this.activeWindow(), orderBy: [{ placement: "asc" }, { sortOrder: "asc" }] }),
      this.db.homeSection.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, include: { category: { select: { id: true, name: true, slug: true } } } }),
      this.activePromotions()
    ]);
    const categories = await this.catalog.tree();
    const resolved = [];
    for (const s2 of sections) {
      const base = { id: s2.id, type: s2.type, title: s2.title, subtitle: s2.subtitle, category: s2.category };
      if (s2.type === "CATEGORY_GRID") {
        resolved.push({ ...base, categories: categories.slice(0, s2.limit).map((c2) => ({ id: c2.id, name: c2.name, slug: c2.slug, imageUrl: c2.imageUrl, icon: c2.icon, productCount: c2.productCount })) });
      } else if (s2.type === "FEATURED_SELLERS") {
        resolved.push({ ...base, sellers: await this.storefront.featuredSellers(s2.limit) });
      } else if (s2.type === "RECENTLY_VIEWED") {
        resolved.push({ ...base, personalised: true });
      } else {
        const kind = s2.type === "CATEGORY_PRODUCTS" ? "BEST_SELLERS" : s2.type;
        const products = await this.storefront.productsBy(kind, s2.limit, s2.categoryId);
        if (products.length) resolved.push({ ...base, products });
      }
    }
    const page = {
      banners: {
        hero: banners.filter((b) => b.placement === "HERO"),
        strip: banners.filter((b) => b.placement === "STRIP"),
        category: banners.filter((b) => b.placement === "CATEGORY")
      },
      sections: resolved,
      promotions
    };
    await this.cache.set("home:page", page, 60);
    return page;
  }
  async activePromotions() {
    const now = /* @__PURE__ */ new Date();
    const rows = await this.db.promotion.findMany({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      include: { category: { select: { name: true, slug: true } } },
      orderBy: { endsAt: "asc" }
    });
    return rows.map((p) => ({ ...p, discountPercent: num(p.discountPercent) }));
  }
  /** Public, non-sensitive settings needed by the storefront shell. */
  async publicConfig() {
    const s2 = await this.settings.all();
    return {
      branding: s2.branding,
      cod: { enabled: s2.cod.enabled, maxOrderValue: s2.cod.maxOrderValue, fee: s2.cod.fee },
      returns: s2.returns,
      reviews: { onlyVerifiedPurchasers: s2.reviews.onlyVerifiedPurchasers },
      tax: { pricesInclusive: s2.tax.pricesInclusive }
    };
  }
  // ── Admin CRUD ─────────────────────────────────────────────
  async bust() {
    await this.cache.delPrefix("home:");
  }
  listBanners() {
    return this.db.banner.findMany({ orderBy: [{ placement: "asc" }, { sortOrder: "asc" }] });
  }
  async createBanner(input, actor) {
    const b = await this.db.banner.create({ data: input });
    await this.audit.record(actor, { action: "banner.create", entityType: "Banner", entityId: b.id, after: b });
    await this.bust();
    return b;
  }
  async updateBanner(id, input, actor) {
    const before = await this.db.banner.findUnique({ where: { id } });
    if (!before) throw notFound("Banner");
    const b = await this.db.banner.update({ where: { id }, data: input });
    await this.audit.record(actor, { action: "banner.update", entityType: "Banner", entityId: id, before, after: b });
    await this.bust();
    return b;
  }
  async deleteBanner(id, actor) {
    const before = await this.db.banner.findUnique({ where: { id } });
    if (!before) throw notFound("Banner");
    await this.db.banner.delete({ where: { id } });
    await this.audit.record(actor, { action: "banner.delete", entityType: "Banner", entityId: id, before });
    await this.bust();
  }
  async uploadImage(file) {
    const stored = await storeOptimizedImage(this.storage, "content", file.buffer, file.mimeType);
    return { url: stored.url, thumbUrl: stored.thumbUrl };
  }
  listSections() {
    return this.db.homeSection.findMany({ orderBy: { sortOrder: "asc" }, include: { category: { select: { id: true, name: true } } } });
  }
  async createSection(input, actor) {
    const s2 = await this.db.homeSection.create({ data: { ...input, categoryId: input.categoryId ?? null } });
    await this.audit.record(actor, { action: "home_section.create", entityType: "HomeSection", entityId: s2.id, after: s2 });
    await this.bust();
    return s2;
  }
  async updateSection(id, input, actor) {
    const before = await this.db.homeSection.findUnique({ where: { id } });
    if (!before) throw notFound("Section");
    const s2 = await this.db.homeSection.update({ where: { id }, data: { ...input, categoryId: input.categoryId ?? null } });
    await this.audit.record(actor, { action: "home_section.update", entityType: "HomeSection", entityId: id, before, after: s2 });
    await this.bust();
    return s2;
  }
  async deleteSection(id, actor) {
    const before = await this.db.homeSection.findUnique({ where: { id } });
    if (!before) throw notFound("Section");
    await this.db.homeSection.delete({ where: { id } });
    await this.audit.record(actor, { action: "home_section.delete", entityType: "HomeSection", entityId: id, before });
    await this.bust();
  }
  async listPromotions() {
    const rows = await this.db.promotion.findMany({ orderBy: { startsAt: "desc" }, include: { category: { select: { id: true, name: true } } } });
    return rows.map((p) => ({ ...p, discountPercent: num(p.discountPercent) }));
  }
  async createPromotion(input, actor) {
    const p = await this.db.promotion.create({ data: { ...input, categoryId: input.categoryId ?? null } });
    await this.audit.record(actor, { action: "promotion.create", entityType: "Promotion", entityId: p.id, after: p });
    await this.bust();
    return p;
  }
  async updatePromotion(id, input, actor) {
    const before = await this.db.promotion.findUnique({ where: { id } });
    if (!before) throw notFound("Promotion");
    const p = await this.db.promotion.update({ where: { id }, data: { ...input, categoryId: input.categoryId ?? null } });
    await this.audit.record(actor, { action: "promotion.update", entityType: "Promotion", entityId: id, before, after: p });
    await this.bust();
    return p;
  }
  async deletePromotion(id, actor) {
    const before = await this.db.promotion.findUnique({ where: { id } });
    if (!before) throw notFound("Promotion");
    await this.db.promotion.delete({ where: { id } });
    await this.audit.record(actor, { action: "promotion.delete", entityType: "Promotion", entityId: id, before });
    await this.bust();
  }
};

// src/modules/coupons/coupon.service.ts
var invalid = (message) => new AppError(422, "BUSINESS_RULE", message);
var CouponService = class {
  constructor(db2, audit) {
    this.db = db2;
    this.audit = audit;
  }
  db;
  audit;
  toPricing(c2) {
    return {
      code: c2.code,
      type: c2.type,
      value: num(c2.value),
      maxDiscount: c2.maxDiscount === null ? null : toPaise(c2.maxDiscount),
      minOrderAmount: toPaise(c2.minOrderAmount),
      scope: c2.scope,
      scopeIds: Array.isArray(c2.scopeIds) ? c2.scopeIds : [],
      fundedBy: c2.fundedBy
    };
  }
  /**
   * Validate that `code` can be used by this customer right now. Scope and minimum-order rules
   * are evaluated by the pricing engine against the actual cart lines.
   */
  async validate(code, userId, db2 = this.db) {
    const coupon = await db2.coupon.findFirst({ where: { code: code.toUpperCase(), deletedAt: null } });
    if (!coupon || !coupon.isActive) throw invalid("This coupon code is not valid");
    const now = /* @__PURE__ */ new Date();
    if (coupon.startsAt > now) throw invalid("This coupon is not active yet");
    if (coupon.endsAt < now) throw invalid("This coupon has expired");
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) throw invalid("This coupon has been fully redeemed");
    if (userId) {
      const used = await db2.couponUsage.count({ where: { couponId: coupon.id, userId, releasedAt: null } });
      if (used >= coupon.perCustomerLimit) throw invalid("You have already used this coupon");
      if (coupon.firstOrderOnly) {
        const orders = await db2.order.count({ where: { customerId: userId, status: { not: "CANCELLED" } } });
        if (orders > 0) throw invalid("This coupon is valid on your first order only");
      }
    } else if (coupon.firstOrderOnly || coupon.perCustomerLimit) {
    }
    return coupon;
  }
  /** Atomically claim one redemption; fails if the global usage limit was reached concurrently. */
  async redeem(tx, coupon, userId, orderId, discount) {
    const claimed = await tx.$executeRaw`
      UPDATE \`Coupon\` SET usedCount = usedCount + 1, updatedAt = NOW(3)
      WHERE id = ${coupon.id} AND (usageLimit IS NULL OR usedCount < usageLimit)`;
    if (claimed !== 1) throw conflict("This coupon has just been fully redeemed. Please remove it and try again.");
    await tx.couponUsage.create({
      data: { couponId: coupon.id, userId, orderId, discountAmount: decimal(discount) }
    });
  }
  /** Return a redemption when an entire order is cancelled. */
  async release(tx, orderId) {
    const usage = await tx.couponUsage.findUnique({ where: { orderId } });
    if (!usage || usage.releasedAt) return;
    await tx.couponUsage.update({ where: { id: usage.id }, data: { releasedAt: /* @__PURE__ */ new Date() } });
    await tx.$executeRaw`UPDATE \`Coupon\` SET usedCount = GREATEST(usedCount - 1, 0) WHERE id = ${usage.couponId}`;
  }
  /** Public list of currently redeemable coupons (shown at checkout). */
  async available() {
    const now = /* @__PURE__ */ new Date();
    const rows = await this.db.coupon.findMany({
      where: { isActive: true, deletedAt: null, startsAt: { lte: now }, endsAt: { gte: now } },
      orderBy: { endsAt: "asc" },
      take: 20
    });
    return rows.filter((c2) => c2.usageLimit === null || c2.usedCount < c2.usageLimit).map((c2) => ({
      code: c2.code,
      description: c2.description,
      type: c2.type,
      value: num(c2.value),
      maxDiscount: c2.maxDiscount === null ? null : num(c2.maxDiscount),
      minOrderAmount: num(c2.minOrderAmount),
      scope: c2.scope,
      firstOrderOnly: c2.firstOrderOnly,
      endsAt: c2.endsAt
    }));
  }
  // ── Admin ──────────────────────────────────────────────────
  async list(q) {
    const where = { deletedAt: null, ...q.q ? { code: { contains: q.q.toUpperCase() } } : {} };
    const [items, total] = await Promise.all([
      this.db.coupon.findMany({ where, orderBy: { createdAt: "desc" }, ...pageArgs(q.page, q.pageSize) }),
      this.db.coupon.count({ where })
    ]);
    return paginated(
      items.map((c2) => ({ ...c2, value: num(c2.value), maxDiscount: c2.maxDiscount === null ? null : num(c2.maxDiscount), minOrderAmount: num(c2.minOrderAmount) })),
      total,
      q.page,
      q.pageSize
    );
  }
  data(input) {
    return {
      code: input.code,
      description: input.description ?? null,
      type: input.type,
      value: input.value,
      maxDiscount: input.maxDiscount ?? null,
      minOrderAmount: input.minOrderAmount,
      scope: input.scope,
      scopeIds: input.scope === "ALL" ? [] : input.scopeIds,
      fundedBy: input.fundedBy,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      usageLimit: input.usageLimit ?? null,
      perCustomerLimit: input.perCustomerLimit,
      firstOrderOnly: input.firstOrderOnly,
      isActive: input.isActive
    };
  }
  async create(input, actor) {
    if (await this.db.coupon.findUnique({ where: { code: input.code } })) throw conflict("A coupon with this code already exists");
    const c2 = await this.db.coupon.create({ data: this.data(input) });
    await this.audit.record(actor, { action: "coupon.create", entityType: "Coupon", entityId: c2.id, after: c2 });
    return c2;
  }
  async update(id, input, actor) {
    const before = await this.db.coupon.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw notFound("Coupon");
    const c2 = await this.db.coupon.update({ where: { id }, data: this.data(input) });
    await this.audit.record(actor, { action: "coupon.update", entityType: "Coupon", entityId: id, before, after: c2 });
    return c2;
  }
  async remove(id, actor) {
    const before = await this.db.coupon.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw notFound("Coupon");
    await this.db.coupon.update({
      where: { id },
      data: { deletedAt: /* @__PURE__ */ new Date(), isActive: false, code: `${before.code}~${Date.now().toString(36)}`.slice(0, 40) }
    });
    await this.audit.record(actor, { action: "coupon.delete", entityType: "Coupon", entityId: id, before });
  }
  async usages(id, page, pageSize) {
    const [items, total] = await Promise.all([
      this.db.couponUsage.findMany({
        where: { couponId: id },
        include: { user: { select: { name: true, email: true } }, order: { select: { orderNumber: true, grandTotal: true } } },
        orderBy: { createdAt: "desc" },
        ...pageArgs(page, pageSize)
      }),
      this.db.couponUsage.count({ where: { couponId: id } })
    ]);
    return paginated(items, total, page, pageSize);
  }
};

// src/modules/customers/customer.service.ts
import { randomInt } from "crypto";
var MAX_ADDRESSES = 20;
var CustomerService = class {
  constructor(db2, auth, storefront, channels, audit) {
    this.db = db2;
    this.auth = auth;
    this.storefront = storefront;
    this.channels = channels;
    this.audit = audit;
  }
  db;
  auth;
  storefront;
  channels;
  audit;
  // ── Profile ────────────────────────────────────────────────
  async profile(userId) {
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        status: true,
        createdAt: true,
        deletionRequestedAt: true,
        customerProfile: true
      }
    });
    return user;
  }
  async updateProfile(userId, input) {
    const current = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    if (input.phone && input.phone !== current.phone) {
      const taken = await this.db.user.findUnique({ where: { phone: input.phone } });
      if (taken) throw conflict("This phone number is already registered");
    }
    await this.db.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        ...input.phone && input.phone !== current.phone ? { phone: input.phone, phoneVerifiedAt: null } : {},
        customerProfile: {
          upsert: {
            create: { gender: input.gender, dateOfBirth: input.dateOfBirth ?? null },
            update: { gender: input.gender, dateOfBirth: input.dateOfBirth }
          }
        }
      }
    });
    this.auth.invalidatePrincipal(userId);
    return this.profile(userId);
  }
  // ── Phone verification (OTP over the configured SMS channel; console in development) ──
  async requestPhoneOtp(userId) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.phone) throw businessRule("Add a phone number to your profile first");
    if (user.phoneVerifiedAt) throw businessRule("Your phone number is already verified");
    const otp = String(randomInt(1e5, 1e6));
    await this.db.verificationToken.updateMany({ where: { userId, type: "PHONE_OTP", usedAt: null }, data: { usedAt: /* @__PURE__ */ new Date() } });
    await this.db.verificationToken.deleteMany({ where: { tokenHash: sha256(`otp:${userId}:${otp}`) } });
    await this.db.verificationToken.create({
      data: { userId, type: "PHONE_OTP", tokenHash: sha256(`otp:${userId}:${otp}`), expiresAt: new Date(Date.now() + 10 * 6e4) }
    });
    await this.channels.sms.send({ to: user.phone, text: `Your Vyora verification code is ${otp}. It expires in 10 minutes.` });
    return { sentTo: `******${user.phone.slice(-4)}`, expiresInSeconds: 600 };
  }
  async verifyPhoneOtp(userId, otp) {
    if (!/^\d{6}$/.test(otp)) throw badRequest("Enter the 6-digit code");
    const row = await this.db.verificationToken.findUnique({ where: { tokenHash: sha256(`otp:${userId}:${otp}`) } });
    if (!row || row.userId !== userId || row.usedAt || row.expiresAt < /* @__PURE__ */ new Date()) throw badRequest("The code is incorrect or has expired");
    await this.db.verificationToken.updateMany({ where: { userId, type: "PHONE_OTP", usedAt: null }, data: { usedAt: /* @__PURE__ */ new Date() } });
    await this.db.user.update({ where: { id: userId }, data: { phoneVerifiedAt: /* @__PURE__ */ new Date() } });
  }
  /** GDPR-style deletion request: the account is flagged and signed out; an admin completes it. */
  async requestDeletion(userId, actor) {
    const openOrders = await this.db.order.count({
      where: { customerId: userId, status: { in: ["PENDING_CONFIRMATION", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY"] } }
    });
    if (openOrders) throw businessRule("Please wait until your open orders are delivered or cancelled before deleting your account");
    const seller = await this.db.seller.findUnique({ where: { userId } });
    if (seller && seller.status === "APPROVED") throw businessRule("Seller accounts must be deactivated by an admin before deletion");
    await this.db.user.update({ where: { id: userId }, data: { status: "DELETION_REQUESTED", deletionRequestedAt: /* @__PURE__ */ new Date() } });
    await this.audit.record(actor, { action: "user.deletion_requested", entityType: "User", entityId: userId });
    await this.auth.revokeAllSessions(userId);
  }
  // ── Addresses ──────────────────────────────────────────────
  listAddresses(userId) {
    return this.db.customerAddress.findMany({ where: { userId, deletedAt: null }, orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] });
  }
  async createAddress(userId, input) {
    const count = await this.db.customerAddress.count({ where: { userId, deletedAt: null } });
    if (count >= MAX_ADDRESSES) throw businessRule(`You can save up to ${MAX_ADDRESSES} addresses`);
    return this.db.$transaction(async (tx) => {
      const makeDefault = input.isDefault || count === 0;
      if (makeDefault && count > 0) await tx.customerAddress.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      return tx.customerAddress.create({ data: { ...input, userId, isDefault: makeDefault } });
    });
  }
  async updateAddress(userId, id, input) {
    const existing = await this.db.customerAddress.findFirst({ where: { id, userId, deletedAt: null } });
    if (!existing) throw notFound("Address");
    return this.db.$transaction(async (tx) => {
      if (input.isDefault) await tx.customerAddress.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.customerAddress.update({ where: { id }, data: { ...input, isDefault: input.isDefault || existing.isDefault } });
    });
  }
  async setDefaultAddress(userId, id) {
    const existing = await this.db.customerAddress.findFirst({ where: { id, userId, deletedAt: null } });
    if (!existing) throw notFound("Address");
    await this.db.$transaction([
      this.db.customerAddress.updateMany({ where: { userId }, data: { isDefault: false } }),
      this.db.customerAddress.update({ where: { id }, data: { isDefault: true } })
    ]);
  }
  async deleteAddress(userId, id) {
    const existing = await this.db.customerAddress.findFirst({ where: { id, userId, deletedAt: null } });
    if (!existing) throw notFound("Address");
    await this.db.customerAddress.update({ where: { id }, data: { deletedAt: /* @__PURE__ */ new Date(), isDefault: false } });
    if (existing.isDefault) {
      const next = await this.db.customerAddress.findFirst({ where: { userId, deletedAt: null }, orderBy: { updatedAt: "desc" } });
      if (next) await this.db.customerAddress.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }
  // ── Wishlist ───────────────────────────────────────────────
  async wishlistId(userId) {
    const w = await this.db.wishlist.upsert({ where: { userId }, create: { userId }, update: {} });
    return w.id;
  }
  async wishlist(userId) {
    const id = await this.wishlistId(userId);
    const items = await this.db.wishlistItem.findMany({
      where: { wishlistId: id, product: { deletedAt: null } },
      orderBy: { createdAt: "desc" },
      select: { productId: true, createdAt: true }
    });
    const products = await this.db.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
      select: {
        id: true,
        slug: true,
        title: true,
        minPrice: true,
        maxMrp: true,
        maxDiscountPct: true,
        inStock: true,
        ratingAvg: true,
        ratingCount: true,
        soldCount: true,
        isFeatured: true,
        publishedAt: true,
        codAvailable: true,
        status: true,
        brand: { select: { name: true, slug: true } },
        category: { select: { name: true, slug: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 2, select: { url: true, storageKey: true, alt: true } }
      }
    });
    const cards = await this.storefront.toCards(products);
    return items.map((i) => {
      const card = cards.find((c2) => c2.id === i.productId);
      const p = products.find((x) => x.id === i.productId);
      return card ? { ...card, addedAt: i.createdAt, available: p?.status === "APPROVED" && p.minPrice !== null } : null;
    }).filter(Boolean);
  }
  async wishlistIds(userId) {
    const w = await this.db.wishlist.findUnique({ where: { userId }, include: { items: { select: { productId: true } } } });
    return w?.items.map((i) => i.productId) ?? [];
  }
  async addToWishlist(userId, productId) {
    const product = await this.db.product.findFirst({ where: { id: productId, deletedAt: null, status: "APPROVED" } });
    if (!product) throw notFound("Product");
    const id = await this.wishlistId(userId);
    await this.db.wishlistItem.upsert({ where: { wishlistId_productId: { wishlistId: id, productId } }, create: { wishlistId: id, productId }, update: {} });
  }
  async removeFromWishlist(userId, productId) {
    const id = await this.wishlistId(userId);
    await this.db.wishlistItem.deleteMany({ where: { wishlistId: id, productId } });
  }
  // ── Recently viewed ────────────────────────────────────────
  async recordView(userId, productId) {
    await this.db.recentlyViewedProduct.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: { viewedAt: /* @__PURE__ */ new Date() }
    });
    const stale = await this.db.recentlyViewedProduct.findMany({ where: { userId }, orderBy: { viewedAt: "desc" }, skip: 50, select: { id: true } });
    if (stale.length) await this.db.recentlyViewedProduct.deleteMany({ where: { id: { in: stale.map((s2) => s2.id) } } });
  }
  async recentlyViewed(userId, limit = 12) {
    const rows = await this.db.recentlyViewedProduct.findMany({ where: { userId }, orderBy: { viewedAt: "desc" }, take: limit, select: { productId: true } });
    const products = await this.db.product.findMany({
      where: { id: { in: rows.map((r) => r.productId) }, status: "APPROVED", deletedAt: null, minPrice: { not: null } },
      select: {
        id: true,
        slug: true,
        title: true,
        minPrice: true,
        maxMrp: true,
        maxDiscountPct: true,
        inStock: true,
        ratingAvg: true,
        ratingCount: true,
        soldCount: true,
        isFeatured: true,
        publishedAt: true,
        codAvailable: true,
        brand: { select: { name: true, slug: true } },
        category: { select: { name: true, slug: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 2, select: { url: true, storageKey: true, alt: true } }
      }
    });
    const cards = await this.storefront.toCards(products);
    return rows.map((r) => cards.find((c2) => c2.id === r.productId)).filter(Boolean);
  }
  async subscribeStock(userId, productId) {
    const product = await this.db.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) throw notFound("Product");
    await this.db.stockSubscription.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: { notifiedAt: null }
    });
  }
};

// src/modules/finance/finance.service.ts
var SETTLEMENT_TRANSITIONS = {
  PENDING: ["APPROVED", "CANCELLED"],
  APPROVED: ["PROCESSING", "PAID", "CANCELLED"],
  PROCESSING: ["PAID", "FAILED"],
  FAILED: ["PROCESSING", "CANCELLED"],
  PAID: [],
  CANCELLED: []
};
var OPEN_SETTLEMENT = ["PENDING", "APPROVED", "PROCESSING", "FAILED"];
var FinanceService = class {
  constructor(db2, audit, notifications, defaultCommission) {
    this.db = db2;
    this.audit = audit;
    this.notifications = notifications;
    this.defaultCommission = defaultCommission;
  }
  db;
  audit;
  notifications;
  defaultCommission;
  async post(tx, entries) {
    const bySeller = /* @__PURE__ */ new Map();
    for (const e of entries.filter((e2) => e2.amount !== 0)) {
      if (!bySeller.has(e.sellerId)) bySeller.set(e.sellerId, []);
      bySeller.get(e.sellerId).push(e);
    }
    for (const [sellerId, list] of bySeller) {
      await tx.$queryRaw`SELECT id FROM \`Seller\` WHERE id = ${sellerId} FOR UPDATE`;
      const agg = await tx.sellerLedger.aggregate({ where: { sellerId }, _sum: { amount: true } });
      let balance = toPaise(agg._sum.amount);
      for (const e of list) {
        balance += e.amount;
        await tx.sellerLedger.create({
          data: {
            sellerId,
            type: e.type,
            amount: decimal(e.amount),
            balanceAfter: decimal(balance),
            description: e.description.slice(0, 300),
            orderId: e.orderId ?? null,
            sellerOrderId: e.sellerOrderId ?? null,
            orderItemId: e.orderItemId ?? null,
            settlementId: e.settlementId ?? null,
            actorId: e.actorId ?? null
          }
        });
      }
    }
  }
  async balances(sellerId, db2 = this.db) {
    const [ledger, open, byType] = await Promise.all([
      db2.sellerLedger.aggregate({ where: { sellerId }, _sum: { amount: true } }),
      db2.settlement.aggregate({ where: { sellerId, status: { in: OPEN_SETTLEMENT } }, _sum: { amount: true } }),
      db2.sellerLedger.groupBy({ by: ["type"], where: { sellerId }, _sum: { amount: true } })
    ]);
    const balance = toPaise(ledger._sum.amount);
    const reserved = toPaise(open._sum.amount);
    const t = (type) => toPaise(byType.find((b) => b.type === type)?._sum.amount);
    return {
      balance: fromPaise(balance),
      inSettlement: fromPaise(reserved),
      availableForSettlement: fromPaise(Math.max(0, balance - reserved)),
      totals: {
        sales: fromPaise(t("SALE_CREDIT")),
        shipping: fromPaise(t("SHIPPING_CREDIT")),
        commission: fromPaise(-t("COMMISSION_DEBIT")),
        commissionTax: fromPaise(-t("COMMISSION_TAX_DEBIT")),
        refunds: fromPaise(-t("REFUND_DEBIT")),
        commissionReversals: fromPaise(t("COMMISSION_REVERSAL_CREDIT")),
        paidOut: fromPaise(-t("SETTLEMENT_PAYOUT")),
        adjustments: fromPaise(t("MANUAL_ADJUSTMENT"))
      }
    };
  }
  async ledger(sellerId, q) {
    const where = {
      sellerId,
      ...q.type ? { type: q.type } : {},
      ...q.from || q.to ? { createdAt: { ...q.from ? { gte: q.from } : {}, ...q.to ? { lte: q.to } : {} } } : {}
    };
    const [items, total] = await Promise.all([
      this.db.sellerLedger.findMany({ where, orderBy: { createdAt: "desc" }, ...pageArgs(q.page, q.pageSize) }),
      this.db.sellerLedger.count({ where })
    ]);
    return paginated(
      items.map((i) => ({ ...i, amount: num(i.amount), balanceAfter: num(i.balanceAfter) })),
      total,
      q.page,
      q.pageSize
    );
  }
  async adjust(input, actor) {
    const seller = await this.db.seller.findUnique({ where: { id: input.sellerId } });
    if (!seller) throw notFound("Seller");
    await this.db.$transaction(async (tx) => {
      await this.post(tx, [
        {
          sellerId: input.sellerId,
          type: "MANUAL_ADJUSTMENT",
          amount: toPaise(input.amount),
          description: `Manual adjustment: ${input.reason}`,
          actorId: actor?.auth?.userId
        }
      ]);
      await this.audit.record(actor, { action: "ledger.adjust", entityType: "Seller", entityId: input.sellerId, after: input }, tx);
    });
    return this.balances(input.sellerId);
  }
  // ── Settlements ────────────────────────────────────────────
  async createSettlement(input, actor) {
    const seller = await this.db.seller.findUnique({ where: { id: input.sellerId } });
    if (!seller) throw notFound("Seller");
    const settlement = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM \`Seller\` WHERE id = ${input.sellerId} FOR UPDATE`;
      const b = await this.balances(input.sellerId, tx);
      if (toPaise(input.amount) > toPaise(b.availableForSettlement)) {
        throw businessRule(`Amount exceeds the seller's available balance of \u20B9${b.availableForSettlement.toFixed(2)}`);
      }
      const s2 = await tx.settlement.create({
        data: {
          settlementNumber: referenceNumber("ST"),
          sellerId: input.sellerId,
          amount: decimal(toPaise(input.amount)),
          periodStart: input.periodStart ?? null,
          periodEnd: input.periodEnd ?? null,
          notes: input.notes ?? null,
          createdById: actor?.auth?.userId ?? null,
          transactions: {
            create: { toStatus: "PENDING", amount: decimal(toPaise(input.amount)), note: input.notes ?? null, actorId: actor?.auth?.userId ?? null }
          }
        }
      });
      await this.audit.record(actor, { action: "settlement.create", entityType: "Settlement", entityId: s2.id, after: input }, tx);
      return s2;
    });
    await this.notifySettlement(settlement.id);
    return settlement;
  }
  async changeSettlementStatus(id, to, input, actor) {
    const s2 = await this.db.settlement.findUnique({ where: { id } });
    if (!s2) throw notFound("Settlement");
    if (!SETTLEMENT_TRANSITIONS[s2.status].includes(to)) {
      throw businessRule(`Cannot move a settlement from ${s2.status} to ${to}`);
    }
    if (to === "PAID" && !input.reference && !s2.reference) {
      throw businessRule("Enter the bank transfer / UTR reference before marking as paid");
    }
    await this.db.$transaction(async (tx) => {
      const updated = await tx.settlement.updateMany({
        where: { id, status: s2.status },
        data: {
          status: to,
          reference: input.reference ?? void 0,
          notes: input.notes ?? void 0,
          ...to === "APPROVED" ? { approvedAt: /* @__PURE__ */ new Date(), approvedById: actor?.auth?.userId ?? null } : {},
          ...to === "PAID" ? { paidAt: /* @__PURE__ */ new Date() } : {}
        }
      });
      if (updated.count !== 1) throw conflict("Settlement changed in the meantime");
      await tx.settlementTransaction.create({
        data: {
          settlementId: id,
          fromStatus: s2.status,
          toStatus: to,
          amount: s2.amount,
          reference: input.reference ?? null,
          note: input.notes ?? null,
          actorId: actor?.auth?.userId ?? null
        }
      });
      if (to === "PAID") {
        await this.post(tx, [
          {
            sellerId: s2.sellerId,
            type: "SETTLEMENT_PAYOUT",
            amount: -toPaise(s2.amount),
            description: `Payout ${s2.settlementNumber}${input.reference ? ` (ref ${input.reference})` : ""}`,
            settlementId: s2.id,
            actorId: actor?.auth?.userId
          }
        ]);
      }
      await this.audit.record(
        actor,
        { action: `settlement.${to.toLowerCase()}`, entityType: "Settlement", entityId: id, before: { status: s2.status }, after: { status: to, ...input } },
        tx
      );
    });
    await this.notifySettlement(id);
    return this.settlementDetail(id, { sellerId: null });
  }
  async notifySettlement(id) {
    const s2 = await this.db.settlement.findUnique({ where: { id }, include: { seller: { select: { userId: true } } } });
    if (!s2) return;
    await this.notifications.notify({
      key: "settlement.updated",
      userId: s2.seller.userId,
      link: "/seller/payouts",
      vars: {
        settlementNumber: s2.settlementNumber,
        status: s2.status.toLowerCase(),
        amount: `\u20B9${num(s2.amount).toFixed(2)}`,
        reference: s2.reference ? `Reference: ${s2.reference}` : ""
      }
    });
  }
  async listSettlements(scope, q) {
    const where = {
      ...scope.sellerId ? { sellerId: scope.sellerId } : q.sellerId ? { sellerId: q.sellerId } : {},
      ...q.status ? { status: q.status } : {}
    };
    const [items, total, sums] = await Promise.all([
      this.db.settlement.findMany({
        where,
        include: { seller: { select: { id: true, displayName: true, code: true } } },
        orderBy: { createdAt: "desc" },
        ...pageArgs(q.page, q.pageSize)
      }),
      this.db.settlement.count({ where }),
      this.db.settlement.groupBy({ by: ["status"], where, _sum: { amount: true }, _count: { _all: true } })
    ]);
    return {
      ...paginated(items.map((s2) => ({ ...s2, amount: num(s2.amount) })), total, q.page, q.pageSize),
      summary: Object.fromEntries(sums.map((s2) => [s2.status, { count: s2._count._all, amount: num(s2._sum.amount) }]))
    };
  }
  async settlementDetail(id, scope) {
    const s2 = await this.db.settlement.findFirst({
      where: { id, ...scope.sellerId ? { sellerId: scope.sellerId } : {} },
      include: { transactions: { orderBy: { createdAt: "asc" } }, seller: { select: { id: true, displayName: true, code: true } } }
    });
    if (!s2) throw notFound("Settlement");
    return { ...s2, amount: num(s2.amount), transactions: s2.transactions.map((t) => ({ ...t, amount: num(t.amount) })) };
  }
  /** Sellers with outstanding balances (admin payout planning). */
  async outstanding() {
    const rows = await this.db.sellerLedger.groupBy({ by: ["sellerId"], _sum: { amount: true } });
    const open = await this.db.settlement.groupBy({ by: ["sellerId"], where: { status: { in: OPEN_SETTLEMENT } }, _sum: { amount: true } });
    const sellers = await this.db.seller.findMany({
      where: { id: { in: rows.map((r) => r.sellerId) } },
      select: { id: true, displayName: true, code: true, status: true }
    });
    return rows.map((r) => {
      const balance = toPaise(r._sum.amount);
      const inSettlement = toPaise(open.find((o) => o.sellerId === r.sellerId)?._sum.amount);
      return {
        seller: sellers.find((s2) => s2.id === r.sellerId),
        balance: fromPaise(balance),
        inSettlement: fromPaise(inSettlement),
        available: fromPaise(Math.max(0, balance - inSettlement))
      };
    }).filter((r) => r.balance !== 0).sort((a, b) => b.available - a.available);
  }
  // ── Commission rules ───────────────────────────────────────
  async activeRules(db2 = this.db) {
    const rules = await db2.commissionRule.findMany({ where: { isActive: true } });
    return rules.map((r) => ({
      id: r.id,
      scope: r.scope,
      sellerId: r.sellerId,
      categoryId: r.categoryId,
      productId: r.productId,
      percentage: num(r.percentage),
      fixedAmount: toPaise(r.fixedAmount)
    }));
  }
  get defaultCommissionPercent() {
    return this.defaultCommission;
  }
  listRules(q) {
    return this.db.commissionRule.findMany({
      where: { ...q.scope ? { scope: q.scope } : {}, ...q.sellerId ? { sellerId: q.sellerId } : {} },
      include: {
        seller: { select: { id: true, displayName: true } },
        category: { select: { id: true, name: true } },
        product: { select: { id: true, title: true } }
      },
      orderBy: [{ scope: "asc" }, { createdAt: "desc" }]
    });
  }
  ruleData(input) {
    return {
      scope: input.scope,
      sellerId: ["SELLER", "SELLER_CATEGORY"].includes(input.scope) ? input.sellerId ?? null : null,
      categoryId: ["CATEGORY", "SELLER_CATEGORY"].includes(input.scope) ? input.categoryId ?? null : null,
      productId: input.scope === "PRODUCT" ? input.productId ?? null : null,
      percentage: input.percentage,
      fixedAmount: input.fixedAmount,
      isActive: input.isActive
    };
  }
  async createRule(input, actor) {
    const data = this.ruleData(input);
    const dup = await this.db.commissionRule.findFirst({
      where: { scope: data.scope, sellerId: data.sellerId, categoryId: data.categoryId, productId: data.productId, isActive: true }
    });
    if (dup && data.isActive) throw conflict("An active rule already exists for this scope. Edit it instead.");
    const rule = await this.db.commissionRule.create({ data });
    await this.audit.record(actor, { action: "commission.rule_create", entityType: "CommissionRule", entityId: rule.id, after: rule });
    return rule;
  }
  async updateRule(id, input, actor) {
    const before = await this.db.commissionRule.findUnique({ where: { id } });
    if (!before) throw notFound("Commission rule");
    const rule = await this.db.commissionRule.update({ where: { id }, data: this.ruleData(input) });
    await this.audit.record(actor, { action: "commission.rule_update", entityType: "CommissionRule", entityId: id, before, after: rule });
    return rule;
  }
  async deleteRule(id, actor) {
    const before = await this.db.commissionRule.findUnique({ where: { id } });
    if (!before) throw notFound("Commission rule");
    await this.db.commissionRule.delete({ where: { id } });
    await this.audit.record(actor, { action: "commission.rule_delete", entityType: "CommissionRule", entityId: id, before });
  }
  async commissions(scope, q) {
    const where = {
      ...scope.sellerId ? { sellerId: scope.sellerId } : q.sellerId ? { sellerId: q.sellerId } : {},
      ...q.status ? { status: q.status } : {}
    };
    const [items, total] = await Promise.all([
      this.db.commission.findMany({
        where,
        include: {
          orderItem: { select: { productName: true, sku: true, quantity: true, order: { select: { orderNumber: true } } } },
          seller: { select: { displayName: true } }
        },
        orderBy: { createdAt: "desc" },
        ...pageArgs(q.page, q.pageSize)
      }),
      this.db.commission.count({ where })
    ]);
    return paginated(
      items.map((c2) => ({ ...c2, baseAmount: num(c2.baseAmount), rate: num(c2.rate), amount: num(c2.amount), taxAmount: num(c2.taxAmount), fixedAmount: num(c2.fixedAmount) })),
      total,
      q.page,
      q.pageSize
    );
  }
};

// src/modules/inventory/inventory.service.ts
var InventoryService = class {
  constructor(db2, indexer, audit, notifications) {
    this.db = db2;
    this.indexer = indexer;
    this.audit = audit;
    this.notifications = notifications;
  }
  db;
  indexer;
  audit;
  notifications;
  async movement(tx, listingId, type, quantityDelta, reservedDelta, ref) {
    const inv = await tx.inventory.findUniqueOrThrow({ where: { listingId } });
    await tx.inventoryMovement.create({
      data: {
        inventoryId: inv.id,
        type,
        quantityDelta,
        reservedDelta,
        quantityAfter: inv.quantity,
        reservedAfter: inv.reserved,
        reason: ref.reason?.slice(0, 300),
        referenceType: ref.referenceType,
        referenceId: ref.referenceId,
        actorId: ref.actorId ?? null
      }
    });
    return inv;
  }
  /** Reserve stock for an order. Throws OUT_OF_STOCK if fewer than `qty` units are available. */
  async reserve(tx, listingId, qty, ref) {
    const affected = await tx.$executeRaw`
      UPDATE \`Inventory\` SET reserved = reserved + ${qty}, updatedAt = NOW(3)
      WHERE listingId = ${listingId} AND quantity - reserved >= ${qty}`;
    if (affected !== 1) throw outOfStock("Some items in your cart just went out of stock", [{ listingId }]);
    return this.movement(tx, listingId, "RESERVE", 0, qty, ref);
  }
  async release(tx, listingId, qty, ref) {
    const affected = await tx.$executeRaw`
      UPDATE \`Inventory\` SET reserved = reserved - ${qty}, updatedAt = NOW(3)
      WHERE listingId = ${listingId} AND reserved >= ${qty}`;
    if (affected !== 1) throw businessRule("Inventory reservation mismatch", [{ listingId }]);
    return this.movement(tx, listingId, "RELEASE", 0, -qty, ref);
  }
  /** Convert a reservation into a shipped (consumed) unit. */
  async consume(tx, listingId, qty, ref) {
    const affected = await tx.$executeRaw`
      UPDATE \`Inventory\` SET quantity = quantity - ${qty}, reserved = reserved - ${qty}, updatedAt = NOW(3)
      WHERE listingId = ${listingId} AND reserved >= ${qty} AND quantity >= ${qty}`;
    if (affected !== 1) throw businessRule("Inventory reservation mismatch", [{ listingId }]);
    return this.movement(tx, listingId, "SHIP", -qty, -qty, ref);
  }
  async restock(tx, listingId, qty, ref) {
    await tx.$executeRaw`
      UPDATE \`Inventory\` SET quantity = quantity + ${qty}, updatedAt = NOW(3) WHERE listingId = ${listingId}`;
    return this.movement(tx, listingId, "RETURN_RESTOCK", qty, 0, ref);
  }
  async initialize(tx, listingId, sellerId, quantity, lowStockThreshold, ref) {
    await tx.inventory.create({ data: { listingId, sellerId, quantity, lowStockThreshold } });
    return this.movement(tx, listingId, "INITIAL", quantity, 0, ref);
  }
  /**
   * Manual adjustment by a seller (own listings only) or admin. The new on-hand quantity can
   * never fall below the units already reserved for open orders.
   */
  async adjust(listingId, input, actor, scope, type = "ADJUSTMENT", tx) {
    if (input.delta === void 0 && input.setTo === void 0 && input.lowStockThreshold === void 0) {
      throw badRequest("Provide delta, setTo or lowStockThreshold");
    }
    const run = async (db2) => {
      const inv = await db2.inventory.findFirst({
        where: { listingId, ...scope.sellerId ? { sellerId: scope.sellerId } : {} },
        include: { listing: { select: { productId: true, sku: true } } }
      });
      if (!inv) throw notFound("Inventory");
      if (input.lowStockThreshold !== void 0) {
        await db2.inventory.update({ where: { id: inv.id }, data: { lowStockThreshold: input.lowStockThreshold } });
      }
      if (input.delta === void 0 && input.setTo === void 0) return inv;
      const target = input.setTo ?? inv.quantity + (input.delta ?? 0);
      if (target < 0) throw businessRule("Stock cannot be negative");
      const affected = await db2.$executeRaw`
        UPDATE \`Inventory\` SET quantity = ${target}, updatedAt = NOW(3),
          lowStockAlertedAt = IF(${target} - reserved > lowStockThreshold, NULL, lowStockAlertedAt)
        WHERE id = ${inv.id} AND ${target} >= reserved`;
      if (affected !== 1) {
        throw businessRule(`Stock cannot be set below the ${inv.reserved} unit(s) reserved for open orders`);
      }
      const after = await this.movement(db2, listingId, type, target - inv.quantity, 0, {
        reason: input.reason,
        actorId: actor?.auth?.userId,
        referenceType: "MANUAL"
      });
      await this.audit.record(
        actor,
        {
          action: "inventory.adjust",
          entityType: "Inventory",
          entityId: inv.id,
          before: { quantity: inv.quantity, reserved: inv.reserved },
          after: { quantity: after.quantity, reserved: after.reserved },
          metadata: { sku: inv.listing.sku, reason: input.reason }
        },
        db2
      );
      return { ...after, productId: inv.listing.productId, wasAvailable: inv.quantity - inv.reserved };
    };
    if (tx) return run(tx);
    const result = await this.db.$transaction((t) => run(t));
    if ("productId" in result) {
      await this.indexer.refresh([result.productId]);
      if (result.wasAvailable <= 0 && result.quantity - result.reserved > 0) {
        await this.notifyBackInStock(result.productId).catch(() => void 0);
      }
    }
    return result;
  }
  async bulkUpdate(sellerId, items, reason, actor) {
    const results = [];
    for (const item of items) {
      const listing = await this.db.sellerProductListing.findFirst({
        where: { sellerId, sku: item.sku, deletedAt: null },
        select: { id: true }
      });
      if (!listing) {
        results.push({ sku: item.sku, ok: false, error: "SKU not found" });
        continue;
      }
      try {
        await this.adjust(listing.id, { setTo: item.quantity, reason }, actor, { sellerId }, "IMPORT");
        results.push({ sku: item.sku, ok: true });
      } catch (err) {
        results.push({ sku: item.sku, ok: false, error: err.message });
      }
    }
    return { updated: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok), results };
  }
  async list(scope, q) {
    const where = {
      ...scope.sellerId ? { sellerId: scope.sellerId } : {},
      listing: {
        deletedAt: null,
        ...q.q ? { OR: [{ sku: { contains: q.q } }, { product: { title: { contains: q.q } } }] } : {}
      }
    };
    if (q.filter === "low" || q.filter === "out") {
      const sellerCond = scope.sellerId ?? null;
      const rows = q.filter === "out" ? await this.db.$queryRaw`
            SELECT id FROM \`Inventory\` WHERE (${sellerCond} IS NULL OR sellerId = ${sellerCond}) AND quantity - reserved <= 0` : await this.db.$queryRaw`
            SELECT id FROM \`Inventory\` WHERE (${sellerCond} IS NULL OR sellerId = ${sellerCond})
              AND quantity - reserved > 0 AND quantity - reserved <= lowStockThreshold`;
      where.id = { in: rows.map((r) => r.id) };
    }
    const [items, total] = await Promise.all([
      this.db.inventory.findMany({
        where,
        include: {
          listing: {
            select: {
              id: true,
              sku: true,
              price: true,
              status: true,
              isActive: true,
              variant: { select: { name: true } },
              product: { select: { id: true, title: true, slug: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } }
            }
          },
          seller: { select: { id: true, displayName: true } }
        },
        orderBy: { updatedAt: "desc" },
        ...pageArgs(q.page, q.pageSize)
      }),
      this.db.inventory.count({ where })
    ]);
    return paginated(
      items.map((i) => ({ ...i, available: i.quantity - i.reserved, isLow: i.quantity - i.reserved <= i.lowStockThreshold })),
      total,
      q.page,
      q.pageSize
    );
  }
  async movements(listingId, scope, page, pageSize) {
    const inv = await this.db.inventory.findFirst({
      where: { listingId, ...scope.sellerId ? { sellerId: scope.sellerId } : {} }
    });
    if (!inv) throw notFound("Inventory");
    const [items, total] = await Promise.all([
      this.db.inventoryMovement.findMany({ where: { inventoryId: inv.id }, orderBy: { createdAt: "desc" }, ...pageArgs(page, pageSize) }),
      this.db.inventoryMovement.count({ where: { inventoryId: inv.id } })
    ]);
    return paginated(items, total, page, pageSize);
  }
  /** Alert the seller once when a listing crosses its low-stock threshold (re-armed on restock). */
  async checkLowStock(listingIds) {
    for (const listingId of listingIds) {
      const inv = await this.db.inventory.findUnique({
        where: { listingId },
        include: { listing: { select: { sku: true, product: { select: { title: true } } } }, seller: { select: { userId: true } } }
      });
      if (!inv) continue;
      const available = inv.quantity - inv.reserved;
      if (available <= inv.lowStockThreshold && !inv.lowStockAlertedAt) {
        const claimed = await this.db.inventory.updateMany({
          where: { id: inv.id, lowStockAlertedAt: null },
          data: { lowStockAlertedAt: /* @__PURE__ */ new Date() }
        });
        if (claimed.count) {
          await this.notifications.notify({
            key: "inventory.low_stock",
            userId: inv.seller.userId,
            link: "/seller/inventory?filter=low",
            vars: { sku: inv.listing.sku, productName: inv.listing.product.title, available }
          });
        }
      }
    }
  }
  async notifyBackInStock(productId) {
    const subs = await this.db.stockSubscription.findMany({
      where: { productId, notifiedAt: null },
      include: { product: { select: { title: true, slug: true } } },
      take: 500
    });
    for (const s2 of subs) {
      await this.notifications.notify({
        key: "stock.back_in_stock",
        userId: s2.userId,
        link: `/p/${s2.product.slug}`,
        vars: { productName: s2.product.title }
      });
    }
    if (subs.length) {
      await this.db.stockSubscription.updateMany({ where: { id: { in: subs.map((s2) => s2.id) } }, data: { notifiedAt: /* @__PURE__ */ new Date() } });
    }
  }
};

// src/modules/notifications/templates.ts
var DEFAULT_TEMPLATES = {
  "auth.welcome": {
    subject: "Welcome to {{brand}}, {{name}}!",
    body: "Hi {{name}}, your {{brand}} account is ready. Start exploring thousands of products from trusted sellers.",
    channels: ["IN_APP", "EMAIL"],
    description: "Customer registration"
  },
  "auth.verify_email": {
    subject: "Verify your email for {{brand}}",
    body: "Hi {{name}}, please confirm your email address by opening this link: {{link}}\nThe link expires in 24 hours.",
    channels: ["EMAIL"],
    description: "Email verification link"
  },
  "auth.password_reset": {
    subject: "Reset your {{brand}} password",
    body: "Hi {{name}}, we received a request to reset your password. Open this link to choose a new one: {{link}}\nThe link expires in 1 hour. If you did not request this, you can ignore this email.",
    channels: ["EMAIL"],
    description: "Password reset link"
  },
  "seller.invite": {
    subject: "You have been invited to sell on {{brand}}",
    body: "Hi {{name}}, a seller account for {{businessName}} has been created for you. Set your password here: {{link}}\nThe link expires in 72 hours.",
    channels: ["EMAIL"],
    description: "Admin-created seller invitation"
  },
  "seller.registered": {
    subject: "We received your seller application",
    body: "Hi {{name}}, thanks for registering {{businessName}} on {{brand}}. Our team will review your application shortly.",
    channels: ["IN_APP", "EMAIL"],
    description: "Seller registration (to seller)"
  },
  "seller.registered_admin": {
    subject: "New seller application: {{businessName}}",
    body: "{{businessName}} ({{email}}) has applied to sell on {{brand}} and is awaiting approval.",
    channels: ["IN_APP"],
    description: "Seller registration (to admins)"
  },
  "seller.approved": {
    subject: "Your seller account is approved \u{1F389}",
    body: "Congratulations {{name}}! {{businessName}} is now approved on {{brand}}. You can start listing products from your seller dashboard.",
    channels: ["IN_APP", "EMAIL"],
    description: "Seller approval"
  },
  "seller.rejected": {
    subject: "Update on your seller application",
    body: "Hi {{name}}, unfortunately we could not approve {{businessName}} at this time. Reason: {{reason}}",
    channels: ["IN_APP", "EMAIL"],
    description: "Seller rejection"
  },
  "seller.suspended": {
    subject: "Your seller account has been suspended",
    body: "Hi {{name}}, {{businessName}} has been suspended. Reason: {{reason}}. Contact support for help.",
    channels: ["IN_APP", "EMAIL"],
    description: "Seller suspension"
  },
  "seller.reactivated": {
    subject: "Your seller account is active again",
    body: "Hi {{name}}, {{businessName}} has been reactivated on {{brand}}.",
    channels: ["IN_APP", "EMAIL"],
    description: "Seller reactivation"
  },
  "product.approved": {
    subject: "Product approved: {{productName}}",
    body: '"{{productName}}" has been approved and is now live on {{brand}}.',
    channels: ["IN_APP", "EMAIL"],
    description: "Product approval"
  },
  "product.rejected": {
    subject: "Product needs changes: {{productName}}",
    body: '"{{productName}}" was not approved. Reason: {{reason}}. Update the listing and resubmit it for review.',
    channels: ["IN_APP", "EMAIL"],
    description: "Product rejection"
  },
  "order.placed": {
    subject: "Order {{orderNumber}} placed successfully",
    body: "Hi {{name}}, thank you for shopping with {{brand}}! Your order {{orderNumber}} of {{amount}} has been placed. Payment: Cash on Delivery.",
    channels: ["IN_APP", "EMAIL"],
    description: "Order placed (customer)"
  },
  "order.new_for_seller": {
    subject: "New order {{subOrderNumber}}",
    body: "You have a new order {{subOrderNumber}} with {{itemCount}} item(s) worth {{amount}}. Please confirm it from your dashboard.",
    channels: ["IN_APP", "EMAIL"],
    description: "New order (seller)"
  },
  "order.status_changed": {
    subject: "Your order {{orderNumber}} is {{status}}",
    body: "Hi {{name}}, items from {{sellerName}} in order {{orderNumber}} are now {{status}}. {{note}}",
    channels: ["IN_APP", "EMAIL"],
    description: "Order status update (customer)"
  },
  "order.shipped": {
    subject: "Shipped: order {{orderNumber}}",
    body: "Good news {{name}}! Items from {{sellerName}} have shipped via {{carrier}}. Tracking number: {{trackingNumber}}.",
    channels: ["IN_APP", "EMAIL", "SMS"],
    description: "Shipment update"
  },
  "order.delivered": {
    subject: "Delivered: order {{orderNumber}}",
    body: "Hi {{name}}, your items from {{sellerName}} have been delivered. We hope you love them \u2014 leave a review!",
    channels: ["IN_APP", "EMAIL"],
    description: "Delivery confirmation"
  },
  "order.cancelled": {
    subject: "Order {{orderNumber}} cancelled",
    body: "Items in order {{orderNumber}} have been cancelled. Reason: {{reason}}",
    channels: ["IN_APP", "EMAIL"],
    description: "Cancellation (customer)"
  },
  "order.cancelled_seller": {
    subject: "Order {{subOrderNumber}} cancelled by customer",
    body: "The customer cancelled {{subOrderNumber}}. Reason: {{reason}}",
    channels: ["IN_APP"],
    description: "Cancellation (seller)"
  },
  "return.requested": {
    subject: "Return requested for {{subOrderNumber}}",
    body: "A customer requested a return ({{returnNumber}}) for {{subOrderNumber}}. Reason: {{reason}}",
    channels: ["IN_APP", "EMAIL"],
    description: "Return request (seller)"
  },
  "return.updated": {
    subject: "Return {{returnNumber}} {{status}}",
    body: "Hi {{name}}, your return {{returnNumber}} is now {{status}}. {{note}}",
    channels: ["IN_APP", "EMAIL"],
    description: "Return update (customer)"
  },
  "settlement.updated": {
    subject: "Settlement {{settlementNumber}} {{status}}",
    body: "Settlement {{settlementNumber}} of {{amount}} is now {{status}}. {{reference}}",
    channels: ["IN_APP", "EMAIL"],
    description: "Settlement status (seller)"
  },
  "inventory.low_stock": {
    subject: "Low stock: {{sku}}",
    body: "{{productName}} ({{sku}}) has only {{available}} unit(s) left.",
    channels: ["IN_APP", "EMAIL"],
    description: "Low-stock alert (seller)"
  },
  "stock.back_in_stock": {
    subject: "Back in stock: {{productName}}",
    body: "{{productName}} is available again on {{brand}}. Grab it before it sells out!",
    channels: ["IN_APP", "EMAIL"],
    description: "Availability notification (customer)"
  }
};
function render(template, vars) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => {
    const v = vars[k];
    return v === void 0 || v === null ? "" : String(v);
  });
}
var escapeHtml = (s2) => s2.replace(/[&<>"']/g, (c2) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c2]);

// src/modules/notifications/notification.service.ts
var JOB = "notification.dispatch";
var NotificationService = class {
  constructor(db2, env2, channels, jobs, settings) {
    this.db = db2;
    this.env = env2;
    this.channels = channels;
    this.jobs = jobs;
    this.settings = settings;
    jobs.register(JOB, (payload) => this.dispatch(payload));
  }
  db;
  env;
  channels;
  jobs;
  settings;
  /** Queue a notification. Never throws — notification failures must not break business flows. */
  async notify(input) {
    try {
      await this.jobs.enqueue(JOB, input);
    } catch (err) {
      logger.error({ err, key: input.key }, "failed to enqueue notification");
    }
  }
  /** Notify every active admin (in-app). */
  async notifyAdmins(input) {
    const admins = await this.db.user.findMany({
      where: { status: "ACTIVE", roles: { some: { role: { code: "ADMIN" } } } },
      select: { id: true },
      take: 50
    });
    await Promise.all(admins.map((a) => this.notify({ ...input, userId: a.id })));
  }
  async template(key, channel) {
    const override = await this.db.notificationTemplate.findUnique({ where: { key_channel: { key, channel } } });
    if (override) return override.isActive ? { subject: override.subject, body: override.body } : null;
    const def = DEFAULT_TEMPLATES[key];
    return def ? { subject: def.subject, body: def.body } : null;
  }
  /** Deliver a notification on each channel (runs in the job worker). */
  async dispatch(input) {
    const def = DEFAULT_TEMPLATES[input.key];
    const channels = input.channels ?? def?.channels ?? ["IN_APP"];
    const branding = await this.settings.get("branding");
    const user = input.userId ? await this.db.user.findUnique({ where: { id: input.userId }, select: { id: true, name: true, email: true, phone: true, status: true } }) : null;
    if (user && user.status === "DELETED") return;
    const vars = { brand: branding.name, name: user?.name ?? "", ...input.vars };
    for (const channel of channels) {
      const tpl = await this.template(input.key, channel);
      if (!tpl) continue;
      const subject = render(tpl.subject, vars);
      const body = render(tpl.body, vars);
      try {
        if (channel === "IN_APP" && user) {
          await this.db.notification.create({
            data: {
              userId: user.id,
              type: input.key,
              title: subject.slice(0, 200),
              body: body.slice(0, 1e3),
              link: input.link?.slice(0, 500) ?? null
            }
          });
        }
        if (channel === "EMAIL") {
          const to = input.email ?? user?.email;
          if (!to) continue;
          const msg = await this.db.outboundMessage.create({
            data: { channel: "EMAIL", recipient: to, subject, body, templateKey: input.key }
          });
          try {
            await this.channels.email.send({
              to,
              subject,
              text: body,
              html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#1f2330">${escapeHtml(body).replace(/\n/g, "<br>")}<p style="color:#8a8fa3;font-size:12px;margin-top:24px">${escapeHtml(branding.name)}</p></div>`
            });
            await this.db.outboundMessage.update({ where: { id: msg.id }, data: { status: "SENT", sentAt: /* @__PURE__ */ new Date() } });
          } catch (err) {
            await this.db.outboundMessage.update({
              where: { id: msg.id },
              data: { status: "FAILED", error: String(err.message).slice(0, 1e3) }
            });
          }
        }
        if (channel === "SMS") {
          const to = input.phone ?? user?.phone;
          if (!to) continue;
          await this.channels.sms.send({ to, text: body.slice(0, 300) });
          await this.db.outboundMessage.create({
            data: { channel: "SMS", recipient: to, body: body.slice(0, 300), status: "SENT", sentAt: /* @__PURE__ */ new Date(), templateKey: input.key }
          });
        }
      } catch (err) {
        logger.error({ err, key: input.key, channel }, "notification delivery failed");
      }
    }
  }
  // ── In-app inbox ──────────────────────────────────────────
  async list(userId, page, pageSize, unreadOnly = false) {
    const where = { userId, ...unreadOnly ? { readAt: null } : {} };
    const [items, total, unread] = await Promise.all([
      this.db.notification.findMany({ where, orderBy: { createdAt: "desc" }, ...pageArgs(page, pageSize) }),
      this.db.notification.count({ where }),
      this.db.notification.count({ where: { userId, readAt: null } })
    ]);
    return { ...paginated(items, total, page, pageSize), unread };
  }
  async markRead(userId, id) {
    await this.db.notification.updateMany({
      where: { userId, readAt: null, ...id ? { id } : {} },
      data: { readAt: /* @__PURE__ */ new Date() }
    });
  }
  // ── Admin: templates & dev inbox ──────────────────────────
  async listTemplates() {
    const overrides = await this.db.notificationTemplate.findMany();
    return Object.entries(DEFAULT_TEMPLATES).map(([key, def]) => ({
      key,
      description: def.description,
      channels: def.channels,
      defaults: { subject: def.subject, body: def.body },
      overrides: overrides.filter((o) => o.key === key)
    }));
  }
  async upsertTemplate(key, channel, data) {
    return this.db.notificationTemplate.upsert({
      where: { key_channel: { key, channel } },
      create: { key, channel, ...data },
      update: data
    });
  }
  async outbox(page, pageSize, recipient) {
    const where = recipient ? { recipient } : {};
    const [items, total] = await Promise.all([
      this.db.outboundMessage.findMany({ where, orderBy: { createdAt: "desc" }, ...pageArgs(page, pageSize) }),
      this.db.outboundMessage.count({ where })
    ]);
    return paginated(items, total, page, pageSize);
  }
  get frontendUrl() {
    return this.env.FRONTEND_URL.replace(/\/$/, "");
  }
};

// src/modules/orders/checkout.service.ts
var CheckoutService = class {
  constructor(db2, cart, coupons, inventory, shipping, finance, payments, settings, indexer, audit, notifications) {
    this.db = db2;
    this.cart = cart;
    this.coupons = coupons;
    this.inventory = inventory;
    this.shipping = shipping;
    this.finance = finance;
    this.payments = payments;
    this.settings = settings;
    this.indexer = indexer;
    this.audit = audit;
    this.notifications = notifications;
  }
  db;
  cart;
  coupons;
  inventory;
  shipping;
  finance;
  payments;
  settings;
  indexer;
  audit;
  notifications;
  /** COD eligibility rules: global switch, order value limits, restricted categories/products, PIN code. */
  async codEligibility(pricing, evaluated, pincode) {
    const cod = await this.settings.get("cod");
    const reasons = [];
    if (!cod.enabled) reasons.push("Cash on Delivery is currently unavailable");
    const total = fromPaise(pricing.grandTotal);
    if (cod.maxOrderValue && total > cod.maxOrderValue) reasons.push(`Cash on Delivery is available for orders up to \u20B9${cod.maxOrderValue}`);
    if (cod.minOrderValue && total < cod.minOrderValue) reasons.push(`Cash on Delivery needs a minimum order of \u20B9${cod.minOrderValue}`);
    const buyable = evaluated.filter((e) => e.purchasable);
    const blocked = buyable.filter((e) => !e.item.listing.product.codAvailable);
    if (blocked.length) reasons.push(`${blocked.map((b) => b.item.listing.product.title).join(", ")} cannot be paid by cash on delivery`);
    if (cod.restrictedCategoryIds.length) {
      const restricted = buyable.filter((e) => cod.restrictedCategoryIds.includes(e.item.listing.product.categoryId));
      if (restricted.length) reasons.push("Some items belong to categories that require prepaid payment");
    }
    if (pincode) {
      const check = await this.shipping.checkPincode(pincode);
      if (!check.serviceable) reasons.push(`We do not deliver to PIN code ${pincode} yet`);
      else if (!check.codAvailable) reasons.push(`Cash on Delivery is not available for PIN code ${pincode}`);
    }
    return { available: reasons.length === 0, reasons };
  }
  async ownAddress(userId, addressId) {
    const address = await this.db.customerAddress.findFirst({ where: { id: addressId, userId, deletedAt: null } });
    if (!address) throw notFound("Address");
    return address;
  }
  /** Checkout summary for the review step. Everything is recomputed server-side. */
  async quote(userId, input) {
    const cart = await this.cart.findCart({ userId });
    const items = cart ? await this.cart.items(cart.id) : [];
    const address = input.addressId ? await this.ownAddress(userId, input.addressId) : null;
    const pincode = address?.pincode ?? input.pincode ?? null;
    const couponCode = input.couponCode ?? cart?.couponCode ?? null;
    const { pricing, couponError, evaluated } = await this.cart.quote(items, {
      userId,
      couponCode,
      shippingMethod: input.shippingMethod
    });
    const [cod, delivery, methods] = await Promise.all([
      this.codEligibility(pricing, evaluated, pincode),
      pincode ? this.shipping.checkPincode(pincode, input.shippingMethod) : Promise.resolve(null),
      this.shipping.methods()
    ]);
    return {
      items: evaluated.map((e) => this.cart.itemView(e)),
      summary: summaryView(pricing),
      couponCode,
      couponError,
      hasIssues: evaluated.some((e) => !e.purchasable) || items.length === 0,
      priceChanged: evaluated.some((e) => e.priceChanged),
      delivery,
      shippingMethods: methods.filter((m) => m.isActive),
      paymentMethods: this.payments.methods().map((m) => ({
        ...m,
        available: m.method === "COD" ? cod.available : false,
        reasons: m.method === "COD" ? cod.reasons : []
      }))
    };
  }
  /**
   * Place an order. Guarantees:
   *  • idempotent per (customer, idempotencyKey) — retries return the original order;
   *  • all prices, discounts, shipping and taxes are recomputed from the database;
   *  • stock is reserved atomically; any shortfall rolls the whole order back;
   *  • coupon redemption is claimed atomically against its usage limit.
   */
  async placeOrder(userId, input, meta) {
    const existing = await this.db.order.findUnique({
      where: { customerId_idempotencyKey: { customerId: userId, idempotencyKey: input.idempotencyKey } },
      select: { id: true, orderNumber: true }
    });
    if (existing) return { ...existing, duplicate: true };
    const [user, address] = await Promise.all([
      this.db.user.findUniqueOrThrow({ where: { id: userId } }),
      this.ownAddress(userId, input.addressId)
    ]);
    if (user.status !== "ACTIVE") throw businessRule("Your account cannot place orders right now");
    const provider = this.payments.get(input.paymentMethod);
    try {
      const result = await this.db.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM \`User\` WHERE id = ${userId} FOR UPDATE`;
          const again = await tx.order.findUnique({
            where: { customerId_idempotencyKey: { customerId: userId, idempotencyKey: input.idempotencyKey } },
            select: { id: true, orderNumber: true }
          });
          if (again) return { ...again, duplicate: true, created: null };
          const cart = await tx.cart.findUnique({ where: { userId } });
          const items = cart ? await this.cart.items(cart.id, tx) : [];
          if (!items.length) throw businessRule("Your cart is empty");
          const couponCode = input.couponCode ?? cart?.couponCode ?? null;
          let coupon = null;
          if (couponCode) coupon = await this.coupons.validate(couponCode, userId, tx);
          const { pricing, evaluated } = await this.cart.quote(items, {
            userId,
            couponCode: coupon?.code ?? null,
            shippingMethod: input.shippingMethod
          });
          const problems = evaluated.filter((e) => !e.purchasable);
          if (problems.length) {
            throw new AppError(
              409,
              "OUT_OF_STOCK",
              "Some items in your cart are unavailable. Please review your cart.",
              problems.map((p) => ({ itemId: p.item.id, listingId: p.item.listingId, issue: p.issue }))
            );
          }
          if (coupon && !pricing.coupon?.applied) throw businessRule(pricing.coupon?.message ?? "Coupon cannot be applied");
          const changed = evaluated.filter((e) => e.priceChanged);
          const expected = input.expectedGrandTotal !== void 0 ? toPaise(input.expectedGrandTotal) : null;
          if (expected !== null && expected !== pricing.grandTotal || expected === null && changed.length) {
            throw new AppError(409, "PRICE_CHANGED", "Prices changed since you added these items. Please review the updated total.", [
              { grandTotal: fromPaise(pricing.grandTotal), items: changed.map((c2) => c2.item.id) }
            ]);
          }
          const cod = await this.codEligibility(pricing, evaluated, address.pincode);
          if (input.paymentMethod === "COD" && !cod.available) throw businessRule(cod.reasons[0] ?? "Cash on Delivery is unavailable");
          const delivery = await this.shipping.checkPincode(address.pincode, input.shippingMethod);
          if (!delivery.serviceable) throw businessRule(`We do not deliver to PIN code ${address.pincode} yet`);
          const orderNumber = referenceNumber("VY");
          for (const e of evaluated) {
            await this.inventory.reserve(tx, e.item.listingId, e.item.quantity, {
              referenceType: "ORDER",
              referenceId: orderNumber,
              reason: `Reserved for order ${orderNumber}`,
              actorId: userId
            });
          }
          const [rules, commissionSettings, orderSettings, taxSettings] = await Promise.all([
            this.finance.activeRules(tx),
            this.settings.get("commission"),
            this.settings.get("orders"),
            this.settings.get("tax")
          ]);
          const itemByListing = new Map(evaluated.map((e) => [e.item.listingId, e.item]));
          const initialStatus = orderSettings.autoConfirm ? "CONFIRMED" : "PENDING_CONFIRMATION";
          const order = await tx.order.create({
            data: {
              orderNumber,
              customerId: userId,
              idempotencyKey: input.idempotencyKey,
              status: initialStatus,
              paymentMethod: input.paymentMethod,
              paymentStatus: "COD_PENDING",
              shippingMethod: input.shippingMethod,
              itemsSubtotal: decimal(pricing.itemsSubtotal),
              mrpTotal: decimal(pricing.mrpTotal),
              discountTotal: decimal(pricing.discountTotal),
              shippingTotal: decimal(pricing.shippingTotal),
              codFee: decimal(pricing.codFee),
              taxTotal: decimal(pricing.taxTotal),
              grandTotal: decimal(pricing.grandTotal),
              couponId: coupon?.id ?? null,
              couponCode: coupon?.code ?? null,
              shipName: address.fullName,
              shipPhone: address.phone,
              shipLine1: address.line1,
              shipLine2: address.line2,
              shipLandmark: address.landmark,
              shipCity: address.city,
              shipState: address.state,
              shipPincode: address.pincode,
              notes: input.notes ?? null
            }
          });
          const createdSellerOrders = [];
          for (const [gi, group] of pricing.groups.entries()) {
            const first = itemByListing.get(group.lines[0].key);
            let commissionTotal = 0;
            const subOrderNumber = `${orderNumber}-${gi + 1}`;
            const so = await tx.sellerOrder.create({
              data: {
                subOrderNumber,
                orderId: order.id,
                sellerId: group.sellerId,
                status: initialStatus,
                fulfillmentMode: first.listing.seller.fulfillmentMode,
                itemsSubtotal: decimal(group.itemsSubtotal),
                discountTotal: decimal(group.discount),
                shippingTotal: decimal(group.shipping),
                taxTotal: decimal(group.tax),
                grandTotal: decimal(group.total),
                confirmedAt: orderSettings.autoConfirm ? /* @__PURE__ */ new Date() : null
              }
            });
            for (const line of group.lines) {
              const item = itemByListing.get(line.key);
              const rule = resolveCommission(
                rules,
                { sellerId: line.sellerId, productId: line.productId, categoryLineage: line.categoryIds },
                this.finance.defaultCommissionPercent
              );
              const c2 = commissionFor(line, rule, commissionSettings.taxRate);
              commissionTotal += c2.commission;
              const oi = await tx.orderItem.create({
                data: {
                  orderId: order.id,
                  sellerOrderId: so.id,
                  sellerId: line.sellerId,
                  listingId: item.listingId,
                  productId: item.listing.productId,
                  variantId: item.listing.variantId,
                  categoryId: item.listing.product.categoryId,
                  productName: item.listing.product.title,
                  variantName: item.listing.variant.name === "Default" ? null : item.listing.variant.name,
                  sku: item.listing.sku,
                  sellerName: item.listing.seller.displayName,
                  imageUrl: item.listing.product.images[0]?.url ?? null,
                  hsnCode: item.listing.product.hsnCode,
                  unitPrice: decimal(line.unitPrice),
                  unitMrp: decimal(line.unitMrp),
                  quantity: line.quantity,
                  lineSubtotal: decimal(line.lineSubtotal),
                  discountAmount: decimal(line.discount),
                  sellerFundedDiscount: decimal(line.sellerFundedDiscount),
                  shippingAmount: decimal(line.shipping),
                  taxRate: line.taxRate,
                  taxAmount: decimal(line.tax),
                  taxInclusive: taxSettings.pricesInclusive,
                  lineTotal: decimal(line.total),
                  commissionRate: rule.percentage,
                  commissionFixed: decimal(rule.fixedPerUnit),
                  commissionAmount: decimal(c2.commission),
                  status: initialStatus,
                  isReturnable: item.listing.product.isReturnable,
                  returnWindowDays: item.listing.product.returnWindowDays
                }
              });
              await tx.commission.create({
                data: {
                  orderItemId: oi.id,
                  sellerId: line.sellerId,
                  baseAmount: decimal(c2.base),
                  rate: rule.percentage,
                  fixedAmount: decimal(rule.fixedPerUnit * line.quantity),
                  amount: decimal(c2.commission),
                  taxRate: commissionSettings.taxRate,
                  taxAmount: decimal(c2.commissionTax),
                  ruleId: rule.ruleId,
                  ruleScope: rule.scope
                }
              });
              await tx.product.update({ where: { id: item.listing.productId }, data: { soldCount: { increment: line.quantity } } });
            }
            await tx.sellerOrder.update({ where: { id: so.id }, data: { commissionTotal: decimal(commissionTotal) } });
            await tx.orderStatusHistory.create({
              data: { orderId: order.id, sellerOrderId: so.id, toStatus: initialStatus, actorId: userId, actorRole: "CUSTOMER", note: "Order placed" }
            });
            createdSellerOrders.push({
              id: so.id,
              sellerId: group.sellerId,
              subOrderNumber,
              total: fromPaise(group.total),
              itemCount: group.lines.reduce((s2, l) => s2 + l.quantity, 0)
            });
          }
          const payment = await provider.createPayment({
            orderId: order.id,
            orderNumber,
            amount: pricing.grandTotal,
            currency: "INR",
            customer: { id: user.id, email: user.email, phone: user.phone, name: user.name }
          });
          await tx.payment.create({
            data: {
              orderId: order.id,
              provider: provider.code,
              method: input.paymentMethod,
              amount: decimal(pricing.grandTotal),
              status: payment.status,
              providerRef: payment.providerRef ?? null
            }
          });
          await tx.order.update({ where: { id: order.id }, data: { paymentStatus: payment.status } });
          await tx.orderStatusHistory.create({
            data: { orderId: order.id, toStatus: initialStatus, actorId: userId, actorRole: "CUSTOMER", note: `Order placed \xB7 ${provider.label}` }
          });
          if (coupon) await this.coupons.redeem(tx, coupon, userId, order.id, pricing.discountTotal + (pricing.coupon?.shippingWaived ?? 0));
          await tx.cartItem.deleteMany({ where: { id: { in: evaluated.map((e) => e.item.id) } } });
          if (cart) await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
          await this.audit.record(
            { auth: null, ip: meta.ip, userAgent: meta.userAgent },
            {
              action: "order.place",
              entityType: "Order",
              entityId: order.id,
              after: { orderNumber, grandTotal: fromPaise(pricing.grandTotal), sellers: createdSellerOrders.length }
            },
            tx
          );
          return {
            id: order.id,
            orderNumber,
            duplicate: false,
            created: { sellerOrders: createdSellerOrders, grandTotal: fromPaise(pricing.grandTotal), listingIds: evaluated.map((e) => e.item.listingId), productIds: evaluated.map((e) => e.item.listing.productId) }
          };
        },
        { maxWait: 1e4, timeout: 3e4 }
      );
      if (result.created) {
        const c2 = result.created;
        await this.notifications.notify({
          key: "order.placed",
          userId,
          link: `/account/orders/${result.id}`,
          vars: { orderNumber: result.orderNumber, amount: `\u20B9${c2.grandTotal.toFixed(2)}` }
        });
        const sellers = await this.db.seller.findMany({ where: { id: { in: c2.sellerOrders.map((s2) => s2.sellerId) } }, select: { id: true, userId: true } });
        for (const so of c2.sellerOrders) {
          await this.notifications.notify({
            key: "order.new_for_seller",
            userId: sellers.find((s2) => s2.id === so.sellerId).userId,
            link: `/seller/orders/${so.id}`,
            vars: { subOrderNumber: so.subOrderNumber, itemCount: so.itemCount, amount: `\u20B9${so.total.toFixed(2)}` }
          });
        }
        await this.indexer.refresh(c2.productIds);
        await this.inventory.checkLowStock(c2.listingIds).catch((err) => logger.error({ err }, "low-stock check failed"));
      }
      return { id: result.id, orderNumber: result.orderNumber, duplicate: result.duplicate };
    } catch (err) {
      if (isUniqueViolation(err, "idempotencyKey")) {
        const winner = await this.db.order.findUnique({
          where: { customerId_idempotencyKey: { customerId: userId, idempotencyKey: input.idempotencyKey } },
          select: { id: true, orderNumber: true }
        });
        if (winner) return { ...winner, duplicate: true };
      }
      if (err instanceof AppError) throw err;
      if (isUniqueViolation(err)) throw badRequest("Please try placing the order again");
      throw err;
    }
  }
};

// src/modules/orders/fulfillment.service.ts
var activeQty = (i) => i.quantity - i.cancelledQuantity;
var FulfillmentService = class {
  constructor(db2, inventory, finance, coupons, shipping, settings, indexer, audit, notifications) {
    this.db = db2;
    this.inventory = inventory;
    this.finance = finance;
    this.coupons = coupons;
    this.shipping = shipping;
    this.settings = settings;
    this.indexer = indexer;
    this.audit = audit;
    this.notifications = notifications;
  }
  db;
  inventory;
  finance;
  coupons;
  shipping;
  settings;
  indexer;
  audit;
  notifications;
  actorRole(actor) {
    return primaryRole(actor?.auth ?? null);
  }
  /** Load a sub-order the caller may act on. Other sellers' sub-orders are reported as not found. */
  async loadSellerOrder(tx, sellerOrderId, scope) {
    const so = await tx.sellerOrder.findFirst({
      where: {
        id: sellerOrderId,
        ...scope.kind === "seller" ? { sellerId: scope.sellerId } : {},
        ...scope.kind === "customer" ? { order: { customerId: scope.userId } } : {}
      },
      include: { items: true, order: true, seller: { select: { id: true, status: true, userId: true, displayName: true } } }
    });
    if (!so) throw notFound("Order");
    return so;
  }
  /** Recompute the parent order status and payment amount after any sub-order change. */
  async syncParent(tx, orderId, actor, note) {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { sellerOrders: true, items: true, payments: true } });
    const next = deriveParentStatus(order.sellerOrders.map((s2) => s2.status));
    const allCancelled = next === "CANCELLED";
    const allDelivered = order.sellerOrders.filter((s2) => s2.status !== "CANCELLED").every((s2) => s2.status === "DELIVERED");
    const due = order.items.reduce((s2, i) => s2 + prorate(toPaise(i.lineTotal), activeQty(i), i.quantity), 0) + (allCancelled ? 0 : toPaise(order.codFee));
    const payment = order.payments[0];
    if (payment) {
      const collected = toPaise(payment.collected);
      const status = allCancelled && collected === 0 ? "FAILED" : payment.status;
      await tx.payment.update({ where: { id: payment.id }, data: { amount: decimal(due), status } });
      if (status !== order.paymentStatus) await tx.order.update({ where: { id: orderId }, data: { paymentStatus: status } });
    }
    if (next !== order.status) {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: next,
          cancelledAt: allCancelled ? /* @__PURE__ */ new Date() : void 0,
          deliveredAt: allDelivered && next === "DELIVERED" ? /* @__PURE__ */ new Date() : void 0
        }
      });
      await tx.orderStatusHistory.create({
        data: { orderId, fromStatus: order.status, toStatus: next, note: note ?? null, actorId: actor?.auth?.userId ?? null, actorRole: this.actorRole(actor) }
      });
    }
    if (allCancelled) await this.coupons.release(tx, orderId);
    return next;
  }
  /** Cancel `qty` units of each given item (pre-shipment only). Releases stock and reverses commission. */
  async cancelItems(tx, items, reason, actor) {
    for (const { item, qty } of items) {
      if (qty <= 0) continue;
      if (item.listingId) {
        await this.inventory.release(tx, item.listingId, qty, {
          referenceType: "ORDER_ITEM",
          referenceId: item.id,
          reason: `Cancelled: ${reason}`,
          actorId: actor?.auth?.userId
        });
      }
      const cancelledQuantity = item.cancelledQuantity + qty;
      const full = cancelledQuantity >= item.quantity;
      await tx.orderItem.update({
        where: { id: item.id },
        data: { cancelledQuantity, status: full ? "CANCELLED" : void 0 }
      });
      if (full) await tx.commission.updateMany({ where: { orderItemId: item.id }, data: { status: "REVERSED" } });
      if (item.productId) await tx.product.update({ where: { id: item.productId }, data: { soldCount: { decrement: qty } } });
    }
  }
  // ── Seller / admin fulfillment ─────────────────────────────
  async updateSellerOrderStatus(sellerOrderId, to, input, scope, actor) {
    if (scope.kind === "customer") throw forbidden();
    const result = await this.db.$transaction(async (tx) => {
      const so = await this.loadSellerOrder(tx, sellerOrderId, scope);
      if (!canTransition(so.status, to)) {
        throw businessRule(`An order that is ${ORDER_STATUS_LABELS[so.status].toLowerCase()} cannot be marked ${ORDER_STATUS_LABELS[to].toLowerCase()}`);
      }
      if (scope.kind === "seller" && to !== "CANCELLED") {
        const sellersSettings = await this.settings.get("sellers");
        if (so.seller.status !== "APPROVED") {
          if (to === "CONFIRMED") throw forbidden("Your seller account cannot accept new orders while it is not active");
          if (!(so.seller.status === "SUSPENDED" && sellersSettings.suspendedCanFulfillExisting)) {
            throw forbidden("Your seller account cannot process orders right now");
          }
        }
      }
      if (to === "SHIPPED" && !input.trackingNumber && so.fulfillmentMode === "SELLER") {
        throw badRequest("Enter the carrier and tracking number to mark the order as shipped");
      }
      const moved = await tx.sellerOrder.updateMany({
        where: { id: so.id, status: so.status },
        data: {
          status: to,
          ...to === "CONFIRMED" ? { confirmedAt: /* @__PURE__ */ new Date() } : {},
          ...to === "SHIPPED" ? { shippedAt: /* @__PURE__ */ new Date() } : {},
          ...to === "DELIVERED" ? { deliveredAt: /* @__PURE__ */ new Date() } : {},
          ...to === "CANCELLED" ? { cancelledAt: /* @__PURE__ */ new Date(), cancelReason: input.note ?? "Cancelled by seller" } : {}
        }
      });
      if (moved.count !== 1) throw conflict("This order was updated by someone else. Refresh and try again.");
      const active = so.items.filter((i) => activeQty(i) > 0);
      if (to === "CANCELLED") {
        await this.cancelItems(tx, active.map((item) => ({ item, qty: activeQty(item) })), input.note ?? "Rejected by seller", actor);
      } else {
        await tx.orderItem.updateMany({ where: { id: { in: active.map((i) => i.id) } }, data: { status: to } });
      }
      if (to === "SHIPPED") {
        for (const item of active) {
          if (item.listingId) {
            await this.inventory.consume(tx, item.listingId, activeQty(item), {
              referenceType: "ORDER_ITEM",
              referenceId: item.id,
              reason: `Shipped in ${so.subOrderNumber}`,
              actorId: actor?.auth?.userId
            });
          }
        }
        const rule = await this.shipping.rule(so.order.shippingMethod).catch(() => null);
        const day = 864e5;
        await tx.shipment.create({
          data: {
            sellerOrderId: so.id,
            carrier: input.carrier ?? (so.fulfillmentMode === "PLATFORM" ? "Vyora Logistics" : null),
            trackingNumber: input.trackingNumber ?? null,
            trackingUrl: input.trackingUrl ?? null,
            status: "SHIPPED",
            shippedAt: /* @__PURE__ */ new Date(),
            estimatedFrom: rule ? new Date(Date.now() + rule.minDays * day) : null,
            estimatedTo: rule ? new Date(Date.now() + rule.maxDays * day) : null,
            items: { create: active.map((i) => ({ orderItemId: i.id, quantity: activeQty(i) })) },
            events: { create: { status: "SHIPPED", note: input.note ?? "Handed over to carrier" } }
          }
        });
      }
      if (to === "OUT_FOR_DELIVERY" || to === "DELIVERED") {
        const shipment = await tx.shipment.findFirst({ where: { sellerOrderId: so.id }, orderBy: { createdAt: "desc" } });
        if (shipment) {
          await tx.shipment.update({
            where: { id: shipment.id },
            data: { status: to, ...to === "DELIVERED" ? { deliveredAt: /* @__PURE__ */ new Date() } : {} }
          });
          await tx.shipmentEvent.create({ data: { shipmentId: shipment.id, status: to, note: input.note ?? null } });
        }
      }
      await tx.orderStatusHistory.create({
        data: {
          orderId: so.orderId,
          sellerOrderId: so.id,
          fromStatus: so.status,
          toStatus: to,
          note: input.note ?? null,
          actorId: actor?.auth?.userId ?? null,
          actorRole: this.actorRole(actor)
        }
      });
      await this.syncParent(tx, so.orderId, actor);
      await this.audit.record(
        actor,
        {
          action: `order.fulfillment.${to.toLowerCase()}`,
          entityType: "SellerOrder",
          entityId: so.id,
          before: { status: so.status },
          after: { status: to, ...input }
        },
        tx
      );
      return so;
    });
    const productIds = result.items.map((i) => i.productId).filter(Boolean);
    await this.indexer.refresh(productIds);
    const key = to === "SHIPPED" ? "order.shipped" : to === "DELIVERED" ? "order.delivered" : to === "CANCELLED" ? "order.cancelled" : "order.status_changed";
    await this.notifications.notify({
      key,
      userId: result.order.customerId,
      link: `/account/orders/${result.orderId}`,
      vars: {
        orderNumber: result.order.orderNumber,
        sellerName: result.seller.displayName,
        status: ORDER_STATUS_LABELS[to].toLowerCase(),
        note: input.note ?? "",
        reason: input.note ?? "The seller could not fulfil these items",
        carrier: input.carrier ?? "our delivery partner",
        trackingNumber: input.trackingNumber ?? "\u2014"
      }
    });
    return { id: result.id, status: to };
  }
  // ── Customer cancellation ──────────────────────────────────
  async cancelByCustomer(userId, orderId, input, actor) {
    const affected = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM \`Order\` WHERE id = ${orderId} AND customerId = ${userId} FOR UPDATE`;
      const order = await tx.order.findFirst({
        where: { id: orderId, customerId: userId },
        include: { sellerOrders: { include: { items: true, seller: { select: { userId: true } } } } }
      });
      if (!order) throw notFound("Order");
      const requested = input.orderItemIds?.length ? new Set(input.orderItemIds) : null;
      const touched = [];
      for (const so of order.sellerOrders) {
        const items = so.items.filter((i) => activeQty(i) > 0 && (!requested || requested.has(i.id)));
        if (!items.length) continue;
        if (!CUSTOMER_CANCELLABLE.includes(so.status)) {
          if (requested) throw businessRule(`Items from ${so.items[0]?.sellerName ?? "this seller"} have already shipped and can no longer be cancelled`);
          continue;
        }
        await this.cancelItems(tx, items.map((item) => ({ item, qty: activeQty(item) })), input.reason, actor);
        const remaining = await tx.orderItem.count({ where: { sellerOrderId: so.id, status: { not: "CANCELLED" } } });
        if (remaining === 0) {
          await tx.sellerOrder.update({
            where: { id: so.id },
            data: { status: "CANCELLED", cancelledAt: /* @__PURE__ */ new Date(), cancelReason: `Customer: ${input.reason}` }
          });
        }
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            sellerOrderId: so.id,
            fromStatus: so.status,
            toStatus: remaining === 0 ? "CANCELLED" : so.status,
            note: `Cancelled by customer (${items.length} item${items.length > 1 ? "s" : ""}): ${input.reason}`,
            actorId: userId,
            actorRole: "CUSTOMER"
          }
        });
        touched.push(so);
      }
      if (requested) {
        const known = new Set(order.sellerOrders.flatMap((s2) => s2.items.map((i) => i.id)));
        if ([...requested].some((id) => !known.has(id))) throw notFound("Order item");
      }
      if (!touched.length) throw businessRule("Nothing in this order can be cancelled anymore");
      await this.syncParent(tx, orderId, actor, "Cancelled by customer");
      await this.audit.record(actor, { action: "order.cancel", entityType: "Order", entityId: orderId, after: input }, tx);
      return { order, touched };
    });
    await this.indexer.refresh(affected.touched.flatMap((s2) => s2.items.map((i) => i.productId)).filter(Boolean));
    await this.notifications.notify({
      key: "order.cancelled",
      userId,
      link: `/account/orders/${orderId}`,
      vars: { orderNumber: affected.order.orderNumber, reason: input.reason }
    });
    for (const so of affected.touched) {
      await this.notifications.notify({
        key: "order.cancelled_seller",
        userId: so.seller.userId,
        link: `/seller/orders/${so.id}`,
        vars: { subOrderNumber: so.subOrderNumber, reason: input.reason }
      });
    }
  }
  /** Admin cancellation of a sub-order before shipment (e.g. fraud, unreachable customer). */
  async cancelByAdmin(sellerOrderId, reason, actor) {
    return this.updateSellerOrderStatus(sellerOrderId, "CANCELLED", { note: reason }, { kind: "admin" }, actor);
  }
  // ── COD collection & seller earnings ───────────────────────
  /**
   * Confirm that cash for a delivered sub-order has been received (courier remittance).
   * Only now does the seller earn: sale credit, commission and commission-tax debits and
   * (for seller-fulfilled orders) the shipping fee are posted to the seller ledger.
   */
  async confirmCodCollection(sellerOrderId, input, actor) {
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM \`SellerOrder\` WHERE id = ${sellerOrderId} FOR UPDATE`;
      const so = await tx.sellerOrder.findUnique({
        where: { id: sellerOrderId },
        include: { items: { include: { commission: true } }, order: { include: { payments: true, sellerOrders: true } } }
      });
      if (!so) throw notFound("Order");
      if (so.status !== "DELIVERED") throw businessRule("Cash can only be confirmed for delivered orders");
      if (so.codCollected) throw conflict("Cash collection was already confirmed for this order");
      const payment = so.order.payments[0];
      if (!payment || payment.method !== "COD") throw businessRule("This order is not a Cash on Delivery order");
      const entries = [];
      let collected = 0;
      for (const item of so.items) {
        const qty = activeQty(item);
        if (qty <= 0) continue;
        collected += prorate(toPaise(item.lineTotal), qty, item.quantity);
        const earnQty = qty - item.returnedQuantity;
        if (earnQty <= 0) continue;
        const base = prorate(toPaise(item.lineSubtotal) - toPaise(item.sellerFundedDiscount), earnQty, item.quantity);
        const commission = prorate(toPaise(item.commissionAmount), earnQty, item.quantity);
        const commissionTax = prorate(toPaise(item.commission?.taxAmount ?? 0), earnQty, item.quantity);
        const common = { sellerId: so.sellerId, orderId: so.orderId, sellerOrderId: so.id, orderItemId: item.id, actorId: actor?.auth?.userId };
        entries.push(
          { ...common, type: "SALE_CREDIT", amount: base, description: `Sale ${so.subOrderNumber} \xB7 ${item.productName} \xD7 ${earnQty}` },
          { ...common, type: "COMMISSION_DEBIT", amount: -commission, description: `Commission ${Number(item.commissionRate)}% \xB7 ${so.subOrderNumber}` },
          { ...common, type: "COMMISSION_TAX_DEBIT", amount: -commissionTax, description: `GST on commission \xB7 ${so.subOrderNumber}` }
        );
        if (so.fulfillmentMode === "SELLER") {
          entries.push({
            ...common,
            type: "SHIPPING_CREDIT",
            amount: prorate(toPaise(item.shippingAmount), earnQty, item.quantity),
            description: `Shipping fee \xB7 ${so.subOrderNumber}`
          });
        }
        if (item.commission) await tx.commission.update({ where: { id: item.commission.id }, data: { status: "EARNED" } });
      }
      await this.finance.post(tx, entries);
      await tx.sellerOrder.update({ where: { id: so.id }, data: { codCollected: true, codCollectedAt: /* @__PURE__ */ new Date() } });
      const others = so.order.sellerOrders.filter((s2) => s2.id !== so.id && s2.status !== "CANCELLED");
      const isLast = others.every((s2) => s2.codCollected);
      const newCollected = toPaise(payment.collected) + collected + (isLast ? toPaise(so.order.codFee) : 0);
      const paid = isLast;
      const hasPendingRefunds = await tx.refund.count({ where: { orderId: so.orderId, status: "PENDING" } }) > 0;
      const status = paid ? hasPendingRefunds ? "REFUND_PENDING" : "PAID" : "COD_PENDING";
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          collected: decimal(newCollected),
          status,
          paidAt: paid ? /* @__PURE__ */ new Date() : void 0,
          providerRef: input.reference ?? payment.providerRef
        }
      });
      await tx.order.update({ where: { id: so.orderId }, data: { paymentStatus: status } });
      await this.audit.record(
        actor,
        {
          action: "payment.cod_collected",
          entityType: "SellerOrder",
          entityId: so.id,
          after: { collected: fromPaise(collected), reference: input.reference, ledgerEntries: entries.length }
        },
        tx
      );
    });
  }
  // ── Returns ────────────────────────────────────────────────
  async requestReturn(userId, orderId, input, actor) {
    const returnsSettings = await this.settings.get("returns");
    if (!returnsSettings.enabled) throw businessRule("Returns are currently not accepted");
    const created = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM \`Order\` WHERE id = ${orderId} AND customerId = ${userId} FOR UPDATE`;
      const order = await tx.order.findFirst({
        where: { id: orderId, customerId: userId },
        include: {
          items: { include: { returnItems: { include: { returnRequest: { select: { status: true } } } }, sellerOrder: true } }
        }
      });
      if (!order) throw notFound("Order");
      const bySellerOrder = /* @__PURE__ */ new Map();
      for (const req of input.items) {
        const item = order.items.find((i) => i.id === req.orderItemId);
        if (!item) throw notFound("Order item");
        if (item.sellerOrder.status !== "DELIVERED" || !item.sellerOrder.deliveredAt) throw businessRule(`"${item.productName}" has not been delivered yet`);
        if (!item.isReturnable) throw businessRule(`"${item.productName}" is not eligible for return`);
        const deadline = item.sellerOrder.deliveredAt.getTime() + item.returnWindowDays * 864e5;
        if (Date.now() > deadline) throw businessRule(`The return window for "${item.productName}" has closed`);
        const inFlight = item.returnItems.filter((r) => !["REJECTED", "CANCELLED"].includes(r.returnRequest.status)).reduce((s2, r) => s2 + r.quantity, 0);
        const returnable = activeQty(item) - inFlight;
        if (req.quantity > returnable) throw businessRule(`You can return at most ${Math.max(0, returnable)} unit(s) of "${item.productName}"`);
        if (!bySellerOrder.has(item.sellerOrderId)) bySellerOrder.set(item.sellerOrderId, []);
        bySellerOrder.get(item.sellerOrderId).push({ item, qty: req.quantity });
      }
      const requests = [];
      for (const [sellerOrderId, lines] of bySellerOrder) {
        const refundFor = (l) => prorate(toPaise(l.item.lineTotal) - toPaise(l.item.shippingAmount), l.qty, l.item.quantity);
        const total = lines.reduce((s2, l) => s2 + refundFor(l), 0);
        const rr = await tx.returnRequest.create({
          data: {
            returnNumber: referenceNumber("RT"),
            orderId,
            sellerOrderId,
            customerId: userId,
            reason: input.reason,
            comments: input.comments ?? null,
            refundAmount: decimal(total),
            items: {
              create: lines.map((l) => ({ orderItemId: l.item.id, quantity: l.qty, refundAmount: decimal(refundFor(l)) }))
            }
          },
          include: { sellerOrder: { include: { seller: { select: { userId: true } } } } }
        });
        await tx.orderItem.updateMany({ where: { id: { in: lines.map((l) => l.item.id) } }, data: { status: "RETURN_REQUESTED" } });
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            sellerOrderId,
            fromStatus: "DELIVERED",
            toStatus: "RETURN_REQUESTED",
            note: `Return ${rr.returnNumber}: ${input.reason}`,
            actorId: userId,
            actorRole: "CUSTOMER"
          }
        });
        requests.push(rr);
      }
      await this.audit.record(actor, { action: "return.request", entityType: "Order", entityId: orderId, after: input }, tx);
      return requests;
    });
    for (const rr of created) {
      await this.notifications.notify({
        key: "return.requested",
        userId: rr.sellerOrder.seller.userId,
        link: `/seller/returns`,
        vars: { subOrderNumber: rr.sellerOrder.subOrderNumber, returnNumber: rr.returnNumber, reason: rr.reason }
      });
    }
    return created.map((r) => ({ id: r.id, returnNumber: r.returnNumber, refundAmount: Number(r.refundAmount) }));
  }
  async decideReturn(returnId, input, scope, actor) {
    if (scope.kind === "customer") throw forbidden();
    const rr = await this.db.$transaction(async (tx) => {
      const r = await tx.returnRequest.findFirst({
        where: { id: returnId, ...scope.kind === "seller" ? { sellerOrder: { sellerId: scope.sellerId } } : {} },
        include: { items: { include: { orderItem: { include: { commission: true } } } }, sellerOrder: true, order: { include: { payments: true } } }
      });
      if (!r) throw notFound("Return request");
      const itemIds = r.items.map((i) => i.orderItemId);
      if (input.decision === "APPROVE" || input.decision === "REJECT") {
        if (r.status !== "REQUESTED") throw businessRule("This return has already been reviewed");
        const status2 = input.decision === "APPROVE" ? "APPROVED" : "REJECTED";
        const moved = await tx.returnRequest.updateMany({
          where: { id: r.id, status: "REQUESTED" },
          data: { status: status2, decisionNote: input.note ?? null, decidedAt: /* @__PURE__ */ new Date() }
        });
        if (moved.count !== 1) throw conflict("This return was updated by someone else");
        await tx.orderItem.updateMany({
          where: { id: { in: itemIds } },
          data: { status: status2 === "APPROVED" ? "RETURN_APPROVED" : "RETURN_REJECTED" }
        });
      } else {
        if (!["APPROVED", "PICKED_UP"].includes(r.status)) throw businessRule("Approve the return before marking it received");
        const moved = await tx.returnRequest.updateMany({
          where: { id: r.id, status: r.status },
          data: { status: "RECEIVED", receivedAt: /* @__PURE__ */ new Date(), restock: input.restock, decisionNote: input.note ?? r.decisionNote }
        });
        if (moved.count !== 1) throw conflict("This return was updated by someone else");
        const ledger = [];
        for (const ri of r.items) {
          const oi = ri.orderItem;
          if (input.restock && oi.listingId) {
            await this.inventory.restock(tx, oi.listingId, ri.quantity, {
              referenceType: "RETURN",
              referenceId: r.id,
              reason: `Return ${r.returnNumber}`,
              actorId: actor?.auth?.userId
            });
          }
          await tx.orderItem.update({
            where: { id: oi.id },
            data: { returnedQuantity: { increment: ri.quantity }, status: toPaise(ri.refundAmount) > 0 ? "REFUND_PENDING" : "RETURNED" }
          });
          if (r.sellerOrder.codCollected) {
            const base = prorate(toPaise(oi.lineSubtotal) - toPaise(oi.sellerFundedDiscount), ri.quantity, oi.quantity);
            const commission = prorate(toPaise(oi.commissionAmount), ri.quantity, oi.quantity);
            const commissionTax = prorate(toPaise(oi.commission?.taxAmount ?? 0), ri.quantity, oi.quantity);
            const common = { sellerId: r.sellerOrder.sellerId, orderId: r.orderId, sellerOrderId: r.sellerOrderId, orderItemId: oi.id, actorId: actor?.auth?.userId };
            ledger.push(
              { ...common, type: "REFUND_DEBIT", amount: -base, description: `Return ${r.returnNumber} \xB7 ${oi.productName} \xD7 ${ri.quantity}` },
              { ...common, type: "COMMISSION_REVERSAL_CREDIT", amount: commission + commissionTax, description: `Commission reversed \xB7 ${r.returnNumber}` }
            );
          }
        }
        await this.finance.post(tx, ledger);
        if (toPaise(r.refundAmount) > 0) {
          const payment = r.order.payments[0];
          await tx.refund.create({
            data: {
              orderId: r.orderId,
              paymentId: payment?.id ?? null,
              returnRequestId: r.id,
              amount: r.refundAmount,
              method: "bank_transfer",
              reason: `Return ${r.returnNumber}: ${r.reason}`
            }
          });
          if (payment && payment.status === "PAID") {
            await tx.payment.update({ where: { id: payment.id }, data: { status: "REFUND_PENDING" } });
            await tx.order.update({ where: { id: r.orderId }, data: { paymentStatus: "REFUND_PENDING" } });
          }
        }
      }
      await tx.orderStatusHistory.create({
        data: {
          orderId: r.orderId,
          sellerOrderId: r.sellerOrderId,
          toStatus: input.decision === "APPROVE" ? "RETURN_APPROVED" : input.decision === "REJECT" ? "RETURN_REJECTED" : "RETURNED",
          note: `Return ${r.returnNumber}${input.note ? `: ${input.note}` : ""}`,
          actorId: actor?.auth?.userId ?? null,
          actorRole: this.actorRole(actor)
        }
      });
      await this.audit.record(actor, { action: `return.${input.decision.toLowerCase()}`, entityType: "ReturnRequest", entityId: r.id, after: input }, tx);
      return r;
    });
    await this.indexer.refresh(rr.items.map((i) => i.orderItem.productId).filter(Boolean));
    const status = input.decision === "APPROVE" ? "approved" : input.decision === "REJECT" ? "rejected" : "received \u2014 refund initiated";
    await this.notifications.notify({
      key: "return.updated",
      userId: rr.customerId,
      link: `/account/orders/${rr.orderId}`,
      vars: { returnNumber: rr.returnNumber, status, note: input.note ?? "" }
    });
  }
  /** Customer withdraws a return that has not been received yet. */
  async cancelReturn(userId, returnId, actor) {
    await this.db.$transaction(async (tx) => {
      const r = await tx.returnRequest.findFirst({ where: { id: returnId, customerId: userId }, include: { items: true } });
      if (!r) throw notFound("Return request");
      if (!["REQUESTED", "APPROVED"].includes(r.status)) throw businessRule("This return can no longer be cancelled");
      await tx.returnRequest.update({ where: { id: r.id }, data: { status: "CANCELLED" } });
      await tx.orderItem.updateMany({ where: { id: { in: r.items.map((i) => i.orderItemId) } }, data: { status: "DELIVERED" } });
      await this.audit.record(actor, { action: "return.cancel", entityType: "ReturnRequest", entityId: r.id }, tx);
    });
  }
  // ── Refunds (admin) ────────────────────────────────────────
  async processRefund(refundId, input, actor) {
    await this.db.$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({ where: { id: refundId }, include: { returnRequest: { include: { items: true } } } });
      if (!refund) throw notFound("Refund");
      if (refund.status !== "PENDING") throw businessRule("This refund has already been processed");
      if (!input.failed && !input.reference) throw badRequest("Enter the refund transfer reference");
      const status = input.failed ? "FAILED" : "PROCESSED";
      const moved = await tx.refund.updateMany({
        where: { id: refund.id, status: "PENDING" },
        data: { status, reference: input.reference ?? null, method: input.method ?? refund.method, processedAt: /* @__PURE__ */ new Date(), reason: input.note ?? refund.reason }
      });
      if (moved.count !== 1) throw conflict("Refund changed in the meantime");
      if (status === "PROCESSED") {
        await tx.order.update({ where: { id: refund.orderId }, data: { refundedTotal: { increment: refund.amount } } });
        if (refund.paymentId) await tx.payment.update({ where: { id: refund.paymentId }, data: { refunded: { increment: refund.amount } } });
        if (refund.returnRequest) {
          await tx.returnRequest.update({ where: { id: refund.returnRequest.id }, data: { status: "REFUNDED" } });
          await tx.orderItem.updateMany({ where: { id: { in: refund.returnRequest.items.map((i) => i.orderItemId) } }, data: { status: "REFUNDED" } });
        }
      }
      if (refund.paymentId) {
        const p = await tx.payment.findUniqueOrThrow({ where: { id: refund.paymentId } });
        const pending = await tx.refund.count({ where: { paymentId: p.id, status: "PENDING" } });
        const next = pending > 0 ? "REFUND_PENDING" : toPaise(p.refunded) >= toPaise(p.collected) && toPaise(p.collected) > 0 ? "REFUNDED" : toPaise(p.collected) > 0 ? "PAID" : p.status;
        await tx.payment.update({ where: { id: p.id }, data: { status: next } });
        await tx.order.update({ where: { id: refund.orderId }, data: { paymentStatus: next } });
      }
      await this.audit.record(actor, { action: `refund.${status.toLowerCase()}`, entityType: "Refund", entityId: refund.id, after: input }, tx);
    });
  }
};

// src/modules/orders/order-query.service.ts
var dateRange = (q) => q.from || q.to ? { ...q.from ? { gte: q.from } : {}, ...q.to ? { lte: q.to } : {} } : void 0;
var money = (v) => num(v);
function customerItem(i) {
  return {
    id: i.id,
    productId: i.productId,
    productName: i.productName,
    variantName: i.variantName,
    sku: i.sku,
    imageUrl: i.imageUrl,
    sellerName: i.sellerName,
    unitPrice: money(i.unitPrice),
    unitMrp: money(i.unitMrp),
    quantity: i.quantity,
    cancelledQuantity: i.cancelledQuantity,
    returnedQuantity: i.returnedQuantity,
    discount: money(i.discountAmount),
    shipping: money(i.shippingAmount),
    taxRate: money(i.taxRate),
    tax: money(i.taxAmount),
    lineTotal: money(i.lineTotal),
    status: i.status,
    isReturnable: i.isReturnable,
    returnWindowDays: i.returnWindowDays
  };
}
var OrderQueryService = class {
  constructor(db2) {
    this.db = db2;
  }
  db;
  // ── Customer ───────────────────────────────────────────────
  async customerOrders(userId, q) {
    const where = {
      customerId: userId,
      ...q.status ? { status: q.status } : {},
      ...dateRange(q) ? { placedAt: dateRange(q) } : {},
      ...q.q ? { OR: [{ orderNumber: { contains: q.q } }, { items: { some: { productName: { contains: q.q } } } }] } : {}
    };
    const [items, total] = await Promise.all([
      this.db.order.findMany({
        where,
        orderBy: { placedAt: "desc" },
        ...pageArgs(q.page, q.pageSize),
        include: {
          items: { select: { id: true, productName: true, imageUrl: true, quantity: true, status: true, variantName: true } },
          sellerOrders: { select: { id: true, status: true } }
        }
      }),
      this.db.order.count({ where })
    ]);
    return paginated(
      items.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        statusLabel: ORDER_STATUS_LABELS[o.status],
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        grandTotal: money(o.grandTotal),
        placedAt: o.placedAt,
        itemCount: o.items.reduce((s2, i) => s2 + i.quantity, 0),
        items: o.items.slice(0, 4),
        shipments: o.sellerOrders.length
      })),
      total,
      q.page,
      q.pageSize
    );
  }
  async customerOrder(userId, orderId) {
    const o = await this.db.order.findFirst({
      where: { id: orderId, customerId: userId },
      include: {
        items: true,
        sellerOrders: {
          include: {
            seller: { select: { displayName: true, slug: true } },
            shipments: { include: { events: { orderBy: { occurredAt: "asc" } } }, orderBy: { createdAt: "asc" } }
          },
          orderBy: { createdAt: "asc" }
        },
        payments: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
        returns: { include: { items: true }, orderBy: { createdAt: "desc" } },
        refunds: { orderBy: { createdAt: "desc" } }
      }
    });
    if (!o) throw notFound("Order");
    const payment = o.payments[0];
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      statusLabel: ORDER_STATUS_LABELS[o.status],
      placedAt: o.placedAt,
      deliveredAt: o.deliveredAt,
      cancelledAt: o.cancelledAt,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      shippingMethod: o.shippingMethod,
      couponCode: o.couponCode,
      notes: o.notes,
      address: {
        fullName: o.shipName,
        phone: o.shipPhone,
        line1: o.shipLine1,
        line2: o.shipLine2,
        landmark: o.shipLandmark,
        city: o.shipCity,
        state: o.shipState,
        pincode: o.shipPincode
      },
      totals: {
        mrpTotal: money(o.mrpTotal),
        itemsSubtotal: money(o.itemsSubtotal),
        discount: money(o.discountTotal),
        shipping: money(o.shippingTotal),
        codFee: money(o.codFee),
        tax: money(o.taxTotal),
        grandTotal: money(o.grandTotal),
        refunded: money(o.refundedTotal),
        amountDue: payment ? fromPaise(Math.max(0, toPaise(payment.amount) - toPaise(payment.collected))) : 0,
        payable: payment ? money(payment.amount) : money(o.grandTotal)
      },
      sellerOrders: o.sellerOrders.map((so) => ({
        id: so.id,
        subOrderNumber: so.subOrderNumber,
        status: so.status,
        statusLabel: ORDER_STATUS_LABELS[so.status],
        seller: so.seller,
        canCancel: CUSTOMER_CANCELLABLE.includes(so.status),
        deliveredAt: so.deliveredAt,
        shippedAt: so.shippedAt,
        total: money(so.grandTotal),
        items: o.items.filter((i) => i.sellerOrderId === so.id).map((i) => {
          const deadline = so.deliveredAt ? so.deliveredAt.getTime() + i.returnWindowDays * 864e5 : null;
          const inReturn = o.returns.filter((r) => !["REJECTED", "CANCELLED"].includes(r.status)).flatMap((r) => r.items).filter((ri) => ri.orderItemId === i.id).reduce((s2, ri) => s2 + ri.quantity, 0);
          return {
            ...customerItem(i),
            returnableQuantity: so.status === "DELIVERED" && i.isReturnable && deadline && Date.now() <= deadline ? Math.max(0, i.quantity - i.cancelledQuantity - inReturn) : 0,
            returnDeadline: deadline ? new Date(deadline) : null
          };
        }),
        shipments: so.shipments.map((s2) => ({
          id: s2.id,
          carrier: s2.carrier,
          trackingNumber: s2.trackingNumber,
          trackingUrl: s2.trackingUrl,
          status: s2.status,
          shippedAt: s2.shippedAt,
          deliveredAt: s2.deliveredAt,
          estimatedFrom: s2.estimatedFrom,
          estimatedTo: s2.estimatedTo,
          events: s2.events
        }))
      })),
      history: o.statusHistory.map((h) => ({ id: h.id, sellerOrderId: h.sellerOrderId, fromStatus: h.fromStatus, toStatus: h.toStatus, note: h.note, createdAt: h.createdAt })),
      returns: o.returns.map((r) => ({
        id: r.id,
        returnNumber: r.returnNumber,
        status: r.status,
        reason: r.reason,
        refundAmount: money(r.refundAmount),
        createdAt: r.createdAt,
        decisionNote: r.decisionNote,
        items: r.items.map((ri) => ({ orderItemId: ri.orderItemId, quantity: ri.quantity, refundAmount: money(ri.refundAmount) }))
      })),
      refunds: o.refunds.map((r) => ({ id: r.id, amount: money(r.amount), status: r.status, method: r.method, reference: r.reference, processedAt: r.processedAt, createdAt: r.createdAt })),
      payment: payment ? { status: payment.status, amount: money(payment.amount), collected: money(payment.collected), refunded: money(payment.refunded), paidAt: payment.paidAt } : null
    };
  }
  // ── Seller (strictly scoped to the authenticated seller) ───
  async sellerOrders(sellerId, q) {
    const where = {
      sellerId,
      ...q.status ? { status: q.status } : {},
      ...dateRange(q) ? { createdAt: dateRange(q) } : {},
      ...q.q ? { OR: [{ subOrderNumber: { contains: q.q } }, { items: { some: { OR: [{ productName: { contains: q.q } }, { sku: { contains: q.q } }] } } }] } : {}
    };
    const [items, total, counts] = await Promise.all([
      this.db.sellerOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...pageArgs(q.page, q.pageSize),
        include: {
          items: { select: { id: true, productName: true, variantName: true, sku: true, imageUrl: true, quantity: true, cancelledQuantity: true, unitPrice: true, status: true } },
          order: { select: { orderNumber: true, shipName: true, shipCity: true, shipState: true, shipPincode: true, paymentMethod: true, placedAt: true } }
        }
      }),
      this.db.sellerOrder.count({ where }),
      this.db.sellerOrder.groupBy({ by: ["status"], where: { sellerId }, _count: { _all: true } })
    ]);
    return {
      ...paginated(
        items.map((so) => ({
          id: so.id,
          subOrderNumber: so.subOrderNumber,
          orderNumber: so.order.orderNumber,
          status: so.status,
          statusLabel: ORDER_STATUS_LABELS[so.status],
          placedAt: so.order.placedAt,
          paymentMethod: so.order.paymentMethod,
          codCollected: so.codCollected,
          customer: { name: so.order.shipName, city: so.order.shipCity, state: so.order.shipState, pincode: so.order.shipPincode },
          total: money(so.grandTotal),
          commission: money(so.commissionTotal),
          items: so.items.map((i) => ({ ...i, unitPrice: money(i.unitPrice) }))
        })),
        total,
        q.page,
        q.pageSize
      ),
      counts: Object.fromEntries(counts.map((c2) => [c2.status, c2._count._all]))
    };
  }
  async sellerOrder(sellerOrderId, scope) {
    const so = await this.db.sellerOrder.findFirst({
      where: { id: sellerOrderId, ...scope.sellerId ? { sellerId: scope.sellerId } : {} },
      include: {
        items: { include: { commission: true } },
        order: true,
        seller: { select: { id: true, displayName: true, code: true, fulfillmentMode: true, addresses: { where: { isPickup: true }, take: 1 } } },
        shipments: { include: { events: { orderBy: { occurredAt: "asc" } }, items: true } },
        statusHistory: { orderBy: { createdAt: "asc" } },
        returns: { include: { items: true }, orderBy: { createdAt: "desc" } }
      }
    });
    if (!so) throw notFound("Order");
    return {
      id: so.id,
      subOrderNumber: so.subOrderNumber,
      orderId: scope.sellerId ? void 0 : so.orderId,
      orderNumber: so.order.orderNumber,
      status: so.status,
      statusLabel: ORDER_STATUS_LABELS[so.status],
      fulfillmentMode: so.fulfillmentMode,
      placedAt: so.order.placedAt,
      confirmedAt: so.confirmedAt,
      shippedAt: so.shippedAt,
      deliveredAt: so.deliveredAt,
      cancelledAt: so.cancelledAt,
      cancelReason: so.cancelReason,
      paymentMethod: so.order.paymentMethod,
      codCollected: so.codCollected,
      codCollectedAt: so.codCollectedAt,
      shippingMethod: so.order.shippingMethod,
      // Delivery details needed to fulfil — no customer email or account data.
      deliveryAddress: {
        fullName: so.order.shipName,
        phone: so.order.shipPhone,
        line1: so.order.shipLine1,
        line2: so.order.shipLine2,
        landmark: so.order.shipLandmark,
        city: so.order.shipCity,
        state: so.order.shipState,
        pincode: so.order.shipPincode
      },
      seller: { id: so.seller.id, name: so.seller.displayName, code: so.seller.code, pickupAddress: so.seller.addresses[0] ?? null },
      totals: {
        itemsSubtotal: money(so.itemsSubtotal),
        discount: money(so.discountTotal),
        shipping: money(so.shippingTotal),
        tax: money(so.taxTotal),
        total: money(so.grandTotal),
        commission: money(so.commissionTotal)
      },
      items: so.items.map((i) => ({
        ...customerItem(i),
        sellerFundedDiscount: money(i.sellerFundedDiscount),
        commissionRate: money(i.commissionRate),
        commissionAmount: money(i.commissionAmount),
        commissionTax: money(i.commission?.taxAmount),
        hsnCode: i.hsnCode
      })),
      shipments: so.shipments,
      history: so.statusHistory,
      returns: so.returns.map((r) => ({ ...r, refundAmount: money(r.refundAmount), items: r.items.map((ri) => ({ ...ri, refundAmount: money(ri.refundAmount) })) }))
    };
  }
  /** Printable packing slip (HTML) for a seller sub-order. */
  async packingSlip(sellerOrderId, scope, brand) {
    const so = await this.sellerOrder(sellerOrderId, scope);
    const rows = so.items.filter((i) => i.quantity - i.cancelledQuantity > 0).map(
      (i) => `<tr><td>${escapeHtml(i.sku)}</td><td>${escapeHtml(i.productName)}${i.variantName ? ` <small>(${escapeHtml(i.variantName)})</small>` : ""}</td><td class="r">${i.quantity - i.cancelledQuantity}</td></tr>`
    ).join("");
    const a = so.deliveryAddress;
    const cod = so.paymentMethod === "COD" ? `<p class="cod">CASH ON DELIVERY \u2014 collect \u20B9${so.totals.total.toFixed(2)}</p>` : "";
    return `<!doctype html><html><head><meta charset="utf-8"><title>Packing slip ${escapeHtml(so.subOrderNumber)}</title>
<style>body{font-family:system-ui,sans-serif;color:#111;margin:32px}h1{font-size:20px;margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}
td,th{border:1px solid #ccc;padding:8px;text-align:left;font-size:13px}.r{text-align:right}.grid{display:flex;gap:32px;margin-top:16px}
.box{flex:1;border:1px solid #ccc;padding:12px;font-size:13px;line-height:1.5}.cod{font-weight:700;border:2px dashed #111;padding:8px;text-align:center}
@media print{button{display:none}}</style></head><body>
<button onclick="window.print()">Print</button>
<h1>${escapeHtml(brand)} \xB7 Packing slip</h1>
<p>Sub-order <b>${escapeHtml(so.subOrderNumber)}</b> \xB7 Order ${escapeHtml(so.orderNumber)} \xB7 Placed ${so.placedAt.toISOString().slice(0, 10)}</p>
${cod}
<div class="grid"><div class="box"><b>Ship to</b><br>${escapeHtml(a.fullName)}<br>${escapeHtml(a.line1)}${a.line2 ? `<br>${escapeHtml(a.line2)}` : ""}${a.landmark ? `<br>Near ${escapeHtml(a.landmark)}` : ""}<br>${escapeHtml(a.city)}, ${escapeHtml(a.state)} ${escapeHtml(a.pincode)}<br>Phone: ${escapeHtml(a.phone)}</div>
<div class="box"><b>From</b><br>${escapeHtml(so.seller.name)} (${escapeHtml(so.seller.code)})${so.seller.pickupAddress ? `<br>${escapeHtml(so.seller.pickupAddress.line1)}<br>${escapeHtml(so.seller.pickupAddress.city)}, ${escapeHtml(so.seller.pickupAddress.state)} ${escapeHtml(so.seller.pickupAddress.pincode)}` : ""}</div></div>
<table><thead><tr><th>SKU</th><th>Item</th><th class="r">Qty</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
  }
  // ── Admin ──────────────────────────────────────────────────
  async adminOrders(q) {
    const where = {
      ...q.status ? { status: q.status } : {},
      ...q.paymentStatus ? { paymentStatus: q.paymentStatus } : {},
      ...q.sellerId ? { sellerOrders: { some: { sellerId: q.sellerId } } } : {},
      ...dateRange(q) ? { placedAt: dateRange(q) } : {},
      ...q.q ? {
        OR: [
          { orderNumber: { contains: q.q } },
          { shipName: { contains: q.q } },
          { shipPhone: { contains: q.q } },
          { customer: { email: { contains: q.q } } }
        ]
      } : {}
    };
    const [items, total] = await Promise.all([
      this.db.order.findMany({
        where,
        orderBy: { placedAt: "desc" },
        ...pageArgs(q.page, q.pageSize),
        include: {
          customer: { select: { id: true, name: true, email: true } },
          sellerOrders: { select: { id: true, subOrderNumber: true, status: true, codCollected: true, seller: { select: { displayName: true } } } },
          _count: { select: { items: true } }
        }
      }),
      this.db.order.count({ where })
    ]);
    return paginated(
      items.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        grandTotal: money(o.grandTotal),
        placedAt: o.placedAt,
        customer: o.customer,
        city: o.shipCity,
        itemCount: o._count.items,
        sellerOrders: o.sellerOrders
      })),
      total,
      q.page,
      q.pageSize
    );
  }
  async adminOrder(orderId) {
    const o = await this.db.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        items: { include: { commission: true } },
        sellerOrders: { include: { seller: { select: { id: true, displayName: true, code: true } }, shipments: { include: { events: true } } } },
        payments: { include: { refunds: true } },
        statusHistory: { orderBy: { createdAt: "asc" } },
        returns: { include: { items: true } },
        refunds: true,
        couponUsages: true
      }
    });
    if (!o) throw notFound("Order");
    return JSON.parse(JSON.stringify(o, (_k, v) => v && typeof v === "object" && v.constructor?.name === "Decimal" ? Number(v) : v));
  }
  async returns(scope, q) {
    const where = {
      ...scope.sellerId ? { sellerOrder: { sellerId: scope.sellerId } } : {},
      ...scope.customerId ? { customerId: scope.customerId } : {},
      ...q.status ? { status: q.status } : {}
    };
    const [items, total] = await Promise.all([
      this.db.returnRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...pageArgs(q.page, q.pageSize),
        include: {
          items: { include: { orderItem: { select: { productName: true, variantName: true, sku: true, imageUrl: true } } } },
          sellerOrder: { select: { id: true, subOrderNumber: true, seller: { select: { displayName: true } } } },
          order: { select: { orderNumber: true, shipName: true, shipCity: true } },
          refunds: true
        }
      }),
      this.db.returnRequest.count({ where })
    ]);
    return paginated(
      items.map((r) => ({
        ...r,
        refundAmount: money(r.refundAmount),
        items: r.items.map((i) => ({ ...i, refundAmount: money(i.refundAmount) })),
        refunds: r.refunds.map((f) => ({ ...f, amount: money(f.amount) }))
      })),
      total,
      q.page,
      q.pageSize
    );
  }
  async refunds(q) {
    const where = q.status ? { status: q.status } : {};
    const [items, total] = await Promise.all([
      this.db.refund.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...pageArgs(q.page, q.pageSize),
        include: { order: { select: { orderNumber: true, shipName: true, customer: { select: { email: true } } } }, returnRequest: { select: { returnNumber: true } } }
      }),
      this.db.refund.count({ where })
    ]);
    return paginated(items.map((r) => ({ ...r, amount: money(r.amount) })), total, q.page, q.pageSize);
  }
  /** Delivered sub-orders whose COD cash has not been reconciled yet. */
  async codPending(q) {
    const where = { status: "DELIVERED", codCollected: false, order: { paymentMethod: "COD" } };
    const [items, total, agg] = await Promise.all([
      this.db.sellerOrder.findMany({
        where,
        orderBy: { deliveredAt: "asc" },
        ...pageArgs(q.page, q.pageSize),
        include: { seller: { select: { displayName: true } }, order: { select: { orderNumber: true, shipName: true, shipCity: true } }, items: true }
      }),
      this.db.sellerOrder.count({ where }),
      this.db.sellerOrder.aggregate({ where, _sum: { grandTotal: true } })
    ]);
    return {
      ...paginated(
        items.map((so) => ({
          id: so.id,
          subOrderNumber: so.subOrderNumber,
          orderNumber: so.order.orderNumber,
          seller: so.seller.displayName,
          customer: so.order.shipName,
          city: so.order.shipCity,
          deliveredAt: so.deliveredAt,
          amountDue: fromPaise(so.items.reduce((s2, i) => s2 + Math.round(toPaise(i.lineTotal) * (i.quantity - i.cancelledQuantity) / i.quantity), 0))
        })),
        total,
        q.page,
        q.pageSize
      ),
      totalOutstanding: money(agg._sum.grandTotal)
    };
  }
};

// src/modules/payments/payment-provider.ts
var CashOnDeliveryProvider = class {
  code = "cod";
  method = "COD";
  label = "Cash on Delivery";
  async createPayment() {
    return { status: "COD_PENDING" };
  }
  async verifyPayment(payment, payload) {
    const collected = payment.collected + payload.amount;
    return { status: collected >= payment.amount ? "PAID" : "COD_PENDING", collected };
  }
  async refundPayment() {
    return { status: "PENDING" };
  }
  async getPaymentStatus(payment) {
    return payment.status;
  }
};
var PaymentRegistry = class {
  providers = /* @__PURE__ */ new Map();
  constructor(providers) {
    for (const p of providers) this.providers.set(p.method, p);
  }
  get(method) {
    const p = this.providers.get(method);
    if (!p) throw new Error(`Payment method ${method} is not configured`);
    return p;
  }
  methods() {
    return [...this.providers.values()].map((p) => ({ method: p.method, code: p.code, label: p.label }));
  }
};

// src/modules/reviews/review.service.ts
var ReviewService = class {
  constructor(db2, storage, settings, audit) {
    this.db = db2;
    this.storage = storage;
    this.settings = settings;
    this.audit = audit;
  }
  db;
  storage;
  settings;
  audit;
  /** Recompute product & seller rating aggregates from approved reviews. */
  async refreshRatings(productId) {
    const agg = await this.db.review.aggregate({
      where: { productId, status: "APPROVED", deletedAt: null },
      _avg: { rating: true },
      _count: { _all: true }
    });
    await this.db.product.update({
      where: { id: productId },
      data: { ratingAvg: Number((agg._avg.rating ?? 0).toFixed(2)), ratingCount: agg._count._all }
    });
    const owner = await this.db.product.findUnique({ where: { id: productId }, select: { ownerSellerId: true } });
    if (owner?.ownerSellerId) {
      const s2 = await this.db.review.aggregate({
        where: { status: "APPROVED", deletedAt: null, product: { ownerSellerId: owner.ownerSellerId } },
        _avg: { rating: true },
        _count: { _all: true }
      });
      await this.db.seller.update({
        where: { id: owner.ownerSellerId },
        data: { ratingAvg: Number((s2._avg.rating ?? 0).toFixed(2)), ratingCount: s2._count._all }
      });
    }
  }
  /** Whether (and via which order item) the user may review this product. */
  async eligibility(userId, productId) {
    const [existing, item] = await Promise.all([
      this.db.review.findUnique({ where: { productId_userId: { productId, userId } } }),
      this.db.orderItem.findFirst({
        where: { productId, order: { customerId: userId }, sellerOrder: { status: "DELIVERED" }, review: null },
        orderBy: { createdAt: "desc" },
        select: { id: true }
      })
    ]);
    const settings = await this.settings.get("reviews");
    return {
      canReview: !existing && (Boolean(item) || !settings.onlyVerifiedPurchasers),
      verifiedPurchase: Boolean(item),
      orderItemId: item?.id ?? null,
      existingReviewId: existing?.id ?? null
    };
  }
  async create(userId, input, files) {
    const product = await this.db.product.findFirst({ where: { id: input.productId, deletedAt: null, status: "APPROVED" } });
    if (!product) throw notFound("Product");
    const settings = await this.settings.get("reviews");
    let orderItemId = null;
    if (input.orderItemId) {
      const item = await this.db.orderItem.findFirst({
        where: { id: input.orderItemId, productId: input.productId, order: { customerId: userId }, sellerOrder: { status: "DELIVERED" } },
        include: { review: true }
      });
      if (!item) throw forbidden("You can only review items from your delivered orders");
      if (item.review) throw conflict("You have already reviewed this purchase");
      orderItemId = item.id;
    } else {
      const eligible2 = await this.eligibility(userId, input.productId);
      orderItemId = eligible2.orderItemId;
    }
    if (!orderItemId && settings.onlyVerifiedPurchasers) throw forbidden("Only customers who bought this product can review it");
    if (await this.db.review.findUnique({ where: { productId_userId: { productId: input.productId, userId } } })) {
      throw conflict("You have already reviewed this product");
    }
    if (files.length > 5) throw businessRule("You can attach at most 5 photos");
    const images = [];
    for (const f of files) images.push(await storeOptimizedImage(this.storage, "reviews", f.buffer, f.mimeType));
    const review = await this.db.review.create({
      data: {
        productId: input.productId,
        userId,
        orderItemId,
        rating: input.rating,
        title: plainText(input.title) || null,
        body: plainText(input.body) || null,
        isVerifiedPurchase: Boolean(orderItemId),
        status: settings.requireModeration ? "PENDING" : "APPROVED",
        images: { create: images.map((i) => ({ url: i.url, storageKey: i.key })) }
      }
    });
    if (review.status === "APPROVED") await this.refreshRatings(input.productId);
    return review;
  }
  async forProduct(productId, q) {
    const where = {
      productId,
      status: "APPROVED",
      deletedAt: null,
      ...q.rating ? { rating: q.rating } : {},
      ...q.withPhotos ? { images: { some: {} } } : {}
    };
    const orderBy = q.sort === "helpful" ? [{ helpfulCount: "desc" }, { createdAt: "desc" }] : q.sort === "rating_high" ? [{ rating: "desc" }] : q.sort === "rating_low" ? [{ rating: "asc" }] : [{ createdAt: "desc" }];
    const [items, total] = await Promise.all([
      this.db.review.findMany({
        where,
        orderBy,
        ...pageArgs(q.page, q.pageSize),
        include: { images: true, user: { select: { name: true } } }
      }),
      this.db.review.count({ where })
    ]);
    return paginated(
      items.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        isVerifiedPurchase: r.isVerifiedPurchase,
        helpfulCount: r.helpfulCount,
        createdAt: r.createdAt,
        author: r.user.name.split(" ")[0],
        images: r.images.map((i) => ({ id: i.id, url: i.url }))
      })),
      total,
      q.page,
      q.pageSize
    );
  }
  mine(userId) {
    return this.db.review.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { product: { select: { title: true, slug: true } }, images: true }
    });
  }
  async remove(userId, reviewId) {
    const r = await this.db.review.findFirst({ where: { id: reviewId, userId, deletedAt: null } });
    if (!r) throw notFound("Review");
    await this.db.review.update({ where: { id: r.id }, data: { deletedAt: /* @__PURE__ */ new Date(), orderItemId: null } });
    await this.refreshRatings(r.productId);
  }
  async report(userId, reviewId, reason) {
    const r = await this.db.review.findFirst({ where: { id: reviewId, status: "APPROVED", deletedAt: null } });
    if (!r) throw notFound("Review");
    if (r.userId === userId) throw businessRule("You cannot report your own review");
    await this.db.reviewReport.upsert({
      where: { reviewId_userId: { reviewId, userId } },
      create: { reviewId, userId, reason },
      update: { reason, resolvedAt: null }
    });
  }
  async markHelpful(reviewId) {
    await this.db.review.updateMany({ where: { id: reviewId, status: "APPROVED" }, data: { helpfulCount: { increment: 1 } } });
  }
  // ── Moderation ─────────────────────────────────────────────
  async moderationQueue(q) {
    const where = {
      deletedAt: null,
      ...q.status ? { status: q.status } : {},
      ...q.reported ? { reports: { some: { resolvedAt: null } } } : {}
    };
    const [items, total] = await Promise.all([
      this.db.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...pageArgs(q.page, q.pageSize),
        include: {
          images: true,
          user: { select: { name: true, email: true } },
          product: { select: { id: true, title: true, slug: true } },
          reports: { where: { resolvedAt: null } }
        }
      }),
      this.db.review.count({ where })
    ]);
    return paginated(items, total, q.page, q.pageSize);
  }
  async moderate(reviewId, status, note, actor) {
    const r = await this.db.review.findFirst({ where: { id: reviewId, deletedAt: null } });
    if (!r) throw notFound("Review");
    await this.db.review.update({ where: { id: reviewId }, data: { status, moderationNote: note ?? null } });
    await this.db.reviewReport.updateMany({ where: { reviewId, resolvedAt: null }, data: { resolvedAt: /* @__PURE__ */ new Date() } });
    await this.audit.record(actor, { action: `review.${status.toLowerCase()}`, entityType: "Review", entityId: reviewId, before: { status: r.status }, after: { status, note } });
    await this.refreshRatings(r.productId);
  }
  async stats() {
    const [pending, reported, avg] = await Promise.all([
      this.db.review.count({ where: { status: "PENDING", deletedAt: null } }),
      this.db.review.count({ where: { deletedAt: null, reports: { some: { resolvedAt: null } } } }),
      this.db.review.aggregate({ where: { status: "APPROVED", deletedAt: null }, _avg: { rating: true } })
    ]);
    return { pending, reported, averageRating: num(avg._avg.rating ?? 0) };
  }
};

// src/modules/sellers/seller.service.ts
import { randomUUID as randomUUID2 } from "crypto";
var TRANSITIONS = {
  PENDING_APPROVAL: ["APPROVED", "REJECTED"],
  APPROVED: ["SUSPENDED", "INACTIVE"],
  REJECTED: ["APPROVED", "PENDING_APPROVAL"],
  SUSPENDED: ["APPROVED", "INACTIVE"],
  INACTIVE: ["APPROVED"]
};
var SellerService = class {
  constructor(db2, auth, storage, indexer, audit, notifications) {
    this.db = db2;
    this.auth = auth;
    this.storage = storage;
    this.indexer = indexer;
    this.audit = audit;
    this.notifications = notifications;
  }
  db;
  auth;
  storage;
  indexer;
  audit;
  notifications;
  async uniqueSlug(name) {
    const base = slugify(name) || "store";
    for (let i = 0; i < 20; i++) {
      const slug = i === 0 ? base : `${base}-${randomCode(4).toLowerCase()}`;
      if (!await this.db.seller.findUnique({ where: { slug }, select: { id: true } })) return slug;
    }
    return `${base}-${Date.now().toString(36)}`;
  }
  async uniqueCode() {
    for (let i = 0; i < 10; i++) {
      const code = `SL${randomCode(6)}`;
      if (!await this.db.seller.findUnique({ where: { code }, select: { id: true } })) return code;
    }
    throw new Error("Could not allocate seller code");
  }
  /** Public self-registration → PENDING_APPROVAL. Also works for an existing customer account. */
  async register(input, meta) {
    const existingUser = await this.db.user.findUnique({ where: { email: input.email }, include: { seller: true } });
    if (existingUser?.seller) throw conflict("A seller account already exists for this email");
    if (existingUser) throw conflict("An account with this email already exists. Sign in and apply from your account.");
    if (await this.db.user.findUnique({ where: { phone: input.phone } })) throw conflict("This phone number is already registered");
    const [sellerRole, customerRole] = await Promise.all([
      this.db.role.findUniqueOrThrow({ where: { code: "SELLER" } }),
      this.db.role.findUniqueOrThrow({ where: { code: "CUSTOMER" } })
    ]);
    const passwordHash = await this.auth.hashPassword(input.password);
    const slug = await this.uniqueSlug(input.businessName);
    const code = await this.uniqueCode();
    const user = await this.db.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          passwordHash,
          roles: { create: [{ roleId: sellerRole.id }, { roleId: customerRole.id }] },
          customerProfile: { create: {} }
        }
      });
      const seller = await tx.seller.create({
        data: {
          userId: u.id,
          code,
          slug,
          businessName: input.businessName,
          displayName: input.businessName,
          businessType: input.businessType,
          gstin: input.gstin ?? null,
          pan: input.pan,
          supportEmail: input.email,
          supportPhone: input.phone,
          termsAcceptedAt: /* @__PURE__ */ new Date(),
          addresses: {
            create: {
              label: "Registered",
              line1: input.addressLine1,
              line2: input.addressLine2 ?? null,
              city: input.city,
              state: input.state,
              pincode: input.pincode
            }
          }
        }
      });
      await tx.sellerApproval.create({ data: { sellerId: seller.id, toStatus: "PENDING_APPROVAL", reason: "Self registration" } });
      await this.audit.record(
        { auth: null, ip: meta.ip, userAgent: meta.userAgent },
        { action: "seller.register", entityType: "Seller", entityId: seller.id, after: { businessName: input.businessName, email: input.email } },
        tx
      );
      return u;
    });
    await this.auth.sendVerificationEmail(user.id);
    await this.notifications.notify({ key: "seller.registered", userId: user.id, vars: { businessName: input.businessName }, link: "/seller" });
    await this.notifications.notifyAdmins({
      key: "seller.registered_admin",
      vars: { businessName: input.businessName, email: input.email },
      link: "/admin/sellers?status=PENDING_APPROVAL"
    });
    return this.auth.issueSession(user.id, meta);
  }
  /** Existing customer applies to become a seller. */
  async applyAsExistingUser(userId, input) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId }, include: { seller: true } });
    if (user.seller) throw conflict("You already have a seller account");
    const sellerRole = await this.db.role.findUniqueOrThrow({ where: { code: "SELLER" } });
    const seller = await this.db.$transaction(async (tx) => {
      await tx.userRole.upsert({
        where: { userId_roleId: { userId, roleId: sellerRole.id } },
        create: { userId, roleId: sellerRole.id },
        update: {}
      });
      if (!user.phone) await tx.user.update({ where: { id: userId }, data: { phone: input.phone } });
      const s2 = await tx.seller.create({
        data: {
          userId,
          code: await this.uniqueCode(),
          slug: await this.uniqueSlug(input.businessName),
          businessName: input.businessName,
          displayName: input.businessName,
          businessType: input.businessType,
          gstin: input.gstin ?? null,
          pan: input.pan,
          supportEmail: user.email,
          supportPhone: input.phone,
          termsAcceptedAt: /* @__PURE__ */ new Date(),
          addresses: {
            create: { line1: input.addressLine1, line2: input.addressLine2 ?? null, city: input.city, state: input.state, pincode: input.pincode }
          }
        }
      });
      await tx.sellerApproval.create({ data: { sellerId: s2.id, toStatus: "PENDING_APPROVAL", reason: "Application from customer account" } });
      return s2;
    });
    this.auth.invalidatePrincipal(userId);
    await this.notifications.notify({ key: "seller.registered", userId, vars: { businessName: input.businessName }, link: "/seller" });
    await this.notifications.notifyAdmins({
      key: "seller.registered_admin",
      vars: { businessName: input.businessName, email: user.email },
      link: "/admin/sellers?status=PENDING_APPROVAL"
    });
    return seller;
  }
  /** Admin-created seller: account without password + invitation link. */
  async adminCreate(input, actor) {
    await this.auth.assertEmailAvailable(input.email, input.phone);
    const [sellerRole, customerRole] = await Promise.all([
      this.db.role.findUniqueOrThrow({ where: { code: "SELLER" } }),
      this.db.role.findUniqueOrThrow({ where: { code: "CUSTOMER" } })
    ]);
    const status = input.autoApprove ? "APPROVED" : "PENDING_APPROVAL";
    const created = await this.db.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          passwordHash: null,
          roles: { create: [{ roleId: sellerRole.id }, { roleId: customerRole.id }] },
          customerProfile: { create: {} }
        }
      });
      const s2 = await tx.seller.create({
        data: {
          userId: u.id,
          code: await this.uniqueCode(),
          slug: await this.uniqueSlug(input.businessName),
          businessName: input.businessName,
          displayName: input.businessName,
          businessType: input.businessType,
          gstin: input.gstin ?? null,
          pan: input.pan,
          supportEmail: input.email,
          supportPhone: input.phone,
          status,
          approvedAt: status === "APPROVED" ? /* @__PURE__ */ new Date() : null,
          addresses: {
            create: { line1: input.addressLine1, line2: input.addressLine2 ?? null, city: input.city, state: input.state, pincode: input.pincode }
          }
        }
      });
      await tx.sellerApproval.create({ data: { sellerId: s2.id, toStatus: status, reason: "Created by admin", actorId: actor?.auth?.userId ?? null } });
      await this.audit.record(actor, { action: "seller.admin_create", entityType: "Seller", entityId: s2.id, after: input }, tx);
      return { user: u, seller: s2 };
    });
    const token = await this.auth.createOneTimeToken(created.user.id, "SELLER_INVITE", 72 * 60);
    await this.notifications.notify({
      key: "seller.invite",
      userId: created.user.id,
      channels: ["EMAIL"],
      vars: { businessName: input.businessName, link: `${this.notifications.frontendUrl}/accept-invite?token=${token}` }
    });
    return created.seller;
  }
  async resendInvite(sellerId, actor) {
    const seller = await this.db.seller.findUnique({ where: { id: sellerId }, include: { user: true } });
    if (!seller) throw notFound("Seller");
    if (seller.user.passwordHash) throw businessRule("This seller has already set a password");
    const token = await this.auth.createOneTimeToken(seller.userId, "SELLER_INVITE", 72 * 60);
    await this.notifications.notify({
      key: "seller.invite",
      userId: seller.userId,
      channels: ["EMAIL"],
      vars: { businessName: seller.businessName, link: `${this.notifications.frontendUrl}/accept-invite?token=${token}` }
    });
    await this.audit.record(actor, { action: "seller.resend_invite", entityType: "Seller", entityId: sellerId });
  }
  // ── Seller self-service ────────────────────────────────────
  async me(sellerId) {
    const seller = await this.db.seller.findUniqueOrThrow({
      where: { id: sellerId },
      include: {
        addresses: true,
        documents: { orderBy: { createdAt: "desc" } },
        approvals: { orderBy: { createdAt: "desc" }, take: 10 },
        user: { select: { name: true, email: true, phone: true, emailVerifiedAt: true } }
      }
    });
    return { ...seller, ratingAvg: num(seller.ratingAvg), documents: seller.documents.map((d) => ({ ...d, storageKey: void 0 })) };
  }
  async updateProfile(sellerId, input, actor) {
    const before = await this.db.seller.findUniqueOrThrow({ where: { id: sellerId } });
    const updated = await this.db.seller.update({
      where: { id: sellerId },
      data: {
        displayName: input.displayName,
        description: input.description,
        supportEmail: input.supportEmail,
        supportPhone: input.supportPhone,
        fulfillmentMode: input.fulfillmentMode
      }
    });
    await this.audit.record(actor, { action: "seller.profile_update", entityType: "Seller", entityId: sellerId, before, after: updated });
    return updated;
  }
  async uploadLogo(sellerId, file) {
    const stored = await storeOptimizedImage(this.storage, "sellers", file.buffer, file.mimeType);
    return this.db.seller.update({ where: { id: sellerId }, data: { logoUrl: stored.url } });
  }
  /** KYC documents go to PRIVATE storage and are served only through short-lived signed URLs. */
  async uploadDocument(sellerId, type, file, actor) {
    const key = `seller-docs/${sellerId}/${randomUUID2()}${EXTENSIONS[file.mimeType] ?? ""}`;
    await this.storage.put(key, file.buffer, file.mimeType, "private");
    const doc = await this.db.sellerDocument.create({
      data: {
        sellerId,
        type,
        storageKey: key,
        originalName: file.filename,
        mimeType: file.mimeType,
        sizeBytes: file.size
      }
    });
    await this.audit.record(actor, { action: "seller.document_upload", entityType: "SellerDocument", entityId: doc.id, metadata: { type } });
    return { ...doc, storageKey: void 0 };
  }
  /** Signed URL for a document. Sellers can only reach their own documents; admins any. */
  async documentUrl(documentId, scope) {
    const doc = await this.db.sellerDocument.findFirst({
      where: { id: documentId, ...scope.sellerId ? { sellerId: scope.sellerId } : {} }
    });
    if (!doc) throw notFound("Document");
    return { url: await this.storage.signedUrl(doc.storageKey, 300), expiresInSeconds: 300 };
  }
  async deleteDocument(documentId, sellerId) {
    const doc = await this.db.sellerDocument.findFirst({ where: { id: documentId, sellerId } });
    if (!doc) throw notFound("Document");
    if (doc.status === "VERIFIED") throw businessRule("Verified documents cannot be removed");
    await this.db.sellerDocument.delete({ where: { id: doc.id } });
    await this.storage.delete(doc.storageKey, "private");
  }
  // ── Admin management ───────────────────────────────────────
  async list(q) {
    const where = {
      deletedAt: null,
      ...q.status ? { status: q.status } : {},
      ...q.q ? {
        OR: [
          { businessName: { contains: q.q } },
          { displayName: { contains: q.q } },
          { code: { contains: q.q } },
          { gstin: { contains: q.q } },
          { user: { email: { contains: q.q } } }
        ]
      } : {}
    };
    const [items, total] = await Promise.all([
      this.db.seller.findMany({
        where,
        include: {
          user: { select: { name: true, email: true, phone: true, lastLoginAt: true, passwordHash: true } },
          _count: { select: { listings: { where: { deletedAt: null } }, sellerOrders: true } }
        },
        orderBy: q.sort === "oldest" ? { createdAt: "asc" } : q.sort === "name" ? { businessName: "asc" } : { createdAt: "desc" },
        ...pageArgs(q.page, q.pageSize)
      }),
      this.db.seller.count({ where })
    ]);
    return paginated(
      items.map((s2) => ({
        ...s2,
        ratingAvg: num(s2.ratingAvg),
        user: { ...s2.user, passwordHash: void 0, invitePending: !s2.user.passwordHash }
      })),
      total,
      q.page,
      q.pageSize
    );
  }
  async adminDetail(sellerId) {
    const seller = await this.db.seller.findFirst({
      where: { id: sellerId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, status: true, lastLoginAt: true, emailVerifiedAt: true, createdAt: true } },
        addresses: true,
        documents: { orderBy: { createdAt: "desc" } },
        approvals: { orderBy: { createdAt: "desc" } },
        commissionRules: { where: { isActive: true } }
      }
    });
    if (!seller) throw notFound("Seller");
    const [products, orders, ledger] = await Promise.all([
      this.db.product.groupBy({ by: ["status"], where: { ownerSellerId: sellerId, deletedAt: null }, _count: { _all: true } }),
      this.db.sellerOrder.groupBy({ by: ["status"], where: { sellerId }, _count: { _all: true }, _sum: { grandTotal: true } }),
      this.db.sellerLedger.aggregate({ where: { sellerId }, _sum: { amount: true } })
    ]);
    return {
      ...seller,
      ratingAvg: num(seller.ratingAvg),
      documents: seller.documents.map((d) => ({ ...d, storageKey: void 0 })),
      stats: {
        products: Object.fromEntries(products.map((p) => [p.status, p._count._all])),
        orders: Object.fromEntries(orders.map((o) => [o.status, { count: o._count._all, value: num(o._sum.grandTotal) }])),
        balance: num(ledger._sum.amount)
      }
    };
  }
  async changeStatus(sellerId, to, reason, actor) {
    const seller = await this.db.seller.findFirst({ where: { id: sellerId, deletedAt: null } });
    if (!seller) throw notFound("Seller");
    if (!TRANSITIONS[seller.status].includes(to)) {
      throw businessRule(`Cannot change a seller from ${seller.status} to ${to}`);
    }
    if ((to === "REJECTED" || to === "SUSPENDED") && !reason) throw businessRule("Please provide a reason");
    await this.db.$transaction(async (tx) => {
      const updated = await tx.seller.updateMany({
        where: { id: sellerId, status: seller.status },
        data: {
          status: to,
          statusReason: reason ?? null,
          approvedAt: to === "APPROVED" && !seller.approvedAt ? /* @__PURE__ */ new Date() : void 0
        }
      });
      if (updated.count !== 1) throw conflict("Seller status changed in the meantime");
      await tx.sellerApproval.create({
        data: { sellerId, fromStatus: seller.status, toStatus: to, reason: reason ?? null, actorId: actor?.auth?.userId ?? null }
      });
      await this.audit.record(
        actor,
        { action: `seller.status.${to.toLowerCase()}`, entityType: "Seller", entityId: sellerId, before: { status: seller.status }, after: { status: to, reason } },
        tx
      );
    });
    this.auth.invalidatePrincipal(seller.userId);
    await this.indexer.refreshForSeller(sellerId);
    const key = to === "APPROVED" ? seller.status === "PENDING_APPROVAL" || seller.status === "REJECTED" ? "seller.approved" : "seller.reactivated" : to === "REJECTED" ? "seller.rejected" : to === "SUSPENDED" ? "seller.suspended" : null;
    if (key) {
      await this.notifications.notify({
        key,
        userId: seller.userId,
        vars: { businessName: seller.businessName, reason: reason ?? "" },
        link: "/seller"
      });
    }
    return this.adminDetail(sellerId);
  }
  async adminUpdate(sellerId, input, actor) {
    const before = await this.db.seller.findFirst({ where: { id: sellerId, deletedAt: null } });
    if (!before) throw notFound("Seller");
    const updated = await this.db.seller.update({
      where: { id: sellerId },
      data: {
        businessName: input.businessName,
        displayName: input.displayName,
        description: input.description,
        supportEmail: input.supportEmail,
        supportPhone: input.supportPhone,
        fulfillmentMode: input.fulfillmentMode,
        gstin: input.gstin,
        pan: input.pan,
        isFeatured: input.isFeatured
      }
    });
    await this.audit.record(actor, { action: "seller.admin_update", entityType: "Seller", entityId: sellerId, before, after: updated });
    return updated;
  }
  async verifyDocument(documentId, status, note, actor) {
    const doc = await this.db.sellerDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw notFound("Document");
    const updated = await this.db.sellerDocument.update({ where: { id: documentId }, data: { status, note: note ?? null } });
    await this.audit.record(actor, { action: `seller.document_${status.toLowerCase()}`, entityType: "SellerDocument", entityId: documentId, metadata: { note } });
    return { ...updated, storageKey: void 0 };
  }
};

// src/modules/settings/settings.service.ts
var DEFAULT_SETTINGS = {
  branding: {
    name: "Vyora",
    tagline: "Everything you love, from sellers you trust",
    logoUrl: null,
    primaryColor: "#5B3DF5",
    accentColor: "#FF6B4A",
    announcement: "Free delivery on orders above \u20B9499 \xB7 Cash on Delivery available across India",
    supportEmail: "support@vyora.local",
    supportPhone: "1800-000-0000"
  },
  catalog: {
    /** When an APPROVED product is edited by its seller, send it back to review. */
    productChangesRequireReapproval: true,
    /** New offers by other sellers on an already-approved catalog product skip review. */
    autoApproveListingsOnApprovedProducts: false
  },
  orders: {
    /** Automatically confirm new sub-orders instead of waiting for seller acceptance. */
    autoConfirm: false,
    /** Sub-orders still unconfirmed after this many hours are flagged in admin. */
    confirmationSlaHours: 24
  },
  cod: {
    enabled: true,
    minOrderValue: 0,
    maxOrderValue: 5e4,
    fee: 0,
    restrictedCategoryIds: []
  },
  sellers: {
    /** Suspended sellers may keep fulfilling already-confirmed orders (never accept new ones). */
    suspendedCanFulfillExisting: true
  },
  commission: {
    /** GST charged by the marketplace on its commission, deducted from seller payouts. */
    taxRate: 18
  },
  returns: {
    enabled: true
  },
  reviews: {
    requireModeration: true,
    onlyVerifiedPurchasers: false
  },
  tax: {
    /** Listing prices include GST (Indian retail convention). */
    pricesInclusive: true,
    defaultRate: 18
  }
};
var SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);
var SettingsService = class {
  constructor(repo) {
    this.repo = repo;
  }
  repo;
  cache = null;
  async all() {
    if (this.cache && Date.now() - this.cache.at < 5e3) return this.cache.value;
    const stored = await this.repo.getAll();
    const merged = structuredClone(DEFAULT_SETTINGS);
    for (const key of SETTING_KEYS) {
      const v = stored[key];
      if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(merged[key], v);
    }
    this.cache = { value: merged, at: Date.now() };
    return merged;
  }
  async get(key) {
    return (await this.all())[key];
  }
  /** Shallow-merge a partial update into one settings group. Unknown fields are dropped. */
  async update(key, patch, actorId) {
    const current = await this.get(key);
    const allowed = Object.keys(DEFAULT_SETTINGS[key]);
    const next = { ...current };
    for (const [k, v] of Object.entries(patch)) {
      if (!allowed.includes(k)) continue;
      const def = DEFAULT_SETTINGS[key][k];
      if (def !== null && v !== null && typeof def !== typeof v) continue;
      next[k] = v;
    }
    await this.repo.set(key, next, actorId);
    this.cache = null;
    return next;
  }
  invalidate() {
    this.cache = null;
  }
};

// src/modules/shipping/shipping.service.ts
var ManualShippingProvider = class {
  name = "manual";
};
var DEFAULTS = {
  STANDARD: { label: "Standard delivery", baseFee: 40, freeAbove: 499, minDays: 3, maxDays: 7 },
  EXPRESS: { label: "Express delivery", baseFee: 99, freeAbove: null, minDays: 1, maxDays: 3 }
};
var ShippingService = class {
  constructor(db2, settings, audit) {
    this.db = db2;
    this.settings = settings;
    this.audit = audit;
  }
  db;
  settings;
  audit;
  provider = new ManualShippingProvider();
  async methods() {
    const rows = await this.db.shippingConfiguration.findMany({ orderBy: { baseFee: "asc" } });
    const byMethod = new Map(rows.map((r) => [r.method, r]));
    return Object.keys(DEFAULTS).map((m) => {
      const r = byMethod.get(m);
      return r ? { method: m, label: r.label, baseFee: num(r.baseFee), freeAbove: r.freeAbove === null ? null : num(r.freeAbove), minDays: r.minDays, maxDays: r.maxDays, isActive: r.isActive } : { method: m, ...DEFAULTS[m], isActive: true };
    });
  }
  async rule(method) {
    const m = (await this.methods()).find((x) => x.method === method);
    if (!m || !m.isActive) throw businessRule("This shipping method is not available");
    return {
      baseFee: toPaise(m.baseFee),
      freeAbove: m.freeAbove === null ? null : toPaise(m.freeAbove),
      minDays: m.minDays,
      maxDays: m.maxDays,
      label: m.label
    };
  }
  /**
   * Delivery eligibility for a PIN code. If no serviceability rows are configured, every valid
   * PIN is serviceable. Estimates are indicative ranges, never guaranteed dates.
   */
  async checkPincode(pincode, method = "STANDARD") {
    const [configured, row, cod, rule] = await Promise.all([
      this.db.serviceablePincode.count(),
      this.db.serviceablePincode.findUnique({ where: { pincode } }),
      this.settings.get("cod"),
      this.rule(method).catch(() => null)
    ]);
    const serviceable = configured === 0 ? true : Boolean(row?.isServiceable);
    const extra = row?.extraDays ?? 0;
    const now = /* @__PURE__ */ new Date();
    const addDays = (d) => {
      const x = new Date(now);
      x.setUTCDate(x.getUTCDate() + d);
      return x;
    };
    return {
      pincode,
      serviceable,
      codAvailable: serviceable && cod.enabled && (row ? row.codAvailable : true),
      city: row?.city ?? null,
      state: row?.state ?? null,
      estimate: serviceable && rule ? { minDays: rule.minDays + extra, maxDays: rule.maxDays + extra, from: addDays(rule.minDays + extra), to: addDays(rule.maxDays + extra) } : null
    };
  }
  // ── Admin configuration ────────────────────────────────────
  async upsertMethod(input, actor) {
    if (input.maxDays < input.minDays) throw businessRule("Maximum days must be at least the minimum days");
    const row = await this.db.shippingConfiguration.upsert({
      where: { method: input.method },
      create: { ...input, freeAbove: input.freeAbove ?? null },
      update: { ...input, freeAbove: input.freeAbove ?? null }
    });
    await this.audit.record(actor, { action: "shipping.config", entityType: "ShippingConfiguration", entityId: row.id, after: input });
    return row;
  }
  listPincodes(q) {
    return this.db.serviceablePincode.findMany({
      where: q ? { pincode: { startsWith: q } } : {},
      orderBy: { pincode: "asc" },
      take: 500
    });
  }
  async upsertPincode(input, actor) {
    const row = await this.db.serviceablePincode.upsert({ where: { pincode: input.pincode }, create: input, update: input });
    await this.audit.record(actor, { action: "shipping.pincode", entityType: "ServiceablePincode", entityId: row.id, after: input });
    return row;
  }
  async deletePincode(id, actor) {
    const row = await this.db.serviceablePincode.findUnique({ where: { id } });
    if (!row) throw notFound("PIN code");
    await this.db.serviceablePincode.delete({ where: { id } });
    await this.audit.record(actor, { action: "shipping.pincode_delete", entityType: "ServiceablePincode", entityId: id, before: row });
  }
};

// src/modules/tax/tax.service.ts
var TaxService = class {
  constructor(db2, settings, audit) {
    this.db = db2;
    this.settings = settings;
    this.audit = audit;
  }
  db;
  settings;
  audit;
  /** Map each categoryId → { rate, lineage (nearest first) }. */
  async resolve(categoryIds) {
    const unique = [...new Set(categoryIds)];
    const cats = await this.db.category.findMany({ where: { id: { in: unique } }, select: { id: true, path: true } });
    const lineages = new Map(cats.map((c2) => [c2.id, c2.path.split("/").filter(Boolean).reverse()]));
    const allIds = [...new Set([...lineages.values()].flat())];
    const [configs, taxSettings] = await Promise.all([
      this.db.taxConfiguration.findMany({ where: { isActive: true, OR: [{ categoryId: { in: allIds } }, { categoryId: null }] } }),
      this.settings.get("tax")
    ]);
    const byCat = new Map(configs.filter((c2) => c2.categoryId).map((c2) => [c2.categoryId, num(c2.rate)]));
    const fallback = configs.find((c2) => c2.categoryId === null);
    const defaultRate = fallback ? num(fallback.rate) : taxSettings.defaultRate;
    const out = /* @__PURE__ */ new Map();
    for (const id of unique) {
      const lineage = lineages.get(id) ?? [id];
      const hit = lineage.find((c2) => byCat.has(c2));
      out.set(id, { rate: hit ? byCat.get(hit) : defaultRate, lineage });
    }
    return { rates: out, inclusive: taxSettings.pricesInclusive };
  }
  list() {
    return this.db.taxConfiguration.findMany({ include: { category: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } });
  }
  async create(input, actor) {
    const row = await this.db.taxConfiguration.create({ data: { ...input, categoryId: input.categoryId ?? null } });
    await this.audit.record(actor, { action: "tax.create", entityType: "TaxConfiguration", entityId: row.id, after: row });
    return row;
  }
  async update(id, input, actor) {
    const before = await this.db.taxConfiguration.findUnique({ where: { id } });
    if (!before) throw notFound("Tax configuration");
    const row = await this.db.taxConfiguration.update({ where: { id }, data: { ...input, categoryId: input.categoryId ?? null } });
    await this.audit.record(actor, { action: "tax.update", entityType: "TaxConfiguration", entityId: id, before, after: row });
    return row;
  }
  async remove(id, actor) {
    const before = await this.db.taxConfiguration.findUnique({ where: { id } });
    if (!before) throw notFound("Tax configuration");
    await this.db.taxConfiguration.delete({ where: { id } });
    await this.audit.record(actor, { action: "tax.delete", entityType: "TaxConfiguration", entityId: id, before });
  }
};

// src/modules/users/user-admin.service.ts
var UserAdminService = class {
  constructor(db2, auth, audit) {
    this.db = db2;
    this.auth = auth;
    this.audit = audit;
  }
  db;
  auth;
  audit;
  async list(q) {
    const where = {
      deletedAt: null,
      ...q.status ? { status: q.status } : {},
      ...q.role ? { roles: { some: { role: { code: q.role } } } } : {},
      ...q.q ? { OR: [{ email: { contains: q.q } }, { name: { contains: q.q } }, { phone: { contains: q.q } }] } : {}
    };
    const [items, total] = await Promise.all([
      this.db.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...pageArgs(q.page, q.pageSize),
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          createdAt: true,
          deletionRequestedAt: true,
          lockedUntil: true,
          roles: { select: { role: { select: { code: true } } } },
          seller: { select: { id: true, businessName: true, status: true } },
          _count: { select: { orders: true } }
        }
      }),
      this.db.user.count({ where })
    ]);
    return paginated(items.map((u) => ({ ...u, roles: u.roles.map((r) => r.role.code) })), total, q.page, q.pageSize);
  }
  async detail(userId) {
    const user = await this.db.user.findFirst({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        deletionRequestedAt: true,
        failedLoginCount: true,
        lockedUntil: true,
        roles: { select: { role: { select: { code: true, name: true } } } },
        seller: { select: { id: true, businessName: true, status: true } },
        addresses: { where: { deletedAt: null } },
        orders: { orderBy: { placedAt: "desc" }, take: 10, select: { id: true, orderNumber: true, status: true, grandTotal: true, placedAt: true } }
      }
    });
    if (!user) throw notFound("User");
    const security = await this.db.securityEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 });
    return { ...user, roles: user.roles.map((r) => r.role.code), orders: user.orders.map((o) => ({ ...o, grandTotal: Number(o.grandTotal) })), security };
  }
  async update(userId, input, actor) {
    const user = await this.db.user.findFirst({ where: { id: userId, deletedAt: null }, include: { roles: { include: { role: true } }, seller: true } });
    if (!user) throw notFound("User");
    if (userId === actor?.auth?.userId && (input.status === "SUSPENDED" || input.roles && !input.roles.includes("ADMIN"))) {
      throw businessRule("You cannot suspend yourself or remove your own admin role");
    }
    const before = { status: user.status, roles: user.roles.map((r) => r.role.code) };
    if (input.roles?.includes("SELLER") && !user.seller) throw businessRule("The seller role requires a seller account \u2014 create one from the Sellers page");
    if (input.roles && !input.roles.includes("ADMIN") && before.roles.includes("ADMIN")) {
      const admins = await this.db.userRole.count({ where: { role: { code: "ADMIN" }, user: { status: "ACTIVE", deletedAt: null } } });
      if (admins <= 1) throw businessRule("The marketplace must keep at least one active admin");
    }
    await this.db.$transaction(async (tx) => {
      if (input.status) {
        await tx.user.update({ where: { id: userId }, data: { status: input.status, ...input.status === "ACTIVE" ? { lockedUntil: null, failedLoginCount: 0 } : {} } });
      }
      if (input.roles) {
        const roles = await tx.role.findMany({ where: { code: { in: input.roles } } });
        await tx.userRole.deleteMany({ where: { userId } });
        await tx.userRole.createMany({ data: roles.map((r) => ({ userId, roleId: r.id })) });
      }
      await this.audit.record(actor, { action: "user.update", entityType: "User", entityId: userId, before, after: input }, tx);
    });
    if (input.status === "SUSPENDED") await this.auth.revokeAllSessions(userId);
    this.auth.invalidatePrincipal(userId);
    return this.detail(userId);
  }
  /** Complete an account deletion: anonymise personal data, keep order/financial history. */
  async anonymize(userId, actor) {
    const user = await this.db.user.findFirst({ where: { id: userId, deletedAt: null }, include: { seller: true } });
    if (!user) throw notFound("User");
    if (user.seller && user.seller.status === "APPROVED") throw businessRule("Deactivate the seller account first");
    const stamp = Date.now().toString(36);
    await this.db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${stamp}-${userId.slice(-6)}@deleted.invalid`,
          phone: null,
          name: "Deleted user",
          passwordHash: null,
          status: "DELETED",
          deletedAt: /* @__PURE__ */ new Date()
        }
      });
      await tx.customerAddress.updateMany({ where: { userId }, data: { deletedAt: /* @__PURE__ */ new Date() } });
      await tx.cart.deleteMany({ where: { userId } });
      await tx.wishlist.deleteMany({ where: { userId } });
      await tx.recentlyViewedProduct.deleteMany({ where: { userId } });
      await tx.searchHistory.deleteMany({ where: { userId } });
      await this.audit.record(actor, { action: "user.anonymize", entityType: "User", entityId: userId }, tx);
    });
    await this.auth.revokeAllSessions(userId);
  }
  async roles() {
    const roles = await this.db.role.findMany({ include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } } });
    const permissions = await this.db.permission.findMany({ orderBy: { code: "asc" } });
    return {
      roles: roles.map((r) => ({ id: r.id, code: r.code, name: r.name, description: r.description, isSystem: r.isSystem, users: r._count.users, permissions: r.permissions.map((p) => p.permission.code) })),
      permissions
    };
  }
  async setRolePermissions(roleCode, permissionCodes, actor) {
    const role = await this.db.role.findUnique({ where: { code: roleCode }, include: { permissions: { include: { permission: true } } } });
    if (!role) throw notFound("Role");
    if (role.code === "ADMIN" && !permissionCodes.includes("roles:manage")) {
      throw businessRule("The admin role must keep the roles:manage permission");
    }
    const perms = await this.db.permission.findMany({ where: { code: { in: permissionCodes } } });
    await this.db.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      await tx.rolePermission.createMany({ data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })) });
      await this.audit.record(
        actor,
        { action: "role.permissions", entityType: "Role", entityId: role.id, before: role.permissions.map((p) => p.permission.code), after: perms.map((p) => p.code) },
        tx
      );
    });
    const users = await this.db.userRole.findMany({ where: { roleId: role.id }, select: { userId: true } });
    users.forEach((u) => this.auth.invalidatePrincipal(u.userId));
    return this.roles();
  }
  async auditLogs(q) {
    const where = {
      ...q.entityType ? { entityType: q.entityType } : {},
      ...q.actorId ? { actorId: q.actorId } : {},
      ...q.action ? { action: { startsWith: q.action } } : {},
      ...q.q ? { OR: [{ entityId: q.q }, { action: { contains: q.q } }] } : {}
    };
    const [items, total] = await Promise.all([
      this.db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, ...pageArgs(q.page, q.pageSize), include: { actor: { select: { name: true, email: true } } } }),
      this.db.auditLog.count({ where })
    ]);
    return paginated(items, total, q.page, q.pageSize);
  }
  async securityEvents(q) {
    const where = {
      ...q.type ? { type: q.type } : {},
      ...q.q ? { OR: [{ email: { contains: q.q } }, { ip: { contains: q.q } }, { userId: q.q }] } : {}
    };
    const [items, total, types] = await Promise.all([
      this.db.securityEvent.findMany({ where, orderBy: { createdAt: "desc" }, ...pageArgs(q.page, q.pageSize) }),
      this.db.securityEvent.count({ where }),
      this.db.securityEvent.groupBy({ by: ["type"], _count: { _all: true }, where: { createdAt: { gte: new Date(Date.now() - 7 * 864e5) } } })
    ]);
    return { ...paginated(items, total, q.page, q.pageSize), last7Days: types.map((t) => ({ type: t.type, count: t._count._all })) };
  }
};

// src/bootstrap/container.ts
function createContainer(env2) {
  const database = createDatabaseProvider(env2);
  const db2 = database.client;
  const redis = env2.REDIS_ENABLED ? new Redis(env2.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: false }) : null;
  const rateLimitStore = redis ? new RedisRateLimitStore(redis) : new MemoryRateLimitStore();
  const cache = env2.APP_ENV === "test" ? new NoopCache() : redis ? new RedisCache(redis) : new MemoryCache();
  const jobs = redis ? new BullJobQueue(redis) : new InlineJobQueue();
  const storage = createStorage(env2);
  const channels = createChannels(env2);
  const settings = new SettingsService(new PrismaSettingsRepository(db2));
  const audit = new AuditService(new PrismaAuditRepository(db2), new PrismaSecurityEventRepository(db2));
  const notifications = new NotificationService(db2, env2, channels, jobs, settings);
  const hasher = createPasswordHasher(env2.PASSWORD_HASHER, env2.APP_ENV === "test");
  const auth = new AuthService(db2, env2, hasher, audit, notifications);
  const indexer = new ProductIndexer(db2, cache);
  const catalog = new CatalogService(db2, cache, audit);
  const storefront = new StorefrontService(db2, catalog, cache);
  const inventory = new InventoryService(db2, indexer, audit, notifications);
  const products = new ProductService(db2, storage, inventory, indexer, settings, audit, notifications);
  const productIo = new ProductIoService(db2, products, inventory, indexer);
  const sellers = new SellerService(db2, auth, storage, indexer, audit, notifications);
  const tax = new TaxService(db2, settings, audit);
  const shipping = new ShippingService(db2, settings, audit);
  const coupons = new CouponService(db2, audit);
  const cart = new CartService(db2, coupons, shipping, tax, settings);
  const finance = new FinanceService(db2, audit, notifications, env2.COMMISSION_DEFAULT_PERCENTAGE);
  const payments = new PaymentRegistry([new CashOnDeliveryProvider()]);
  const checkout = new CheckoutService(db2, cart, coupons, inventory, shipping, finance, payments, settings, indexer, audit, notifications);
  const fulfillment = new FulfillmentService(db2, inventory, finance, coupons, shipping, settings, indexer, audit, notifications);
  const orderQueries = new OrderQueryService(db2);
  const customers = new CustomerService(db2, auth, storefront, channels, audit);
  const reviews = new ReviewService(db2, storage, settings, audit);
  const content = new ContentService(db2, storefront, catalog, settings, storage, cache, audit);
  const analytics = new AnalyticsService(db2, finance, products, env2.DEFAULT_TIMEZONE);
  const users = new UserAdminService(db2, auth, audit);
  return {
    env: env2,
    database,
    db: db2,
    redis,
    cache,
    jobs,
    storage,
    rateLimitStore,
    services: {
      settings,
      audit,
      notifications,
      auth,
      indexer,
      catalog,
      storefront,
      inventory,
      products,
      productIo,
      sellers,
      tax,
      shipping,
      coupons,
      cart,
      finance,
      payments,
      checkout,
      fulfillment,
      orderQueries,
      customers,
      reviews,
      content,
      analytics,
      users
    },
    async shutdown() {
      await jobs.close();
      await database.disconnect();
      if (redis) redis.disconnect();
    }
  };
}

// prisma/demo-content.ts
import sharp2 from "sharp";

// prisma/art/product-art.ts
var RULES = [
  // Order matters: more specific phrases first (e.g. "headphones" before "phone").
  [/smartwatch|fit smart/i, "smartwatch"],
  [/headphone|over-ear/i, "headphones"],
  [/earbud|tws/i, "earbuds"],
  [/phone|mobile/i, "phone"],
  [/backpack|\bbag\b/i, "backpack"],
  [/laptop|chromebook|notebook/i, "laptop"],
  [/speaker/i, "speaker"],
  [/power ?bank/i, "powerbank"],
  [/cable|charger/i, "cable"],
  [/t-shirt|\btee\b/i, "tshirt"],
  [/shirt/i, "shirt"],
  [/jeans|denim/i, "jeans"],
  [/dress|maxi/i, "dress"],
  [/hoodie|sweatshirt/i, "hoodie"],
  [/kurta/i, "kurta"],
  [/running/i, "running-shoe"],
  [/sneaker/i, "sneaker"],
  [/formal shoe|leather.*shoe|oxford/i, "formal-shoe"],
  [/\bwatch/i, "watch"],
  [/earring|jhumka/i, "earrings"],
  [/sunglass/i, "sunglasses"],
  [/pressure cooker/i, "pressure-cooker"],
  [/cookware|\bpan\b|kadai|tawa/i, "pan"],
  [/container|storage/i, "containers"],
  [/bedsheet|bed sheet/i, "bedsheet"],
  [/\brug\b|carpet/i, "rug"],
  [/lamp/i, "lamp"],
  [/candle/i, "candles"],
  [/perfume|parfum|fragrance/i, "perfume"],
  [/hair oil/i, "bottle"],
  [/\brice\b|\batta\b|\bdal\b/i, "rice"],
  [/\boil\b/i, "oil"],
  [/makhana|snack|chips/i, "snack"],
  [/\btea\b|coffee/i, "tea"],
  [/puzzle/i, "puzzle"],
  [/teddy|plush/i, "teddy"],
  [/scooter/i, "scooter"],
  [/serum/i, "serum"],
  [/face wash|sunscreen|cream|\bgel\b/i, "tube"],
  [/lipstick/i, "lipstick"],
  [/vase/i, "vase"]
];
function artKindFor(title) {
  return RULES.find(([re]) => re.test(title))?.[1] ?? "box";
}
var COLOR_WORDS = {
  black: "#2b2d38",
  white: "#f4f5f8",
  blue: "#3b6fd8",
  red: "#d8433b",
  green: "#2f9e6b",
  pink: "#e96fa4",
  grey: "#8a8f9c",
  gray: "#8a8f9c",
  beige: "#d8c3a0",
  yellow: "#f2c230",
  navy: "#223a6b",
  brown: "#8a5a3b"
};
function palette(seed, colorHint) {
  const hues = [255, 12, 170, 330, 215, 38, 145, 280];
  let h = 0;
  for (const ch of seed) h = h * 31 + ch.charCodeAt(0) >>> 0;
  const hue = hues[h % hues.length];
  const hint = colorHint && COLOR_WORDS[colorHint.toLowerCase()];
  return {
    bg1: `hsl(${hue} 70% 97%)`,
    bg2: `hsl(${(hue + 30) % 360} 65% 90%)`,
    main: hint ?? `hsl(${hue} 62% 52%)`,
    dark: hint ? shade(hint, -0.35) : `hsl(${hue} 55% 34%)`,
    light: hint ? shade(hint, 0.35) : `hsl(${hue} 80% 76%)`,
    accent: `hsl(${(hue + 160) % 360} 75% 55%)`
  };
}
function shade(hex, amt) {
  const n2 = parseInt(hex.slice(1), 16);
  const f = (c2) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c2 * (1 + amt) : c2 + (255 - c2) * amt)));
  const r = f(n2 >> 16), g = f(n2 >> 8 & 255), b = f(n2 & 255);
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}
var G = (id, a, b, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
var DRAW = {
  phone: (p) => `${defs(G("b", p.light, p.dark, 1, 1), G("s", "#1d2030", "#3a4060", 1, 1))}
    <rect x="330" y="140" width="340" height="690" rx="54" fill="url(#b)"/>
    <rect x="348" y="160" width="304" height="650" rx="40" fill="url(#s)"/>
    <rect x="348" y="160" width="304" height="650" rx="40" fill="#fff" opacity=".06"/>
    <path d="M360 175 L560 175 L360 520 Z" fill="#fff" opacity=".08"/>
    <rect x="455" y="178" width="90" height="18" rx="9" fill="#0b0c12"/>
    <rect x="378" y="560" width="244" height="60" rx="14" fill="${p.main}" opacity=".85"/>
    <rect x="378" y="640" width="116" height="116" rx="22" fill="${p.accent}" opacity=".8"/><rect x="506" y="640" width="116" height="116" rx="22" fill="${p.light}" opacity=".7"/>
    <circle cx="700" cy="280" r="0"/>`,
  laptop: (p) => `${defs(G("b", "#e9ebf2", "#b9bdca"), G("s", "#1d2030", "#394061", 1, 1))}
    <rect x="215" y="215" width="570" height="380" rx="26" fill="#2a2d3a"/>
    <rect x="238" y="238" width="524" height="334" rx="10" fill="url(#s)"/>
    <path d="M250 250 L520 250 L250 470 Z" fill="#fff" opacity=".07"/>
    <rect x="270" y="280" width="200" height="26" rx="8" fill="${p.main}"/><rect x="270" y="324" width="300" height="16" rx="8" fill="#fff" opacity=".35"/><rect x="270" y="352" width="250" height="16" rx="8" fill="#fff" opacity=".25"/>
    <rect x="590" y="420" width="140" height="120" rx="16" fill="${p.accent}" opacity=".8"/>
    <path d="M150 600 H850 L810 660 H190 Z" fill="url(#b)"/><rect x="430" y="604" width="140" height="12" rx="6" fill="#9ca0ad"/>`,
  earbuds: (p) => `${defs(G("c", "#ffffff", "#dde0ea"), G("b", p.light, p.main, 1, 1))}
    <rect x="300" y="430" width="400" height="330" rx="160" fill="url(#c)" stroke="#cfd3de" stroke-width="4"/>
    <path d="M300 560 H700" stroke="#c4c8d4" stroke-width="5"/><circle cx="500" cy="640" r="12" fill="${p.accent}"/>
    <g transform="translate(360 250)"><ellipse cx="60" cy="70" rx="62" ry="70" fill="url(#b)"/><rect x="40" y="110" width="40" height="150" rx="20" fill="url(#b)"/><circle cx="60" cy="62" r="26" fill="${p.dark}" opacity=".5"/></g>
    <g transform="translate(520 230) rotate(12)"><ellipse cx="60" cy="70" rx="62" ry="70" fill="url(#b)"/><rect x="40" y="110" width="40" height="150" rx="20" fill="url(#b)"/><circle cx="60" cy="62" r="26" fill="${p.dark}" opacity=".5"/></g>`,
  headphones: (p) => `${defs(G("b", p.light, p.dark, 1, 1))}
    <path d="M270 560 C270 250 730 250 730 560" fill="none" stroke="${p.dark}" stroke-width="46" stroke-linecap="round"/>
    <path d="M300 540 C300 300 700 300 700 540" fill="none" stroke="#fff" stroke-width="10" opacity=".25"/>
    <rect x="200" y="500" width="150" height="250" rx="70" fill="url(#b)"/><rect x="650" y="500" width="150" height="250" rx="70" fill="url(#b)"/>
    <rect x="235" y="540" width="80" height="170" rx="40" fill="${p.dark}" opacity=".45"/><rect x="685" y="540" width="80" height="170" rx="40" fill="${p.dark}" opacity=".45"/>`,
  speaker: (p) => `${defs(G("b", p.light, p.dark, 1, 1))}
    <rect x="220" y="330" width="560" height="440" rx="200" fill="url(#b)"/>
    <rect x="260" y="370" width="480" height="360" rx="170" fill="${p.dark}" opacity=".35"/>
    ${Array.from({ length: 5 }, (_, r) => Array.from({ length: 11 }, (_2, c2) => `<circle cx="${310 + c2 * 38}" cy="${450 + r * 50}" r="8" fill="#fff" opacity=".35"/>`).join("")).join("")}
    <rect x="440" y="300" width="120" height="44" rx="18" fill="${p.dark}"/>`,
  smartwatch: (p) => `${defs(G("b", p.light, p.dark), G("s", "#171a28", "#343a58", 1, 1))}
    <rect x="410" y="80" width="180" height="300" rx="50" fill="url(#b)"/><rect x="410" y="620" width="180" height="300" rx="50" fill="url(#b)"/>
    <rect x="330" y="300" width="340" height="400" rx="90" fill="#2b2e3c"/><rect x="352" y="322" width="296" height="356" rx="72" fill="url(#s)"/>
    <text x="500" y="500" font-family="Arial" font-size="92" font-weight="700" fill="#fff" text-anchor="middle">10:09</text>
    <path d="M430 560 a70 70 0 0 1 140 0" fill="none" stroke="${p.accent}" stroke-width="16" stroke-linecap="round"/>
    <rect x="668" y="430" width="22" height="80" rx="10" fill="#555a6e"/>`,
  powerbank: (p) => `${defs(G("b", p.light, p.dark, 1, 1))}
    <rect x="330" y="170" width="340" height="630" rx="60" fill="url(#b)"/>
    <rect x="360" y="200" width="100" height="570" rx="40" fill="#fff" opacity=".12"/>
    ${[0, 1, 2, 3].map((i) => `<circle cx="${440 + i * 40}" cy="640" r="11" fill="${i < 3 ? "#7dffb8" : "#fff"}" opacity="${i < 3 ? 1 : 0.35}"/>`).join("")}
    <rect x="420" y="760" width="160" height="26" rx="12" fill="${p.dark}"/>`,
  cable: (p) => `${defs()}
    <path d="M250 300 C250 700 750 200 750 650" fill="none" stroke="${p.dark}" stroke-width="44" stroke-linecap="round"/>
    <path d="M250 300 C250 700 750 200 750 650" fill="none" stroke="${p.light}" stroke-width="18" stroke-dasharray="14 14" opacity=".6"/>
    <rect x="205" y="170" width="90" height="150" rx="22" fill="#d7dae4"/><rect x="228" y="120" width="44" height="70" rx="10" fill="#9ea3b2"/>
    <rect x="705" y="630" width="90" height="150" rx="22" fill="#d7dae4"/><rect x="728" y="760" width="44" height="60" rx="10" fill="#9ea3b2"/>`,
  shirt: (p) => `${defs(G("b", p.light, p.main))}
    <path d="M330 190 L420 150 Q500 220 580 150 L670 190 L800 330 L720 410 L670 360 L670 820 L330 820 L330 360 L280 410 L200 330 Z" fill="url(#b)"/>
    <path d="M420 150 Q500 220 580 150 L560 260 L500 220 L440 260 Z" fill="${p.dark}" opacity=".35"/>
    <line x1="500" y1="230" x2="500" y2="820" stroke="${p.dark}" stroke-width="5" opacity=".4"/>
    ${[320, 420, 520, 620, 720].map((y) => `<circle cx="500" cy="${y}" r="9" fill="#fff" opacity=".8"/>`).join("")}
    <rect x="360" y="330" width="90" height="70" rx="8" fill="${p.dark}" opacity=".18"/>`,
  jeans: (p) => `${defs(G("b", "#5b7fc4", "#2c4577"))}
    <path d="M330 150 H670 L700 840 H540 L500 400 L460 840 H300 Z" fill="url(#b)"/>
    <rect x="330" y="150" width="340" height="60" fill="#2a4172"/>
    <path d="M360 230 Q400 300 480 240" fill="none" stroke="#c9a14a" stroke-width="5"/><path d="M640 230 Q600 300 520 240" fill="none" stroke="#c9a14a" stroke-width="5"/>
    <circle cx="500" cy="180" r="10" fill="#c9a14a"/><line x1="500" y1="210" x2="500" y2="360" stroke="#c9a14a" stroke-width="4" stroke-dasharray="10 8"/>`,
  dress: (p) => `${defs(G("b", p.light, p.main))}
    <path d="M430 140 L470 150 Q500 190 530 150 L570 140 L600 330 L760 820 L240 820 L400 330 Z" fill="url(#b)"/>
    <path d="M400 330 H600" stroke="${p.dark}" stroke-width="16"/>
    ${[[380, 500], [560, 560], [460, 660], [620, 720], [330, 740], [500, 430]].map(([x, y]) => `<g transform="translate(${x} ${y})"><circle r="22" fill="#fff" opacity=".8"/><circle r="9" fill="${p.accent}"/></g>`).join("")}`,
  hoodie: (p) => `${defs(G("b", p.light, p.main))}
    <path d="M380 160 Q500 60 620 160 L700 200 L820 420 L740 460 L690 390 L690 820 L310 820 L310 390 L260 460 L180 420 L300 200 Z" fill="url(#b)"/>
    <path d="M400 170 Q500 280 600 170 Q560 120 500 120 Q440 120 400 170 Z" fill="${p.dark}" opacity=".35"/>
    <rect x="390" y="560" width="220" height="140" rx="30" fill="${p.dark}" opacity=".25"/>
    <line x1="470" y1="240" x2="460" y2="380" stroke="#fff" stroke-width="6"/><line x1="530" y1="240" x2="540" y2="380" stroke="#fff" stroke-width="6"/>`,
  kurta: (p) => `${defs(G("b", p.light, p.main))}
    <path d="M360 170 L440 140 Q500 200 560 140 L640 170 L760 360 L690 400 L650 340 L680 840 L320 840 L350 340 L310 400 L240 360 Z" fill="url(#b)"/>
    <path d="M500 190 V480" stroke="${p.dark}" stroke-width="6"/>
    ${Array.from({ length: 6 }, (_, i) => `<circle cx="500" cy="${220 + i * 45}" r="7" fill="#f6d57a"/>`).join("")}
    <path d="M330 780 H670" stroke="#f6d57a" stroke-width="14" stroke-dasharray="20 12"/>`,
  tshirt: (p) => `${defs(G("b", p.light, p.main), G("b2", "#ffd66b", "#f59e0b"), G("b3", "#7fe3c1", "#10b981"))}
    <g transform="translate(-120 40) scale(.8)"><path d="M330 190 L430 160 Q500 210 570 160 L670 190 L790 320 L710 390 L670 350 L670 800 L330 800 L330 350 L290 390 L210 320 Z" fill="url(#b3)"/></g>
    <g transform="translate(320 40) scale(.8)"><path d="M330 190 L430 160 Q500 210 570 160 L670 190 L790 320 L710 390 L670 350 L670 800 L330 800 L330 350 L290 390 L210 320 Z" fill="url(#b2)"/></g>
    <g transform="translate(100 80) scale(.8)"><path d="M330 190 L430 160 Q500 210 570 160 L670 190 L790 320 L710 390 L670 350 L670 800 L330 800 L330 350 L290 390 L210 320 Z" fill="url(#b)"/><circle cx="500" cy="440" r="70" fill="#fff" opacity=".7"/><path d="M470 430 l20 20 40 -40" stroke="${p.dark}" stroke-width="14" fill="none"/></g>`,
  "running-shoe": (p) => shoe(p, true),
  sneaker: (p) => shoe({ ...p, main: "#f4f5f8", dark: "#c9ccd6", light: "#ffffff" }, false),
  "formal-shoe": (p) => `${defs(G("b", "#8a5a3b", "#3d2415"))}
    <path d="M190 640 Q200 520 330 500 L520 470 Q640 450 700 520 Q820 540 830 640 Q830 700 760 700 L230 700 Q185 700 190 640 Z" fill="url(#b)"/>
    <path d="M330 500 Q420 560 560 480" fill="none" stroke="#2a180d" stroke-width="10"/>
    <path d="M200 690 H820" stroke="#1d1109" stroke-width="26" stroke-linecap="round"/>
    <path d="M260 560 Q420 520 640 540" stroke="#fff" stroke-width="10" opacity=".15" fill="none"/>`,
  backpack: (p) => `${defs(G("b", p.light, p.dark, 1, 1))}
    <path d="M400 190 Q400 120 500 120 Q600 120 600 190" fill="none" stroke="${p.dark}" stroke-width="30"/>
    <rect x="290" y="180" width="420" height="640" rx="120" fill="url(#b)"/>
    <rect x="350" y="520" width="300" height="220" rx="50" fill="${p.dark}" opacity=".35"/>
    <path d="M350 590 H650" stroke="#fff" stroke-width="8" opacity=".5"/><rect x="480" y="560" width="40" height="18" rx="6" fill="#f6d57a"/>
    <rect x="330" y="240" width="60" height="240" rx="30" fill="#fff" opacity=".12"/>`,
  watch: (p) => `${defs(G("b", "#8a5a3b", "#4a2d1a"), G("c", "#f1f2f6", "#b9bdca", 1, 1))}
    <rect x="430" y="90" width="140" height="820" rx="40" fill="url(#b)"/>
    <circle cx="500" cy="500" r="210" fill="url(#c)"/><circle cx="500" cy="500" r="176" fill="#fdfdfd" stroke="#d6d9e2" stroke-width="6"/>
    ${Array.from({ length: 12 }, (_, i) => {
    const a = i * Math.PI / 6;
    return `<line x1="${500 + Math.sin(a) * 150}" y1="${500 - Math.cos(a) * 150}" x2="${500 + Math.sin(a) * 165}" y2="${500 - Math.cos(a) * 165}" stroke="#2b2d38" stroke-width="${i % 3 ? 4 : 9}"/>`;
  }).join("")}
    <line x1="500" y1="500" x2="500" y2="390" stroke="#2b2d38" stroke-width="12" stroke-linecap="round"/><line x1="500" y1="500" x2="590" y2="540" stroke="#2b2d38" stroke-width="8" stroke-linecap="round"/><circle cx="500" cy="500" r="14" fill="${p.main}"/>`,
  earrings: (p) => [360, 640].map((x) => `
    <circle cx="${x}" cy="220" r="18" fill="none" stroke="#b7bcc9" stroke-width="10"/>
    <line x1="${x}" y1="238" x2="${x}" y2="330" stroke="#b7bcc9" stroke-width="8"/>
    <circle cx="${x}" cy="350" r="34" fill="#c7ccd9"/><circle cx="${x}" cy="350" r="16" fill="${p.accent}"/>
    <path d="M${x - 130} 560 Q${x} 390 ${x + 130} 560 Z" fill="#c1c6d3"/>
    <path d="M${x - 130} 560 Q${x} 470 ${x + 130} 560" fill="none" stroke="#8d93a3" stroke-width="8"/>
    ${[-100, -50, 0, 50, 100].map((d) => `<line x1="${x + d}" y1="560" x2="${x + d}" y2="640" stroke="#b7bcc9" stroke-width="5"/><circle cx="${x + d}" cy="650" r="14" fill="${p.main}"/>`).join("")}`).join(""),
  sunglasses: (p) => `${defs(G("l", "#2b2d38", p.dark, 1, 1))}
    <path d="M150 400 H850" stroke="#2b2d38" stroke-width="22"/>
    <path d="M170 410 Q170 640 330 640 Q470 640 470 420 Z" fill="url(#l)"/><path d="M530 420 Q530 640 670 640 Q830 640 830 410 Z" fill="url(#l)"/>
    <path d="M200 430 L330 430 L230 560 Z" fill="#fff" opacity=".18"/><path d="M560 430 L690 430 L590 560 Z" fill="#fff" opacity=".18"/>
    <path d="M470 430 Q500 400 530 430" stroke="#2b2d38" stroke-width="18" fill="none"/>`,
  pan: (p) => `${defs(G("b", "#3a3d4c", "#15161d"), G("r", "#6c7085", "#3a3d4c"))}
    <ellipse cx="430" cy="560" rx="300" ry="120" fill="url(#r)"/><ellipse cx="430" cy="545" rx="270" ry="98" fill="url(#b)"/>
    <ellipse cx="380" cy="520" rx="120" ry="32" fill="#fff" opacity=".07"/>
    <rect x="700" y="490" width="260" height="46" rx="23" fill="${p.dark}" transform="rotate(-12 700 490)"/>
    <ellipse cx="560" cy="330" rx="170" ry="60" fill="url(#r)" opacity=".9"/><ellipse cx="560" cy="320" rx="150" ry="46" fill="url(#b)"/>`,
  "pressure-cooker": (p) => `${defs(G("b", "#f1f2f6", "#9ea3b2", 1, 0))}
    <path d="M280 420 H720 V720 Q720 790 650 790 H350 Q280 790 280 720 Z" fill="url(#b)"/>
    <ellipse cx="500" cy="420" rx="230" ry="50" fill="#d9dce5"/><ellipse cx="500" cy="400" rx="200" ry="40" fill="#b9bdca"/>
    <rect x="470" y="300" width="60" height="100" rx="14" fill="#2b2d38"/><rect x="455" y="280" width="90" height="36" rx="12" fill="${p.main}"/>
    <rect x="700" y="400" width="240" height="40" rx="20" fill="#2b2d38"/><rect x="60" y="420" width="240" height="40" rx="20" fill="#2b2d38"/>
    <rect x="320" y="480" width="40" height="260" rx="20" fill="#fff" opacity=".5"/>`,
  containers: (p) => [[250, 460, 1], [500, 420, 1.15], [750, 470, 0.95]].map(([x, y, s2], i) => `
    <g transform="translate(${x} ${y}) scale(${s2})">
      <rect x="-110" y="-10" width="220" height="300" rx="30" fill="#eaf6ff" stroke="#b8d6ea" stroke-width="6" opacity=".95"/>
      <rect x="-100" y="${i === 1 ? 90 : 150}" width="200" height="${i === 1 ? 190 : 130}" rx="20" fill="${[p.accent, "#f2c230", "#7a4b2a"][i]}" opacity=".75"/>
      <rect x="-120" y="-50" width="240" height="56" rx="20" fill="${p.main}"/><rect x="-60" y="-66" width="120" height="24" rx="12" fill="${p.dark}"/>
    </g>`).join(""),
  bedsheet: (p) => `${defs(G("b", p.light, p.main, 1, 1))}
    <path d="M150 360 L720 280 L860 600 L290 700 Z" fill="url(#b)"/>
    ${Array.from({ length: 7 }, (_, i) => `<path d="M${190 + i * 80} ${355 - i * 11} L${330 + i * 80} ${690 - i * 14}" stroke="#fff" stroke-width="10" opacity=".35"/>`).join("")}
    <path d="M290 700 L860 600 L870 650 L300 760 Z" fill="${p.dark}"/>
    <rect x="600" y="200" width="240" height="120" rx="50" fill="#fff" transform="rotate(-10 600 200)" opacity=".95"/>`,
  rug: (p) => `${defs(G("b", "#d8b98a", "#a8804e"))}
    <ellipse cx="500" cy="560" rx="360" ry="230" fill="url(#b)"/>
    ${[300, 240, 180, 120, 60].map((r, i) => `<ellipse cx="500" cy="560" rx="${r}" ry="${r * 0.64}" fill="none" stroke="${i % 2 ? "#8a6436" : "#ecd6b0"}" stroke-width="16"/>`).join("")}`,
  lamp: (p) => `${defs(G("s", "#fff7e0", "#f5d98a"), G("b", p.light, p.dark, 1, 1))}
    <circle cx="500" cy="330" r="240" fill="#fff4c2" opacity=".45"/>
    <path d="M360 180 H640 L720 430 H280 Z" fill="url(#s)"/><path d="M360 180 H640" stroke="#e7c86a" stroke-width="10"/>
    <rect x="488" y="430" width="24" height="120" fill="#c9ccd6"/>
    <path d="M400 560 Q400 520 500 520 Q600 520 600 560 L630 800 Q630 830 500 830 Q370 830 370 800 Z" fill="url(#b)"/>`,
  candles: (p) => [[320, 470, 260], [500, 400, 330], [680, 500, 230]].map(([x, y, h], i) => `
    <rect x="${x - 70}" y="${y}" width="140" height="${h}" rx="18" fill="${["#f7e7d0", p.light, "#fde2e4"][i]}"/>
    <rect x="${x - 70}" y="${y + 40}" width="140" height="40" fill="${p.main}" opacity=".35"/>
    <line x1="${x}" y1="${y}" x2="${x}" y2="${y - 30}" stroke="#2b2d38" stroke-width="6"/>
    <path d="M${x} ${y - 110} Q${x + 34} ${y - 60} ${x} ${y - 30} Q${x - 34} ${y - 60} ${x} ${y - 110} Z" fill="#ffb02e"/>
    <circle cx="${x}" cy="${y - 60}" r="70" fill="#ffd66b" opacity=".18"/>`).join(""),
  rice: (p) => `${defs(G("b", "#f7f1e3", "#dcccaa"))}
    <path d="M330 220 Q500 170 670 220 L720 800 Q500 840 280 800 Z" fill="url(#b)"/>
    <path d="M330 220 Q500 170 670 220 L640 290 Q500 250 360 290 Z" fill="#c8b484"/>
    <rect x="360" y="420" width="280" height="240" rx="30" fill="${p.main}"/>
    <text x="500" y="520" font-family="Arial" font-size="58" font-weight="800" fill="#fff" text-anchor="middle">BASMATI</text>
    <text x="500" y="600" font-family="Arial" font-size="44" font-weight="700" fill="#fff" text-anchor="middle" opacity=".85">5 kg</text>
    ${Array.from({ length: 9 }, (_, i) => `<ellipse cx="${260 + i * 60}" cy="${840 - i % 2 * 14}" rx="16" ry="7" fill="#f2ead6" transform="rotate(${i * 20} ${260 + i * 60} 840)"/>`).join("")}`,
  oil: (p) => `${defs(G("b", "#ffe07a", "#e0a31a", 1, 0))}
    <path d="M400 330 Q400 280 440 270 L440 200 H560 V270 Q600 280 600 330 L620 800 Q620 830 590 830 H410 Q380 830 380 800 Z" fill="url(#b)" opacity=".92"/>
    <rect x="430" y="150" width="140" height="60" rx="14" fill="${p.dark}"/>
    <rect x="395" y="480" width="210" height="200" rx="24" fill="#fff" opacity=".9"/>
    <circle cx="500" cy="560" r="44" fill="#6aa84f"/><path d="M500 530 Q530 560 500 600 Q470 560 500 530 Z" fill="#fff"/>
    <rect x="420" y="360" width="30" height="400" rx="15" fill="#fff" opacity=".35"/>`,
  snack: (p) => `${defs(G("b", p.light, p.main, 1, 1))}
    <path d="M320 180 L680 180 L700 220 L670 780 L700 820 L300 820 L330 780 L300 220 Z" fill="url(#b)"/>
    <path d="M300 220 H700 M300 780 H700" stroke="${p.dark}" stroke-width="10" stroke-dasharray="16 10"/>
    <circle cx="500" cy="500" r="130" fill="#fff" opacity=".9"/>
    ${[[470, 470], [530, 480], [490, 540], [540, 540], [450, 530]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="30" fill="#f4e6c9" stroke="#e0caa0" stroke-width="4"/>`).join("")}
    <rect x="370" y="670" width="260" height="46" rx="20" fill="${p.dark}"/>`,
  tea: (p) => `${defs(G("b", p.main, p.dark, 1, 1))}
    <path d="M300 300 L650 250 L760 330 L760 760 L410 820 L300 740 Z" fill="${p.dark}"/>
    <path d="M300 300 L650 250 L650 700 L300 740 Z" fill="url(#b)"/>
    <path d="M650 250 L760 330 L760 760 L650 700 Z" fill="${p.dark}" opacity=".7"/>
    <path d="M400 480 Q400 580 475 580 Q550 580 550 480 Z" fill="#fff"/><path d="M550 500 Q600 500 590 540 Q580 565 545 560" fill="none" stroke="#fff" stroke-width="12"/>
    <path d="M440 440 Q460 410 440 380 M490 440 Q510 410 490 380" stroke="#fff" stroke-width="8" fill="none" opacity=".7"/>`,
  puzzle: (p) => [[330, 330, p.main], [560, 330, "#f2c230"], [330, 560, p.accent], [560, 560, "#2f9e6b"]].map(([x, y, c2]) => `
    <g transform="translate(${x} ${y})"><rect width="210" height="210" rx="26" fill="${c2}"/><circle cx="210" cy="105" r="36" fill="${c2}"/><circle cx="105" cy="210" r="36" fill="${c2}"/>
    <rect x="0" y="0" width="210" height="60" rx="26" fill="#fff" opacity=".18"/></g>`).join("") + `<text x="440" y="480" font-family="Arial" font-size="120" font-weight="900" fill="#fff" text-anchor="middle">A</text><text x="670" y="480" font-family="Arial" font-size="120" font-weight="900" fill="#fff" text-anchor="middle">B</text><text x="440" y="710" font-family="Arial" font-size="120" font-weight="900" fill="#fff" text-anchor="middle">C</text>`,
  teddy: (p) => {
    const f = "#c8905a", d = "#9e6a3c";
    return `<circle cx="350" cy="230" r="80" fill="${f}"/><circle cx="650" cy="230" r="80" fill="${f}"/><circle cx="350" cy="230" r="42" fill="#f1c9a0"/><circle cx="650" cy="230" r="42" fill="#f1c9a0"/>
    <ellipse cx="500" cy="630" rx="230" ry="220" fill="${f}"/><ellipse cx="500" cy="660" rx="130" ry="130" fill="#f1c9a0"/>
    <circle cx="500" cy="340" r="190" fill="${f}"/><ellipse cx="500" cy="400" rx="90" ry="70" fill="#f1c9a0"/>
    <circle cx="430" cy="320" r="18" fill="#2b2d38"/><circle cx="570" cy="320" r="18" fill="#2b2d38"/><ellipse cx="500" cy="385" rx="30" ry="22" fill="#2b2d38"/>
    <path d="M470 430 Q500 455 530 430" stroke="${d}" stroke-width="8" fill="none"/>
    <path d="M400 480 L500 520 L600 480 L600 530 L500 560 L400 530 Z" fill="${p.main}"/>
    <ellipse cx="330" cy="780" rx="80" ry="60" fill="${f}"/><ellipse cx="670" cy="780" rx="80" ry="60" fill="${f}"/>`;
  },
  scooter: (p) => `${defs(G("b", p.light, p.main, 1, 1))}
    <path d="M340 260 L300 700" stroke="#9ea3b2" stroke-width="30" stroke-linecap="round"/><path d="M260 250 H420" stroke="#2b2d38" stroke-width="34" stroke-linecap="round"/>
    <path d="M300 690 H720 Q760 690 760 720 H300 Z" fill="url(#b)"/>
    ${[[300, 760], [720, 760]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="70" fill="#2b2d38"/><circle cx="${x}" cy="${y}" r="38" fill="${p.accent}"/><circle cx="${x}" cy="${y}" r="14" fill="#fff"/>`).join("")}`,
  serum: (p) => `${defs(G("g", "#fff2d9", "#f3b86a", 1, 0))}
    <rect x="390" y="360" width="220" height="440" rx="44" fill="url(#g)" opacity=".92"/>
    <rect x="430" y="230" width="140" height="140" rx="20" fill="#2b2d38"/><ellipse cx="500" cy="180" rx="60" ry="70" fill="#3a3d4c"/>
    <rect x="420" y="480" width="160" height="200" rx="18" fill="#fff" opacity=".9"/>
    <text x="500" y="570" font-family="Arial" font-size="56" font-weight="800" fill="${p.dark}" text-anchor="middle">C</text>
    <text x="500" y="630" font-family="Arial" font-size="30" font-weight="700" fill="${p.main}" text-anchor="middle">10%</text>
    <rect x="405" y="380" width="26" height="380" rx="13" fill="#fff" opacity=".45"/>`,
  tube: (p) => `${defs(G("b", "#ffffff", p.light, 1, 0))}
    <path d="M360 170 H640 L600 700 H400 Z" fill="url(#b)" stroke="#d9dce5" stroke-width="4"/>
    <path d="M360 170 H640" stroke="${p.main}" stroke-width="30"/>
    <rect x="430" y="700" width="140" height="120" rx="20" fill="${p.main}"/>
    <path d="M430 330 Q500 260 570 330 Q500 420 430 330 Z" fill="${p.accent}" opacity=".8"/>
    <rect x="420" y="450" width="160" height="22" rx="10" fill="${p.dark}" opacity=".4"/><rect x="440" y="490" width="120" height="16" rx="8" fill="${p.dark}" opacity=".25"/>`,
  lipstick: (p) => `${defs(G("c", "#f6d57a", "#b8862a", 1, 0), G("l", p.light, p.dark, 1, 0))}
    <rect x="400" y="480" width="200" height="340" rx="20" fill="#2b2d38"/><rect x="415" y="420" width="170" height="80" rx="10" fill="url(#c)"/>
    <path d="M430 420 V250 L570 170 V420 Z" fill="url(#l)"/><path d="M440 410 V260 L470 243 V410 Z" fill="#fff" opacity=".25"/>
    <rect x="620" y="560" width="160" height="260" rx="18" fill="#2b2d38" opacity=".9"/>`,
  bottle: (p) => `${defs(G("b", "#b8452a", "#6a1f10", 1, 0))}
    <path d="M410 300 Q410 250 450 240 V180 H550 V240 Q590 250 590 300 V800 Q590 830 560 830 H440 Q410 830 410 800 Z" fill="url(#b)"/>
    <rect x="440" y="120" width="120" height="70" rx="16" fill="#2b2d38"/>
    <rect x="425" y="430" width="150" height="220" rx="20" fill="#fff" opacity=".92"/>
    <circle cx="500" cy="510" r="40" fill="#7a2cb8"/><path d="M500 480 L520 520 L480 520 Z" fill="#fff"/>
    <rect x="430" y="320" width="26" height="440" rx="13" fill="#fff" opacity=".25"/>`,
  perfume: (p) => `${defs(G("b", "#fff7ea", p.light, 1, 1))}
    <rect x="330" y="360" width="340" height="440" rx="60" fill="url(#b)" stroke="#e0d2b8" stroke-width="6" opacity=".95"/>
    <rect x="430" y="270" width="140" height="100" rx="16" fill="#c9a14a"/><rect x="410" y="180" width="180" height="110" rx="30" fill="#2b2d38"/>
    <rect x="380" y="520" width="240" height="140" rx="16" fill="#fff" opacity=".85"/>
    <text x="500" y="605" font-family="Georgia" font-size="46" font-style="italic" fill="#8a6436" text-anchor="middle">Santal</text>
    <rect x="350" y="390" width="40" height="380" rx="20" fill="#fff" opacity=".5"/>`,
  vase: (p) => `${defs(G("b", p.light, p.main, 1, 1))}
    <path d="M430 160 H570 Q560 260 640 360 Q720 470 680 640 Q640 820 500 820 Q360 820 320 640 Q280 470 360 360 Q440 260 430 160 Z" fill="url(#b)"/>
    <path d="M360 480 Q500 420 640 480" stroke="#fff" stroke-width="14" fill="none" opacity=".7"/><path d="M340 580 Q500 520 660 580" stroke="${p.dark}" stroke-width="10" fill="none" opacity=".4"/>
    <path d="M380 400 Q360 520 390 660" stroke="#fff" stroke-width="18" opacity=".25" fill="none"/>`,
  box: (p) => `${defs()}
    <path d="M300 360 L500 260 L700 360 L700 700 L500 800 L300 700 Z" fill="${p.main}"/>
    <path d="M300 360 L500 460 L700 360 L500 260 Z" fill="${p.light}"/><path d="M500 460 V800 L700 700 V360 Z" fill="${p.dark}"/>
    <path d="M400 310 L600 410 V480 L550 455 V385 L350 285 Z" fill="#fff" opacity=".6"/>`
};
function shoe(p, sporty) {
  return `${defs(G("b", p.light, p.main, 1, 1))}
    <path d="M170 650 Q170 560 260 520 L420 440 Q470 420 500 460 L560 520 Q650 560 760 560 Q840 570 840 650 L840 690 H170 Z" fill="url(#b)"/>
    <path d="M160 690 H850 Q860 740 800 745 H210 Q150 740 160 690 Z" fill="${sporty ? p.accent : "#f0f1f5"}"/>
    <path d="M165 700 H850" stroke="${p.dark}" stroke-width="6" opacity=".4"/>
    ${[0, 1, 2, 3].map((i) => `<line x1="${430 + i * 34}" y1="${470 + i * 12}" x2="${470 + i * 34}" y2="${520 + i * 10}" stroke="${sporty ? "#fff" : p.dark}" stroke-width="10" stroke-linecap="round"/>`).join("")}
    <path d="M${sporty ? "280 610 Q480 520 700 620" : "300 600 Q500 580 740 610"}" stroke="${sporty ? "#fff" : p.dark}" stroke-width="${sporty ? 22 : 10}" fill="none" opacity=".8" stroke-linecap="round"/>`;
}
function defs(...g) {
  return g.length ? `<defs>${g.join("")}</defs>` : "";
}
function productSvg(title, opts = {}) {
  const kind = artKindFor(title);
  const p = palette(title + (opts.colorHint ?? ""), opts.colorHint);
  const alt = (opts.angle ?? 0) % 2 === 1;
  const body = DRAW[kind](p);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">
  <defs>
    <radialGradient id="bgGrad" cx="0.5" cy="0.38" r="0.75"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${alt ? p.bg2 : p.bg1}"/></radialGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="22"/></filter>
    <filter id="lift" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#1f2330" flood-opacity=".18"/></filter>
  </defs>
  <rect width="1000" height="1000" fill="url(#bgGrad)"/>
  ${alt ? `<circle cx="820" cy="170" r="140" fill="${p.light}" opacity=".35"/><circle cx="150" cy="820" r="90" fill="${p.accent}" opacity=".12"/>` : `<circle cx="160" cy="180" r="120" fill="${p.light}" opacity=".25"/>`}
  <ellipse cx="500" cy="860" rx="330" ry="46" fill="#1f2330" opacity=".14" filter="url(#soft)"/>
  <g filter="url(#lift)" transform="${alt ? "rotate(-6 500 500) translate(10 -10)" : ""}">${body}</g>
</svg>`;
}

// prisma/demo-content.ts
async function renderProductImages(c2, title, colorHint) {
  const out = [];
  for (const angle of [0, 1]) {
    const png = await sharp2(Buffer.from(productSvg(title, { angle, colorHint }))).png().toBuffer();
    out.push(await storeOptimizedImage(c2.storage, "products", png, "image/png"));
  }
  return out;
}
var REVIEWERS = [
  "Aarav",
  "Diya",
  "Kabir",
  "Ananya",
  "Vihaan",
  "Isha",
  "Arjun",
  "Meera",
  "Rohan",
  "Sara",
  "Aditya",
  "Nisha",
  "Karthik",
  "Pooja",
  "Farhan",
  "Lakshmi",
  "Siddharth",
  "Tanvi",
  "Rahul",
  "Zoya",
  "Harsh",
  "Divya",
  "Manav",
  "Riya"
];
var TEXT = {
  electronics: [
    ["Value for money", "Battery backup is excellent and the build feels premium for the price."],
    ["Works as described", "Setup took two minutes. Sound and display quality are better than expected."],
    ["Good, minor gripes", "Performance is smooth. Charger could have been faster, otherwise happy."],
    ["Loving it", "Using it daily for two weeks \u2014 no issues at all. Delivery was quick too."]
  ],
  fashion: [
    ["Perfect fit", "Fabric is soft and breathable. True to size, colour exactly as shown."],
    ["Nice quality", "Stitching is neat and it survived three washes without fading."],
    ["Good buy", "Looks great, slightly long for me but still very comfortable."],
    ["Super comfortable", "Wore it all day at a wedding, got many compliments!"]
  ],
  home: [
    ["Sturdy and useful", "Good build quality and easy to clean. Looks lovely in my kitchen."],
    ["Great value", "Exactly what I needed. Packaging was careful and nothing was damaged."],
    ["Pretty and practical", "Adds a warm touch to the living room. Would buy again."]
  ],
  grocery: [
    ["Fresh and tasty", "Aroma and quality are top notch. Will reorder every month."],
    ["Good quality", "Well packed, good expiry date, tastes authentic."]
  ],
  beauty: [
    ["Visible results", "Skin feels hydrated and brighter after a week of use."],
    ["Gentle and effective", "No irritation on my sensitive skin. Lovely fragrance."],
    ["Nice product", "Texture is light and non-sticky. A little goes a long way."]
  ],
  toys: [
    ["Kids love it", "Bright colours, safe edges and keeps my daughter busy for hours."],
    ["Well made", "Sturdy and great for learning. Perfect gift."]
  ]
};
var groupOf = (category) => /electronic|mobile|laptop|audio|wearable|accessor/i.test(category) ? "electronics" : /fashion|cloth|wear|footwear|shoe|bag|watch|jewel|sunglass/i.test(category) ? "fashion" : /home|kitchen|cook|decor|furnish|storage/i.test(category) ? "home" : /grocery|staple|snack|beverage/i.test(category) ? "grocery" : /beauty|skin|makeup|hair|fragrance/i.test(category) ? "beauty" : "toys";
async function seedDemoReviews(c2, log = console.log) {
  const db2 = c2.db;
  const role = await db2.role.findUniqueOrThrow({ where: { code: "CUSTOMER" } });
  const hash2 = await c2.services.auth.hashPassword(`Demo-${Date.now()}-reviewer!`);
  const reviewers = [];
  for (const [i, name] of REVIEWERS.entries()) {
    const email = `reviewer${i + 1}@demo.vyora.local`;
    const u = await db2.user.findUnique({ where: { email } }) ?? await db2.user.create({
      data: { email, name: `${name} (demo)`, passwordHash: hash2, emailVerifiedAt: /* @__PURE__ */ new Date(), roles: { create: [{ roleId: role.id }] } }
    });
    reviewers.push(u);
  }
  const products = await db2.product.findMany({
    where: { deletedAt: null, status: "APPROVED" },
    select: { id: true, title: true, ownerSellerId: true, category: { select: { name: true, parent: { select: { name: true } } } } }
  });
  let created = 0;
  for (const [pi, p] of products.entries()) {
    const existing = await db2.review.count({ where: { productId: p.id, user: { email: { endsWith: "@demo.vyora.local" } } } });
    if (existing >= 3) continue;
    const texts = TEXT[groupOf(`${p.category.parent?.name ?? ""} ${p.category.name}`)];
    const n2 = 3 + pi * 7 % 7;
    const rows = [];
    for (let k = 0; k < n2; k++) {
      const u = reviewers[(pi * 5 + k) % reviewers.length];
      const r = [5, 4, 5, 4, 3, 5, 4, 5, 2, 4][(pi + k * 3) % 10];
      const [title, body] = texts[(pi + k) % texts.length];
      rows.push({
        productId: p.id,
        userId: u.id,
        rating: r,
        title,
        body,
        status: "APPROVED",
        isVerifiedPurchase: false,
        helpfulCount: (pi * 3 + k * 7) % 40,
        createdAt: new Date(Date.now() - (pi * 13 + k * 29) % 120 * 864e5)
      });
    }
    const res = await db2.review.createMany({ data: rows, skipDuplicates: true });
    created += res.count;
  }
  for (const p of products) {
    const agg = await db2.review.aggregate({ where: { productId: p.id, status: "APPROVED", deletedAt: null }, _avg: { rating: true }, _count: { _all: true } });
    await db2.product.update({ where: { id: p.id }, data: { ratingAvg: Number((agg._avg.rating ?? 0).toFixed(2)), ratingCount: agg._count._all } });
  }
  const sellers = [...new Set(products.map((p) => p.ownerSellerId).filter(Boolean))];
  for (const sid of sellers) {
    const s2 = await db2.review.aggregate({ where: { status: "APPROVED", deletedAt: null, product: { ownerSellerId: sid } }, _avg: { rating: true }, _count: { _all: true } });
    await db2.seller.update({ where: { id: sid }, data: { ratingAvg: Number((s2._avg.rating ?? 0).toFixed(2)), ratingCount: s2._count._all } });
  }
  await c2.cache.delPrefix("");
  log(`  \u2714 ${created} demo reviews added across ${products.length} products`);
  return created;
}

// prisma/seed.ts
var env = loadEnv();
var c = createContainer(env);
var db = c.db;
var s = c.services;
var system = { auth: null, ip: "127.0.0.1", userAgent: "seed" };
function hash(str) {
  let h = 0;
  for (const ch of str) h = h * 31 + ch.charCodeAt(0) >>> 0;
  return h;
}
async function upsertRolesAndAdmin() {
  for (const code of ALL_PERMISSIONS) {
    await db.permission.upsert({ where: { code }, create: { code }, update: {} });
  }
  const perms = await db.permission.findMany();
  const roleDefs = [
    { code: "ADMIN", name: "Administrator", description: "Full marketplace control" },
    { code: "SELLER", name: "Seller", description: "Manages own store, products and orders" },
    { code: "CUSTOMER", name: "Customer", description: "Shops on the marketplace" }
  ];
  for (const r of roleDefs) {
    const role = await db.role.upsert({ where: { code: r.code }, create: { ...r, isSystem: true }, update: { name: r.name, description: r.description } });
    const existing = await db.rolePermission.count({ where: { roleId: role.id } });
    if (existing === 0) {
      const wanted = DEFAULT_ROLE_PERMISSIONS[r.code];
      await db.rolePermission.createMany({
        data: perms.filter((p) => wanted.includes(p.code)).map((p) => ({ roleId: role.id, permissionId: p.id })),
        skipDuplicates: true
      });
    }
  }
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@vyora.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
  const adminRole = await db.role.findUniqueOrThrow({ where: { code: "ADMIN" } });
  const customerRole = await db.role.findUniqueOrThrow({ where: { code: "CUSTOMER" } });
  const admin = await db.user.upsert({
    where: { email },
    create: {
      email,
      name: "Marketplace Admin",
      passwordHash: await s.auth.hashPassword(password),
      emailVerifiedAt: /* @__PURE__ */ new Date(),
      roles: { create: [{ roleId: adminRole.id }, { roleId: customerRole.id }] },
      customerProfile: { create: {} }
    },
    update: {}
  });
  console.log(`\u2714 admin: ${email} / ${password}`);
  return admin;
}
var CATEGORIES = [
  { name: "Electronics", icon: "laptop", tax: 18, commission: 7, children: ["Mobiles", "Laptops", "Audio", "Wearables", "Accessories"] },
  { name: "Fashion", icon: "shirt", tax: 12, commission: 15, children: ["Men's Clothing", "Women's Clothing", "Kids Wear", "Ethnic Wear"] },
  { name: "Home & Kitchen", icon: "home", tax: 18, commission: 12, children: ["Cookware", "Home Decor", "Furnishing", "Storage"] },
  { name: "Beauty", icon: "sparkles", tax: 18, commission: 14, children: ["Skincare", "Makeup", "Haircare", "Fragrances"] },
  { name: "Grocery", icon: "basket", tax: 5, commission: 6, children: ["Staples", "Snacks", "Beverages"] },
  { name: "Footwear", icon: "footprints", tax: 12, commission: 14, children: ["Men's Shoes", "Women's Footwear", "Sports Shoes"] },
  { name: "Accessories", icon: "watch", tax: 18, commission: 16, children: ["Bags", "Watches", "Jewellery", "Sunglasses"] },
  { name: "Toys", icon: "puzzle", tax: 12, commission: 12, children: ["Learning Toys", "Soft Toys", "Outdoor Play"] }
];
async function seedCatalogReference() {
  const map = /* @__PURE__ */ new Map();
  for (const [i, def] of CATEGORIES.entries()) {
    const slug = slugify(def.name);
    let root = await db.category.findUnique({ where: { slug } });
    if (!root) root = await s.catalog.createCategory({ name: def.name, slug, icon: def.icon, sortOrder: i, isActive: true, taxRate: def.tax, commissionPercent: def.commission }, system);
    map.set(def.name, root.id);
    for (const [j, child] of def.children.entries()) {
      const cslug = slugify(child);
      let cat = await db.category.findUnique({ where: { slug: cslug } });
      if (!cat) cat = await s.catalog.createCategory({ name: child, slug: cslug, parentId: root.id, sortOrder: j, isActive: true }, system);
      map.set(child, cat.id);
    }
  }
  const attrs = [
    { code: "color", name: "Colour", type: "SELECT", options: ["Black", "White", "Blue", "Red", "Green", "Pink", "Grey", "Beige", "Yellow"], axis: true },
    { code: "size", name: "Size", type: "SELECT", options: ["XS", "S", "M", "L", "XL", "XXL", "6", "7", "8", "9", "10"], axis: true },
    { code: "storage", name: "Storage", type: "SELECT", options: ["64 GB", "128 GB", "256 GB", "512 GB"], axis: true },
    { code: "material", name: "Material", type: "SELECT", options: ["Cotton", "Polyester", "Silk", "Linen", "Denim", "Leather", "Stainless Steel", "Wood", "Plastic"] },
    { code: "ram", name: "RAM", type: "SELECT", options: ["4 GB", "6 GB", "8 GB", "12 GB", "16 GB"], category: "Electronics" },
    { code: "connectivity", name: "Connectivity", type: "SELECT", options: ["Bluetooth", "Wired", "Wi-Fi", "5G"], category: "Electronics" },
    { code: "skin_type", name: "Skin type", type: "SELECT", options: ["All", "Oily", "Dry", "Sensitive", "Combination"], category: "Beauty" },
    { code: "age_group", name: "Age group", type: "SELECT", options: ["0-2 years", "3-5 years", "6-8 years", "9+ years"], category: "Toys" }
  ];
  for (const a of attrs) {
    const categoryId = a.category ? map.get(a.category) : null;
    const existing = await db.productAttribute.findFirst({ where: { code: a.code, categoryId } });
    if (!existing) {
      await s.catalog.createAttribute({ code: a.code, name: a.name, type: a.type, options: a.options, categoryId, isFilterable: true, isVariantAxis: Boolean(a.axis), isRequired: false }, system);
    }
  }
  const brandNames = ["Nimbus", "Aurora Audio", "Kavya", "UrbanThread", "Ethnica", "Casa Loom", "ChefCraft", "Glowveda", "PureLeaf", "Stride", "TimeWise", "Playnest", "Voltix", "Monsoon Home", "Terra Bags"];
  const brands = /* @__PURE__ */ new Map();
  for (const name of brandNames) {
    const slug = slugify(name);
    const b = await db.brand.findUnique({ where: { slug } }) ?? await s.catalog.createBrand({ name, slug, isActive: true }, system);
    brands.set(name, b.id);
  }
  await s.shipping.upsertMethod({ method: "STANDARD", label: "Standard delivery", baseFee: 40, freeAbove: 499, minDays: 3, maxDays: 7, isActive: true }, system);
  await s.shipping.upsertMethod({ method: "EXPRESS", label: "Express delivery", baseFee: 99, freeAbove: 1999, minDays: 1, maxDays: 3, isActive: true }, system);
  if (!await db.taxConfiguration.findFirst({ where: { categoryId: null } })) {
    await s.tax.create({ name: "Default GST 18%", rate: 18, isInclusive: true, isActive: true, categoryId: null }, system);
  }
  if (!await db.commissionRule.findFirst({ where: { scope: "GLOBAL" } })) {
    await s.finance.createRule({ scope: "GLOBAL", percentage: env.COMMISSION_DEFAULT_PERCENTAGE, fixedAmount: 0, isActive: true }, system);
  }
  return { categories: map, brands };
}
var SELLERS = [
  { name: "Ananya Rao", email: "seller.nimbus@vyora.local", phone: "9876500001", business: "Nimbus Electronics Hub", city: "Bengaluru", state: "Karnataka", pincode: "560001", pan: "ABCPR1234K", gstin: "29ABCPR1234K1Z5", featured: true },
  { name: "Rohit Mehra", email: "seller.threads@vyora.local", phone: "9876500002", business: "UrbanThread Fashions", city: "Jaipur", state: "Rajasthan", pincode: "302001", pan: "BCDPM2345L", gstin: "08BCDPM2345L1Z2", featured: true },
  { name: "Fatima Khan", email: "seller.casa@vyora.local", phone: "9876500003", business: "Casa Loom Living", city: "Pune", state: "Maharashtra", pincode: "411001", pan: "CDEPK3456M", gstin: "27CDEPK3456M1Z9", featured: true },
  { name: "Suresh Iyer", email: "seller.glow@vyora.local", phone: "9876500004", business: "Glowveda Naturals", city: "Chennai", state: "Tamil Nadu", pincode: "600001", pan: "DEFPI4567N", gstin: "33DEFPI4567N1Z3", featured: false }
];
var PRODUCTS = {
  "seller.nimbus@vyora.local": [
    { title: "Nimbus X5 5G Smartphone", cat: "Mobiles", brand: "Nimbus", price: 18999, mrp: 22999, stock: 40, desc: "A fast 5G smartphone with a 120Hz AMOLED display, 50MP camera and a 5000mAh battery that lasts all day.", hl: ['6.6" 120Hz AMOLED', "50MP dual camera", "5000mAh, 33W fast charging"], specs: [["Display", "6.6 inch AMOLED"], ["Battery", "5000 mAh"], ["Processor", "Octa-core 2.4GHz"]], variants: [{ storage: "128 GB", color: "Black" }, { storage: "256 GB", color: "Black" }, { storage: "128 GB", color: "Blue" }], tags: ["phone", "5g", "android"] },
    { title: "Nimbus Lite 4G Phone", cat: "Mobiles", brand: "Nimbus", price: 8499, mrp: 10999, stock: 60, desc: "Affordable everyday smartphone with a large display and dependable battery life.", hl: ['6.5" HD+ display', "13MP camera", "5000mAh"], specs: [["Display", "6.5 inch LCD"], ["RAM", "4 GB"]], tags: ["phone", "budget"] },
    { title: "Voltix Pro 14 Laptop", cat: "Laptops", brand: "Voltix", price: 54990, mrp: 69990, stock: 12, desc: "Thin and light 14-inch laptop with 16GB RAM, 512GB SSD and a full-HD IPS display for work and play.", hl: ["16GB RAM, 512GB SSD", '14" FHD IPS', "1.3 kg"], specs: [["Processor", "8-core"], ["Weight", "1.3 kg"], ["OS", "Windows 11"]], tags: ["laptop", "notebook"] },
    { title: "Voltix Chromebook 11", cat: "Laptops", brand: "Voltix", price: 19990, mrp: 24990, stock: 18, desc: "Lightweight Chromebook ideal for students, with all-day battery and instant boot.", hl: ['11.6" display', "10-hour battery"], specs: [["Storage", "64 GB eMMC"]], tags: ["laptop", "student"] },
    { title: "Aurora Audio Wireless Earbuds", cat: "Audio", brand: "Aurora Audio", price: 1799, mrp: 3999, stock: 150, desc: "True wireless earbuds with active noise cancellation, 30 hour playback and low-latency gaming mode.", hl: ["Active noise cancellation", "30h total playback", "IPX5 water resistant"], specs: [["Connectivity", "Bluetooth 5.3"], ["Playback", "30 hours"]], variants: [{ color: "Black" }, { color: "White" }], tags: ["earbuds", "tws", "headphones"] },
    { title: "Aurora Audio Over-Ear Headphones", cat: "Audio", brand: "Aurora Audio", price: 3499, mrp: 5999, stock: 45, desc: "Comfortable over-ear headphones with deep bass, 40mm drivers and foldable design.", hl: ["40mm drivers", "50h battery"], specs: [["Connectivity", "Bluetooth + AUX"]], tags: ["headphones"] },
    { title: "Aurora Audio Portable Speaker", cat: "Audio", brand: "Aurora Audio", price: 2299, mrp: 3499, stock: 3, desc: "Rugged portable Bluetooth speaker with 360\xB0 sound and 12 hours of playtime.", hl: ["360\xB0 sound", "IPX7 waterproof"], specs: [["Output", "20W"]], tags: ["speaker", "bluetooth"] },
    { title: "Nimbus Fit Smartwatch", cat: "Wearables", brand: "Nimbus", price: 2999, mrp: 5999, stock: 70, desc: "Fitness smartwatch with heart-rate, SpO2, sleep tracking and 100+ sports modes.", hl: ['1.8" AMOLED', "SpO2 & heart rate", "10-day battery"], specs: [["Water resistance", "5 ATM"]], variants: [{ color: "Black" }, { color: "Pink" }], tags: ["smartwatch", "fitness"] },
    { title: "Voltix 20000mAh Power Bank", cat: "Accessories", brand: "Voltix", price: 1499, mrp: 2499, stock: 90, desc: "High-capacity power bank with 22.5W fast charging and dual USB outputs.", hl: ["20000 mAh", "22.5W fast charge"], specs: [["Ports", "USB-C + 2\xD7 USB-A"]], tags: ["power bank", "charger"] },
    { title: "Voltix Braided USB-C Cable (1.5m)", cat: "Accessories", brand: "Voltix", price: 299, mrp: 699, stock: 300, desc: "Durable braided USB-C cable supporting 60W fast charging and data transfer.", hl: ["60W charging", "Nylon braided"], specs: [["Length", "1.5 m"]], tags: ["cable", "usb-c"] }
  ],
  "seller.threads@vyora.local": [
    { title: "UrbanThread Men Slim Fit Cotton Shirt", cat: "Men's Clothing", brand: "UrbanThread", price: 699, mrp: 1499, stock: 120, desc: "Breathable pure cotton slim fit shirt, perfect for office and casual outings.", hl: ["100% cotton", "Slim fit", "Machine wash"], specs: [["Fabric", "Cotton"], ["Fit", "Slim"]], variants: [{ size: "M", color: "Blue" }, { size: "L", color: "Blue" }, { size: "XL", color: "Blue" }, { size: "M", color: "White" }, { size: "L", color: "White" }], tags: ["shirt", "formal"] },
    { title: "UrbanThread Men Denim Jeans", cat: "Men's Clothing", brand: "UrbanThread", price: 999, mrp: 2199, stock: 80, desc: "Stretchable mid-rise denim jeans with a comfortable tapered fit.", hl: ["Stretch denim", "Tapered fit"], specs: [["Fabric", "Denim"]], variants: [{ size: "M" }, { size: "L" }, { size: "XL" }], tags: ["jeans", "denim"] },
    { title: "UrbanThread Women Floral Maxi Dress", cat: "Women's Clothing", brand: "UrbanThread", price: 899, mrp: 1999, stock: 65, desc: "Flowy floral maxi dress in soft rayon with a flattering waist tie.", hl: ["Soft rayon", "Waist tie", "Ankle length"], specs: [["Fabric", "Rayon"]], variants: [{ size: "S" }, { size: "M" }, { size: "L" }], tags: ["dress", "summer"] },
    { title: "UrbanThread Women Oversized Hoodie", cat: "Women's Clothing", brand: "UrbanThread", price: 799, mrp: 1599, stock: 50, desc: "Cosy fleece-lined oversized hoodie for chilly evenings.", hl: ["Fleece lined", "Kangaroo pocket"], specs: [["Fabric", "Cotton blend"]], variants: [{ size: "S", color: "Grey" }, { size: "M", color: "Grey" }, { size: "M", color: "Pink" }], tags: ["hoodie", "winter"] },
    { title: "Kavya Women Cotton Kurta Set", cat: "Ethnic Wear", brand: "Kavya", price: 1199, mrp: 2799, stock: 70, desc: "Hand block printed cotton kurta with palazzo and dupatta.", hl: ["Hand block print", "3-piece set"], specs: [["Fabric", "Cotton"]], variants: [{ size: "S" }, { size: "M" }, { size: "L" }, { size: "XL" }], tags: ["kurta", "ethnic"] },
    { title: "Ethnica Men Silk Blend Kurta", cat: "Ethnic Wear", brand: "Ethnica", price: 1299, mrp: 2499, stock: 40, desc: "Festive silk blend kurta with mandarin collar \u2014 perfect for weddings and festivals.", hl: ["Silk blend", "Mandarin collar"], specs: [["Fabric", "Silk blend"]], variants: [{ size: "M" }, { size: "L" }, { size: "XL" }], tags: ["kurta", "festive"] },
    { title: "UrbanThread Kids Printed T-Shirt Pack of 3", cat: "Kids Wear", brand: "UrbanThread", price: 549, mrp: 999, stock: 90, desc: "Soft cotton printed t-shirts for kids, pack of three fun designs.", hl: ["Pack of 3", "Soft cotton"], specs: [["Fabric", "Cotton"]], tags: ["kids", "t-shirt"] },
    { title: "Stride Men Running Shoes", cat: "Sports Shoes", brand: "Stride", price: 1799, mrp: 3499, stock: 55, desc: "Lightweight running shoes with breathable mesh upper and cushioned sole.", hl: ["Breathable mesh", "Cushioned sole"], specs: [["Sole", "EVA"]], variants: [{ size: "7" }, { size: "8" }, { size: "9" }, { size: "10" }], tags: ["shoes", "running"] },
    { title: "Stride Women Casual Sneakers", cat: "Women's Footwear", brand: "Stride", price: 1299, mrp: 2499, stock: 45, desc: "Everyday white sneakers with memory foam insole.", hl: ["Memory foam", "Vegan leather"], specs: [["Upper", "PU"]], variants: [{ size: "6" }, { size: "7" }, { size: "8" }], tags: ["sneakers"] },
    { title: "Stride Men Leather Formal Shoes", cat: "Men's Shoes", brand: "Stride", price: 1999, mrp: 3999, stock: 0, desc: "Genuine leather oxford shoes with a classic polished finish.", hl: ["Genuine leather", "Cushioned insole"], specs: [["Material", "Leather"]], variants: [{ size: "8" }, { size: "9" }], tags: ["formal shoes"] },
    { title: "Terra Bags Everyday Laptop Backpack", cat: "Bags", brand: "Terra Bags", price: 1099, mrp: 2299, stock: 75, desc: 'Water-resistant backpack with padded 15.6" laptop compartment and USB charging port.', hl: ['Fits 15.6" laptop', "Water resistant", "USB port"], specs: [["Capacity", "30 L"]], variants: [{ color: "Black" }, { color: "Grey" }], tags: ["backpack", "bag"] },
    { title: "TimeWise Classic Analog Watch", cat: "Watches", brand: "TimeWise", price: 1499, mrp: 3299, stock: 35, desc: "Minimal analog watch with stainless steel case and genuine leather strap.", hl: ["Stainless steel", "Leather strap", "3 ATM"], specs: [["Case", "40 mm"]], tags: ["watch"] },
    { title: "Kavya Oxidised Silver Jhumka Earrings", cat: "Jewellery", brand: "Kavya", price: 349, mrp: 899, stock: 120, desc: "Handcrafted oxidised silver-tone jhumkas with intricate detailing.", hl: ["Handcrafted", "Lightweight"], specs: [["Material", "Alloy"]], tags: ["earrings", "jewellery"] },
    { title: "UrbanThread Polarised Aviator Sunglasses", cat: "Sunglasses", brand: "UrbanThread", price: 599, mrp: 1499, stock: 60, desc: "UV400 polarised aviator sunglasses with metal frame.", hl: ["UV400", "Polarised"], specs: [["Frame", "Metal"]], tags: ["sunglasses"] }
  ],
  "seller.casa@vyora.local": [
    { title: "ChefCraft Non-Stick Cookware Set (3 pcs)", cat: "Cookware", brand: "ChefCraft", price: 1899, mrp: 3499, stock: 40, desc: "Induction-friendly non-stick cookware set: fry pan, kadai and tawa with toxin-free coating.", hl: ["Induction friendly", "PFOA free", "3-piece set"], specs: [["Material", "Aluminium"]], tags: ["cookware", "kitchen"] },
    { title: "ChefCraft Stainless Steel Pressure Cooker 5L", cat: "Cookware", brand: "ChefCraft", price: 2199, mrp: 3299, stock: 30, desc: "Tri-ply stainless steel pressure cooker with safety valve, suitable for all cooktops.", hl: ["Tri-ply base", "5 litre"], specs: [["Material", "Stainless Steel"]], tags: ["pressure cooker"] },
    { title: "ChefCraft Glass Storage Containers (Set of 6)", cat: "Storage", brand: "ChefCraft", price: 899, mrp: 1599, stock: 80, desc: "Borosilicate glass containers with airtight lids \u2014 microwave and oven safe.", hl: ["Borosilicate glass", "Airtight"], specs: [["Pieces", "6"]], tags: ["storage", "containers"] },
    { title: "Casa Loom Handwoven Cotton Bedsheet", cat: "Furnishing", brand: "Casa Loom", price: 1299, mrp: 2599, stock: 50, desc: "Handwoven 100% cotton double bedsheet with two pillow covers.", hl: ["Handwoven", "100% cotton", "Double size"], specs: [["Size", "90 x 100 in"]], variants: [{ color: "Beige" }, { color: "Blue" }], tags: ["bedsheet"] },
    { title: "Casa Loom Jute Area Rug", cat: "Home Decor", brand: "Casa Loom", price: 1599, mrp: 2999, stock: 25, desc: "Natural jute area rug, hand braided for a warm rustic look.", hl: ["Natural jute", "Hand braided"], specs: [["Size", "4 x 6 ft"]], tags: ["rug", "decor"] },
    { title: "Monsoon Home Ceramic Table Lamp", cat: "Home Decor", brand: "Monsoon Home", price: 1399, mrp: 2499, stock: 20, desc: "Glazed ceramic table lamp with linen shade, bulb included.", hl: ["Ceramic base", "Linen shade"], specs: [["Height", "45 cm"]], tags: ["lamp", "lighting"] },
    { title: "Monsoon Home Scented Candle Trio", cat: "Home Decor", brand: "Monsoon Home", price: 499, mrp: 999, stock: 100, desc: "Soy wax scented candles in jasmine, sandalwood and vanilla.", hl: ["Soy wax", "3 fragrances"], specs: [["Burn time", "25 hours each"]], tags: ["candles", "gift"] },
    { title: "PureLeaf Organic Basmati Rice 5kg", cat: "Staples", brand: "PureLeaf", price: 649, mrp: 799, stock: 200, desc: "Aged organic long-grain basmati rice with rich aroma.", hl: ["Certified organic", "Aged 12 months"], specs: [["Weight", "5 kg"]], tags: ["rice", "organic"] },
    { title: "PureLeaf Cold Pressed Groundnut Oil 1L", cat: "Staples", brand: "PureLeaf", price: 329, mrp: 399, stock: 150, desc: "Wood-pressed groundnut oil, unrefined and chemical free.", hl: ["Wood pressed", "Unrefined"], specs: [["Volume", "1 L"]], tags: ["oil"] },
    { title: "PureLeaf Roasted Makhana Snack Pack", cat: "Snacks", brand: "PureLeaf", price: 199, mrp: 299, stock: 180, desc: "Crunchy roasted fox nuts in peri-peri flavour \u2014 a healthy snack.", hl: ["Roasted, not fried", "High protein"], specs: [["Weight", "200 g"]], tags: ["snacks", "healthy"] },
    { title: "PureLeaf Assam Tea 500g", cat: "Beverages", brand: "PureLeaf", price: 279, mrp: 350, stock: 160, desc: "Strong and brisk CTC Assam tea, sourced directly from estates.", hl: ["Estate sourced"], specs: [["Weight", "500 g"]], tags: ["tea"] },
    { title: "Playnest Wooden Alphabet Puzzle", cat: "Learning Toys", brand: "Playnest", price: 399, mrp: 799, stock: 60, desc: "Colourful wooden alphabet puzzle that builds early literacy and motor skills.", hl: ["Non-toxic paint", "Ages 3+"], specs: [["Material", "Wood"]], tags: ["puzzle", "kids"] },
    { title: "Playnest Plush Teddy Bear 60cm", cat: "Soft Toys", brand: "Playnest", price: 699, mrp: 1299, stock: 40, desc: "Super soft, huggable teddy bear made with child-safe materials.", hl: ["Child safe", "60 cm"], specs: [["Material", "Polyester"]], variants: [{ color: "Beige" }, { color: "Pink" }], tags: ["teddy", "soft toy"] },
    { title: "Playnest Kids Scooter", cat: "Outdoor Play", brand: "Playnest", price: 1799, mrp: 2999, stock: 15, desc: "Three-wheel kick scooter with LED wheels and adjustable height.", hl: ["LED wheels", "Adjustable height"], specs: [["Age", "3-8 years"]], tags: ["scooter", "outdoor"] }
  ],
  "seller.glow@vyora.local": [
    { title: "Glowveda Vitamin C Face Serum", cat: "Skincare", brand: "Glowveda", price: 449, mrp: 799, stock: 120, desc: "10% vitamin C serum with hyaluronic acid for brighter, even-toned skin.", hl: ["10% Vitamin C", "Hyaluronic acid"], specs: [["Volume", "30 ml"]], tags: ["serum", "skincare"] },
    { title: "Glowveda Aloe Hydrating Face Wash", cat: "Skincare", brand: "Glowveda", price: 249, mrp: 399, stock: 150, desc: "Gentle sulphate-free face wash with aloe vera for daily cleansing.", hl: ["Sulphate free", "Aloe vera"], specs: [["Volume", "150 ml"]], tags: ["face wash"] },
    { title: "Glowveda SPF 50 Sunscreen Gel", cat: "Skincare", brand: "Glowveda", price: 399, mrp: 599, stock: 110, desc: "Lightweight, non-greasy SPF 50 PA+++ sunscreen gel.", hl: ["SPF 50 PA+++", "No white cast"], specs: [["Volume", "50 g"]], tags: ["sunscreen"] },
    { title: "Glowveda Matte Liquid Lipstick", cat: "Makeup", brand: "Glowveda", price: 299, mrp: 549, stock: 90, desc: "Long-lasting transfer-proof matte liquid lipstick.", hl: ["12h wear", "Transfer proof"], specs: [["Volume", "4 ml"]], variants: [{ color: "Red" }, { color: "Pink" }, { color: "Beige" }], tags: ["lipstick", "makeup"] },
    { title: "Glowveda Onion Hair Oil", cat: "Haircare", brand: "Glowveda", price: 349, mrp: 499, stock: 100, desc: "Red onion hair oil with 14 herbs to reduce hair fall.", hl: ["14 herbs", "Reduces hair fall"], specs: [["Volume", "200 ml"]], tags: ["hair oil"] },
    { title: "Glowveda Sandalwood Eau de Parfum", cat: "Fragrances", brand: "Glowveda", price: 799, mrp: 1499, stock: 45, desc: "Warm sandalwood and amber eau de parfum for long-lasting fragrance.", hl: ["Long lasting", "Unisex"], specs: [["Volume", "100 ml"]], tags: ["perfume"] }
  ]
};
async function seedSellersAndProducts(refs, adminActor) {
  const sellerIds = [];
  for (const def of SELLERS) {
    let user = await db.user.findUnique({ where: { email: def.email }, include: { seller: true } });
    if (!user?.seller) {
      await s.sellers.register(
        {
          name: def.name,
          email: def.email,
          phone: def.phone,
          password: "Seller@12345",
          businessName: def.business,
          businessType: "PROPRIETORSHIP",
          addressLine1: "12, Market Road",
          addressLine2: void 0,
          city: def.city,
          state: def.state,
          pincode: def.pincode,
          gstin: def.gstin,
          pan: def.pan,
          acceptTerms: true,
          acceptCommissionPolicy: true
        },
        { ip: "127.0.0.1", userAgent: "seed" }
      );
      user = await db.user.findUniqueOrThrow({ where: { email: def.email }, include: { seller: true } });
      await db.user.update({ where: { id: user.id }, data: { emailVerifiedAt: /* @__PURE__ */ new Date() } });
      await s.sellers.changeStatus(user.seller.id, "APPROVED", void 0, adminActor);
      await db.seller.update({ where: { id: user.seller.id }, data: { isFeatured: def.featured, description: `${def.business} \u2014 trusted seller from ${def.city}.` } });
    }
    sellerIds.push(user.seller.id);
    const sellerActor = { auth: null, ip: "127.0.0.1", userAgent: "seed" };
    const existingCount = await db.product.count({ where: { ownerSellerId: user.seller.id } });
    if (existingCount > 0) continue;
    for (const p of PRODUCTS[def.email]) {
      const variants = (p.variants ?? [{}]).map((opts, i) => ({
        options: opts,
        sku: `${slugify(p.brand).slice(0, 5).toUpperCase()}-${hash(p.title).toString(36).slice(0, 5).toUpperCase()}-${i + 1}`,
        price: p.price + (opts.storage === "256 GB" ? 3e3 : 0),
        mrp: p.mrp + (opts.storage === "256 GB" ? 3e3 : 0),
        stock: p.stock === 0 ? 0 : Math.max(2, Math.round(p.stock / (p.variants?.length ?? 1))),
        lowStockThreshold: 5,
        isActive: true
      }));
      const input = {
        title: p.title,
        description: `${p.desc}

Sold and shipped by ${def.business}. Every order is packed with care and dispatched within 48 hours.`,
        highlights: p.hl,
        categoryId: refs.categories.get(p.cat),
        brandId: refs.brands.get(p.brand) ?? null,
        specifications: p.specs.map(([key, value]) => ({ key, value })),
        attributes: [],
        tags: p.tags ?? [],
        isReturnable: !["Staples", "Snacks", "Beverages"].includes(p.cat),
        returnWindowDays: ["Staples", "Snacks", "Beverages"].includes(p.cat) ? 0 : 7,
        codAvailable: true,
        variants,
        submit: false
      };
      const created = await s.products.create(user.seller.id, input, sellerActor);
      const imgs = await renderProductImages(c, p.title, (p.variants?.[0] ?? {}).color);
      await db.productImage.createMany({ data: imgs.map((im, i) => ({ productId: created.id, url: im.url, storageKey: im.key, alt: p.title, sortOrder: i })) });
      await s.products.submit(created.id, { kind: "seller", sellerId: user.seller.id }, sellerActor);
      await s.products.approve(created.id, adminActor);
      await db.product.update({
        where: { id: created.id },
        data: { publishedAt: new Date(Date.now() - hash(p.title) % 40 * 864e5), isFeatured: hash(p.title) % 5 === 0, viewCount: hash(p.title) % 500 }
      });
    }
    console.log(`\u2714 seller ${def.business} with ${PRODUCTS[def.email].length} products`);
  }
  if (!await db.user.findUnique({ where: { email: "seller.pending@vyora.local" } })) {
    await s.sellers.register(
      {
        name: "Deepak Sharma",
        email: "seller.pending@vyora.local",
        phone: "9876500009",
        password: "Seller@12345",
        businessName: "Sharma Handicrafts",
        businessType: "INDIVIDUAL",
        addressLine1: "7 Lake View",
        city: "Lucknow",
        state: "Uttar Pradesh",
        pincode: "226001",
        pan: "EFGPS5678P",
        acceptTerms: true,
        acceptCommissionPolicy: true
      },
      { ip: "127.0.0.1", userAgent: "seed" }
    );
    console.log("\u2714 pending seller: seller.pending@vyora.local");
  }
  return sellerIds;
}
async function seedContent(refs) {
  if (await db.banner.count() === 0) {
    const banners = [
      { title: "The Big Festive Sale", subtitle: "Up to 60% off on fashion, electronics & home \u2014 from sellers across India", ctaLabel: "Shop the sale", linkUrl: "/search?q=&onSale=true", theme: "linear-gradient(120deg,#5B3DF5 0%,#9B5CFF 55%,#FF6B4A 100%)", placement: "HERO", sortOrder: 0 },
      { title: "Smart gadgets, smarter prices", subtitle: "Earbuds from \u20B91,799 \xB7 Smartwatches from \u20B92,999", ctaLabel: "Explore electronics", linkUrl: "/c/electronics", theme: "linear-gradient(120deg,#0F172A 0%,#2563EB 60%,#22D3EE 100%)", placement: "HERO", sortOrder: 1 },
      { title: "Handpicked for your home", subtitle: "Handwoven textiles and cookware you will love", ctaLabel: "Refresh your home", linkUrl: "/c/home-and-kitchen", theme: "linear-gradient(120deg,#0EA5A4 0%,#34D399 60%,#FDE68A 100%)", placement: "HERO", sortOrder: 2 },
      { title: "Use code WELCOME10", subtitle: "10% off your first order, up to \u20B9200", ctaLabel: "Start shopping", linkUrl: "/search?q=", theme: "linear-gradient(90deg,#FF6B4A,#FFB547)", placement: "STRIP", sortOrder: 0 }
    ];
    for (const b of banners) await s.content.createBanner({ ...b, isActive: true }, system);
  }
  if (await db.homeSection.count() === 0) {
    const sections = [
      { type: "CATEGORY_GRID", title: "Shop by category", limit: 8 },
      { type: "TRENDING", title: "Trending now", subtitle: "What everyone is looking at", limit: 12 },
      { type: "ON_SALE", title: "Deals of the day", subtitle: "Biggest discounts right now", limit: 12 },
      { type: "BEST_SELLERS", title: "Best sellers", limit: 12 },
      { type: "RECENTLY_VIEWED", title: "Recently viewed", limit: 12 },
      { type: "NEW_ARRIVALS", title: "New arrivals", limit: 12 },
      { type: "FEATURED_SELLERS", title: "Featured sellers", subtitle: "Independent stores we love", limit: 6 },
      { type: "CATEGORY_PRODUCTS", title: "Fashion picks", categoryId: refs.categories.get("Fashion"), limit: 12 },
      { type: "RECOMMENDED", title: "Top rated for you", limit: 12 }
    ];
    for (const [i, sec] of sections.entries()) await s.content.createSection({ ...sec, sortOrder: i, isActive: true }, system);
  }
  if (await db.coupon.count() === 0) {
    const now = Date.now();
    const in90 = new Date(now + 90 * 864e5);
    await s.coupons.create({ code: "WELCOME10", description: "10% off your first order (max \u20B9200)", type: "PERCENTAGE", value: 10, maxDiscount: 200, minOrderAmount: 299, scope: "ALL", scopeIds: [], fundedBy: "PLATFORM", startsAt: new Date(now - 864e5), endsAt: in90, usageLimit: 1e4, perCustomerLimit: 1, firstOrderOnly: true, isActive: true }, system);
    await s.coupons.create({ code: "FLAT100", description: "\u20B9100 off on orders above \u20B9999", type: "FIXED", value: 100, maxDiscount: null, minOrderAmount: 999, scope: "ALL", scopeIds: [], fundedBy: "PLATFORM", startsAt: new Date(now - 864e5), endsAt: in90, usageLimit: null, perCustomerLimit: 3, firstOrderOnly: false, isActive: true }, system);
    await s.coupons.create({ code: "FASHION20", description: "20% off fashion (max \u20B9500)", type: "PERCENTAGE", value: 20, maxDiscount: 500, minOrderAmount: 499, scope: "CATEGORY", scopeIds: [refs.categories.get("Fashion")], fundedBy: "PLATFORM", startsAt: new Date(now - 864e5), endsAt: in90, usageLimit: 500, perCustomerLimit: 2, firstOrderOnly: false, isActive: true }, system);
    await s.coupons.create({ code: "FREESHIP", description: "Free standard shipping", type: "FREE_SHIPPING", value: 0, maxDiscount: null, minOrderAmount: 0, scope: "ALL", scopeIds: [], fundedBy: "PLATFORM", startsAt: new Date(now - 864e5), endsAt: in90, usageLimit: null, perCustomerLimit: 5, firstOrderOnly: false, isActive: true }, system);
  }
  if (await db.promotion.count() === 0) {
    await s.content.createPromotion({ name: "Festive Fashion Week", description: "Up to 60% off ethnic wear", discountPercent: 40, categoryId: refs.categories.get("Fashion"), startsAt: new Date(Date.now() - 864e5), endsAt: new Date(Date.now() + 14 * 864e5), isActive: true }, system);
  }
}
async function seedCustomersAndOrders(adminActor) {
  const customers = [
    { name: "Priya Nair", email: "priya@vyora.local", phone: "9123400001", city: "Kochi", state: "Kerala", pincode: "682001" },
    { name: "Arjun Singh", email: "arjun@vyora.local", phone: "9123400002", city: "New Delhi", state: "Delhi", pincode: "110001" },
    { name: "Meera Joshi", email: "meera@vyora.local", phone: "9123400003", city: "Ahmedabad", state: "Gujarat", pincode: "380001" }
  ];
  const ids = [];
  for (const cu of customers) {
    let user = await db.user.findUnique({ where: { email: cu.email } });
    if (!user) {
      await s.auth.registerCustomer({ name: cu.name, email: cu.email, phone: cu.phone, password: "Customer@123" }, { ip: "127.0.0.1", userAgent: "seed" });
      user = await db.user.findUniqueOrThrow({ where: { email: cu.email } });
      await db.user.update({ where: { id: user.id }, data: { emailVerifiedAt: /* @__PURE__ */ new Date() } });
      await s.customers.createAddress(user.id, { fullName: cu.name, phone: cu.phone, line1: "21, Park Avenue", city: cu.city, state: cu.state, pincode: cu.pincode, type: "HOME", isDefault: true });
    }
    ids.push(user.id);
  }
  console.log("\u2714 customers: priya@ / arjun@ / meera@vyora.local  (password Customer@123)");
  if (await db.order.count() > 0) return;
  const listings = await db.sellerProductListing.findMany({ where: { status: "APPROVED", inventory: { quantity: { gt: 5 } } }, take: 40, orderBy: { createdAt: "asc" } });
  let n2 = 0;
  for (const [ci, userId] of ids.entries()) {
    for (let k = 0; k < 3; k++) {
      const picks = [listings[(ci * 7 + k * 3) % listings.length], listings[(ci * 7 + k * 3 + 11) % listings.length]];
      for (const l of picks) await s.cart.add({ userId }, l.id, 1);
      const address = await db.customerAddress.findFirstOrThrow({ where: { userId } });
      const placed = await s.checkout.placeOrder(userId, { addressId: address.id, shippingMethod: "STANDARD", paymentMethod: "COD", idempotencyKey: `seed-${ci}-${k}` }, { ip: "127.0.0.1", userAgent: "seed" });
      n2++;
      const subs = await db.sellerOrder.findMany({ where: { orderId: placed.id } });
      for (const so of subs) {
        const stage = (ci + k) % 4;
        if (stage === 0) continue;
        await s.fulfillment.updateSellerOrderStatus(so.id, "CONFIRMED", {}, { kind: "admin" }, adminActor);
        if (stage === 1) continue;
        await s.fulfillment.updateSellerOrderStatus(so.id, "PROCESSING", {}, { kind: "admin" }, adminActor);
        await s.fulfillment.updateSellerOrderStatus(so.id, "SHIPPED", { carrier: "BlueDart", trackingNumber: `BD${hash(so.id)}` }, { kind: "admin" }, adminActor);
        if (stage === 2) continue;
        await s.fulfillment.updateSellerOrderStatus(so.id, "DELIVERED", {}, { kind: "admin" }, adminActor);
        await s.fulfillment.confirmCodCollection(so.id, { reference: `COD-${hash(so.id)}` }, adminActor);
      }
    }
  }
  console.log(`\u2714 ${n2} demo orders placed via checkout`);
}
async function main() {
  const admin = await upsertRolesAndAdmin();
  const adminRoles = await db.userRole.findMany({ where: { userId: admin.id }, include: { role: { include: { permissions: { include: { permission: true } } } } } });
  const adminActor = {
    auth: {
      userId: admin.id,
      sessionId: "seed",
      email: admin.email,
      name: admin.name,
      roles: ["ADMIN"],
      sellerId: null,
      sellerStatus: null,
      permissions: new Set(adminRoles.flatMap((r) => r.role.permissions.map((p) => p.permission.code)))
    },
    ip: "127.0.0.1",
    userAgent: "seed"
  };
  const refs = await seedCatalogReference();
  console.log("\u2714 categories, attributes, brands, shipping & tax");
  await seedSellersAndProducts(refs, adminActor);
  await seedContent(refs);
  console.log("\u2714 banners, homepage sections, coupons, promotions");
  await seedCustomersAndOrders(adminActor);
  await seedDemoReviews(c);
  await c.jobs.drain();
}
main().then(async () => {
  await c.shutdown();
  console.log("\nSeed complete.");
}).catch(async (err) => {
  console.error(err);
  await c.shutdown();
  process.exit(1);
});
//# sourceMappingURL=seed.js.map