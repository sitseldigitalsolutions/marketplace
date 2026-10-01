/**
 * Permission catalogue. Permissions are stored in the database (Permission table) and granted to roles;
 * the API authorizes every protected route against the permissions carried by the authenticated principal.
 * Frontend checks are cosmetic only.
 */
export const Permissions = {
  // Admin — users & access
  USERS_READ: 'users:read',
  USERS_MANAGE: 'users:manage',
  ROLES_MANAGE: 'roles:manage',
  // Admin — sellers
  SELLERS_READ: 'sellers:read',
  SELLERS_MANAGE: 'sellers:manage',
  SELLERS_APPROVE: 'sellers:approve',
  // Admin — catalog
  CATALOG_MANAGE: 'catalog:manage',
  PRODUCTS_READ_ALL: 'products:read_all',
  PRODUCTS_MANAGE_ALL: 'products:manage_all',
  PRODUCTS_APPROVE: 'products:approve',
  INVENTORY_MANAGE_ALL: 'inventory:manage_all',
  // Admin — orders & finance
  ORDERS_READ_ALL: 'orders:read_all',
  ORDERS_MANAGE_ALL: 'orders:manage_all',
  COMMISSIONS_MANAGE: 'commissions:manage',
  SETTLEMENTS_MANAGE: 'settlements:manage',
  // Admin — marketing & config
  COUPONS_MANAGE: 'coupons:manage',
  CONTENT_MANAGE: 'content:manage',
  REVIEWS_MODERATE: 'reviews:moderate',
  SETTINGS_MANAGE: 'settings:manage',
  REPORTS_READ: 'reports:read',
  AUDIT_READ: 'audit:read',
  NOTIFICATIONS_MANAGE: 'notifications:manage',

  // Seller (always scoped to the authenticated seller)
  SELLER_DASHBOARD: 'seller:dashboard',
  SELLER_PRODUCTS: 'seller:products',
  SELLER_INVENTORY: 'seller:inventory',
  SELLER_ORDERS: 'seller:orders',
  SELLER_SETTLEMENTS: 'seller:settlements',
  SELLER_PROFILE: 'seller:profile',

  // Customer
  CUSTOMER_ORDERS: 'customer:orders',
  CUSTOMER_PROFILE: 'customer:profile',
  CUSTOMER_REVIEWS: 'customer:reviews',
} as const;
export type Permission = (typeof Permissions)[keyof typeof Permissions];
export const ALL_PERMISSIONS = Object.values(Permissions) as Permission[];

const ADMIN_PERMISSIONS = ALL_PERMISSIONS.filter((p) => !p.startsWith('seller:'));

export const SELLER_PERMISSIONS: Permission[] = [
  Permissions.SELLER_DASHBOARD,
  Permissions.SELLER_PRODUCTS,
  Permissions.SELLER_INVENTORY,
  Permissions.SELLER_ORDERS,
  Permissions.SELLER_SETTLEMENTS,
  Permissions.SELLER_PROFILE,
];

export const CUSTOMER_PERMISSIONS: Permission[] = [
  Permissions.CUSTOMER_ORDERS,
  Permissions.CUSTOMER_PROFILE,
  Permissions.CUSTOMER_REVIEWS,
];

/** Default role → permission grants applied by the seed script. */
export const DEFAULT_ROLE_PERMISSIONS: Record<'ADMIN' | 'SELLER' | 'CUSTOMER', Permission[]> = {
  ADMIN: ADMIN_PERMISSIONS,
  SELLER: [...SELLER_PERMISSIONS, ...CUSTOMER_PERMISSIONS],
  CUSTOMER: CUSTOMER_PERMISSIONS,
};
