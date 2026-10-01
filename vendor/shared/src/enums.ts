/**
 * Domain enums shared by the API and the web app.
 * These mirror the Prisma enums in backend/prisma/schema.prisma — keep them in sync.
 */

const values = <T extends Record<string, string>>(o: T) => Object.values(o) as [T[keyof T], ...T[keyof T][]];

export const RoleCode = { ADMIN: 'ADMIN', SELLER: 'SELLER', CUSTOMER: 'CUSTOMER' } as const;
export type RoleCode = (typeof RoleCode)[keyof typeof RoleCode];
export const ROLE_CODES = values(RoleCode);

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DELETION_REQUESTED: 'DELETION_REQUESTED',
  DELETED: 'DELETED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const SellerStatus = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
  INACTIVE: 'INACTIVE',
} as const;
export type SellerStatus = (typeof SellerStatus)[keyof typeof SellerStatus];
export const SELLER_STATUSES = values(SellerStatus);

export const BusinessType = {
  INDIVIDUAL: 'INDIVIDUAL',
  PROPRIETORSHIP: 'PROPRIETORSHIP',
  PARTNERSHIP: 'PARTNERSHIP',
  LLP: 'LLP',
  PRIVATE_LIMITED: 'PRIVATE_LIMITED',
  PUBLIC_LIMITED: 'PUBLIC_LIMITED',
  OTHER: 'OTHER',
} as const;
export type BusinessType = (typeof BusinessType)[keyof typeof BusinessType];
export const BUSINESS_TYPES = values(BusinessType);

export const ProductStatus = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];
export const PRODUCT_STATUSES = values(ProductStatus);

export const OrderStatus = {
  PENDING_CONFIRMATION: 'PENDING_CONFIRMATION',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  RETURN_REQUESTED: 'RETURN_REQUESTED',
  RETURN_APPROVED: 'RETURN_APPROVED',
  RETURN_REJECTED: 'RETURN_REJECTED',
  RETURNED: 'RETURNED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
export const ORDER_STATUSES = values(OrderStatus);

export const PaymentStatus = {
  PENDING: 'PENDING',
  COD_PENDING: 'COD_PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentMethod = { COD: 'COD' } as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const ShippingMethod = { STANDARD: 'STANDARD', EXPRESS: 'EXPRESS' } as const;
export type ShippingMethod = (typeof ShippingMethod)[keyof typeof ShippingMethod];
export const SHIPPING_METHODS = values(ShippingMethod);

export const FulfillmentMode = { SELLER: 'SELLER', PLATFORM: 'PLATFORM' } as const;
export type FulfillmentMode = (typeof FulfillmentMode)[keyof typeof FulfillmentMode];

export const ShipmentStatus = {
  PENDING: 'PENDING',
  SHIPPED: 'SHIPPED',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  RETURNED: 'RETURNED',
} as const;
export type ShipmentStatus = (typeof ShipmentStatus)[keyof typeof ShipmentStatus];

export const ReturnStatus = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PICKED_UP: 'PICKED_UP',
  RECEIVED: 'RECEIVED',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED',
} as const;
export type ReturnStatus = (typeof ReturnStatus)[keyof typeof ReturnStatus];

export const RefundStatus = { PENDING: 'PENDING', PROCESSED: 'PROCESSED', FAILED: 'FAILED' } as const;
export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus];

export const SettlementStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  PROCESSING: 'PROCESSING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;
export type SettlementStatus = (typeof SettlementStatus)[keyof typeof SettlementStatus];
export const SETTLEMENT_STATUSES = values(SettlementStatus);

export const LedgerEntryType = {
  SALE_CREDIT: 'SALE_CREDIT',
  COMMISSION_DEBIT: 'COMMISSION_DEBIT',
  COMMISSION_TAX_DEBIT: 'COMMISSION_TAX_DEBIT',
  SHIPPING_CREDIT: 'SHIPPING_CREDIT',
  REFUND_DEBIT: 'REFUND_DEBIT',
  COMMISSION_REVERSAL_CREDIT: 'COMMISSION_REVERSAL_CREDIT',
  SETTLEMENT_PAYOUT: 'SETTLEMENT_PAYOUT',
  MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT',
} as const;
export type LedgerEntryType = (typeof LedgerEntryType)[keyof typeof LedgerEntryType];

export const CommissionScope = {
  GLOBAL: 'GLOBAL',
  CATEGORY: 'CATEGORY',
  SELLER: 'SELLER',
  SELLER_CATEGORY: 'SELLER_CATEGORY',
  PRODUCT: 'PRODUCT',
} as const;
export type CommissionScope = (typeof CommissionScope)[keyof typeof CommissionScope];
export const COMMISSION_SCOPES = values(CommissionScope);

export const CouponType = { PERCENTAGE: 'PERCENTAGE', FIXED: 'FIXED', FREE_SHIPPING: 'FREE_SHIPPING' } as const;
export type CouponType = (typeof CouponType)[keyof typeof CouponType];
export const COUPON_TYPES = values(CouponType);

export const CouponScope = { ALL: 'ALL', CATEGORY: 'CATEGORY', PRODUCT: 'PRODUCT', SELLER: 'SELLER' } as const;
export type CouponScope = (typeof CouponScope)[keyof typeof CouponScope];
export const COUPON_SCOPES = values(CouponScope);

export const FundedBy = { PLATFORM: 'PLATFORM', SELLER: 'SELLER' } as const;
export type FundedBy = (typeof FundedBy)[keyof typeof FundedBy];

export const ReviewStatus = { PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED', REMOVED: 'REMOVED' } as const;
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const InventoryMovementType = {
  INITIAL: 'INITIAL',
  ADJUSTMENT: 'ADJUSTMENT',
  RESERVE: 'RESERVE',
  RELEASE: 'RELEASE',
  SHIP: 'SHIP',
  RETURN_RESTOCK: 'RETURN_RESTOCK',
  IMPORT: 'IMPORT',
} as const;
export type InventoryMovementType = (typeof InventoryMovementType)[keyof typeof InventoryMovementType];

export const BannerPlacement = { HERO: 'HERO', STRIP: 'STRIP', CATEGORY: 'CATEGORY' } as const;
export type BannerPlacement = (typeof BannerPlacement)[keyof typeof BannerPlacement];
export const BANNER_PLACEMENTS = values(BannerPlacement);

export const HomeSectionType = {
  CATEGORY_GRID: 'CATEGORY_GRID',
  TRENDING: 'TRENDING',
  BEST_SELLERS: 'BEST_SELLERS',
  NEW_ARRIVALS: 'NEW_ARRIVALS',
  ON_SALE: 'ON_SALE',
  FEATURED_PRODUCTS: 'FEATURED_PRODUCTS',
  CATEGORY_PRODUCTS: 'CATEGORY_PRODUCTS',
  FEATURED_SELLERS: 'FEATURED_SELLERS',
  RECOMMENDED: 'RECOMMENDED',
  RECENTLY_VIEWED: 'RECENTLY_VIEWED',
} as const;
export type HomeSectionType = (typeof HomeSectionType)[keyof typeof HomeSectionType];
export const HOME_SECTION_TYPES = values(HomeSectionType);

export const NotificationChannel = { IN_APP: 'IN_APP', EMAIL: 'EMAIL', SMS: 'SMS', WHATSAPP: 'WHATSAPP' } as const;
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel];

export const AttributeType = { TEXT: 'TEXT', NUMBER: 'NUMBER', SELECT: 'SELECT', BOOLEAN: 'BOOLEAN' } as const;
export type AttributeType = (typeof AttributeType)[keyof typeof AttributeType];
export const ATTRIBUTE_TYPES = values(AttributeType);

export const SellerDocumentType = {
  GST_CERTIFICATE: 'GST_CERTIFICATE',
  PAN_CARD: 'PAN_CARD',
  ADDRESS_PROOF: 'ADDRESS_PROOF',
  CANCELLED_CHEQUE: 'CANCELLED_CHEQUE',
  OTHER: 'OTHER',
} as const;
export type SellerDocumentType = (typeof SellerDocumentType)[keyof typeof SellerDocumentType];
export const SELLER_DOCUMENT_TYPES = values(SellerDocumentType);

export const AddressType = { HOME: 'HOME', WORK: 'WORK', OTHER: 'OTHER' } as const;
export type AddressType = (typeof AddressType)[keyof typeof AddressType];
export const ADDRESS_TYPES = values(AddressType);
