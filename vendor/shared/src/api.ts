/** Standard API envelope used by every endpoint. */
export interface ApiSuccess<T> {
  success: true;
  result: T;
  message?: string;
}

export interface ApiErrorBody {
  success: false;
  error: { code: ErrorCode; details?: unknown[] };
  message: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  CSRF_FAILED: 'CSRF_FAILED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  BUSINESS_RULE: 'BUSINESS_RULE',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  PRICE_CHANGED: 'PRICE_CHANGED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  UNSUPPORTED_MEDIA: 'UNSUPPORTED_MEDIA',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/** Shape of the authenticated principal returned by /auth/me. */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  roles: Array<'ADMIN' | 'SELLER' | 'CUSTOMER'>;
  permissions: string[];
  seller: { id: string; status: string; businessName: string; slug: string } | null;
}

export const formatINR = (amount: number | string | null | undefined, opts: { decimals?: boolean } = {}) => {
  const n = typeof amount === 'string' ? Number(amount) : (amount ?? 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: opts.decimals === false ? 0 : 2,
    minimumFractionDigits: opts.decimals === false ? 0 : Number.isInteger(n) ? 0 : 2,
  }).format(n);
};

export const discountPercent = (price: number, mrp: number) =>
  mrp > 0 && price < mrp ? Math.round(((mrp - price) / mrp) * 100) : 0;
