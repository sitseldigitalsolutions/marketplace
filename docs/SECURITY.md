# Security

| Control | Implementation |
|---|---|
| Password hashing | Argon2id (m=19 MiB, t=2) by default, bcrypt selectable; verification auto-detects the algorithm. Timing-equalised login for unknown users. |
| Sessions | 15-min HS256 access JWT (`vy_at`, HTTP-only, SameSite=Lax, Secure in prod) + rotating refresh token (`vy_rt`, path `/api/v1/auth`, stored only as SHA-256). Re-use of a rotated refresh token revokes the whole family and records `REFRESH_TOKEN_REUSE`. Logout / password change / suspension take effect immediately (session liveness checked on every request, 10 s principal cache invalidated on change). |
| CSRF | Double-submit token: `vy_csrf` cookie must equal `x-csrf-token` header on every cookie-authenticated mutation. Bearer-token API clients are exempt. Token rotated on login. |
| Brute force | Per-account lockout (`LOGIN_MAX_ATTEMPTS`, `LOGIN_LOCK_MINUTES`), per-IP route limits on login/register/reset/OTP/search/checkout, global per-IP limit. Redis-backed when `REDIS_ENABLED=true`. |
| Authorization | Permission-based RBAC stored in DB (`Role`, `Permission`, `RolePermission`), enforced in the pipeline for every route. Frontend checks are cosmetic. |
| Tenant isolation | Seller routes take `sellerId` only from the authenticated principal. Every seller query filters by it; other sellers' resources return 404. Covered by `test/security.test.ts` (tests 1–7) incl. body-smuggled `sellerId`. |
| IDOR | Customer orders, addresses, cart items, returns and reviews are always fetched with the owner in the WHERE clause. |
| Input validation | zod schemas (shared with the frontend) on params, query and body; strict enums; plain-text sanitisation of user content; LIKE wildcards escaped; FULLTEXT boolean operators stripped. |
| SQL injection | Prisma parameterised queries; raw SQL only via tagged templates (parameterised). |
| XSS | React escaping; user HTML stripped server-side; strict CSP on API responses (`default-src 'none'`) and nginx CSP for the SPA; `X-Content-Type-Options: nosniff`. |
| File uploads | Size limits per type, count limits, **magic-byte type detection** (declared MIME/extension ignored), images re-encoded to WebP with metadata stripped (neutralises polyglots), random storage keys, KYC documents in private storage served only via HMAC-signed expiring URLs (or S3 presigned URLs). |
| Price integrity | Totals always recomputed server-side; client `expectedGrandTotal` only triggers a `PRICE_CHANGED` confirmation, never a charge. |
| Idempotency & races | Unique (customer, idempotencyKey); per-customer row lock during checkout; conditional UPDATEs for stock and coupon usage; optimistic status checks for fulfilment, settlements and returns. |
| Error handling | Uniform envelope; stack traces and DB details never leave the server (logged with request id). |
| Headers | nosniff, frame DENY, referrer policy, COOP, permissions policy, HSTS in staging/production. |
| Secrets | Environment only; startup refuses placeholder / identical JWT secrets and insecure cookies in staging/production. |
| Audit | `AuditLog` for admin actions, seller product & inventory changes, permission/role changes, order status changes, commission rules, settlements, ledger adjustments, settings; `SecurityEvent` for auth events, denied access, CSRF failures and rate limiting. |
| Privacy | Sellers see only delivery details needed to ship (never customer email/account). Account deletion = request + admin anonymisation preserving financial records. |

## Reporting
Please report vulnerabilities privately to the maintainers; do not open public issues.
