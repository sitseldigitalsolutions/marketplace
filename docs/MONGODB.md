# MongoDB provider design (not implemented yet)

`DATABASE_TYPE=mongodb` with `ORM_PROVIDER=mongoose` or `prisma` is recognised by configuration validation but
the application refuses to start with it until the adapter exists. This document specifies how the same
business entities map to MongoDB so the adapter can be built without changing business rules.

## Requirements
* MongoDB ≥ 6 running as a **replica set** (multi-document transactions are mandatory for order placement,
  inventory, coupon redemption, ledger postings). `docker compose --profile mongo up` starts a single-node
  replica set (`rs.initiate()` must be run once).
* All monetary values stored as `Decimal128`; timestamps as UTC `Date`.

## Collections

| Collection | Embeds | References | Notes / indexes |
|---|---|---|---|
| `users` | roles (codes), customerProfile | — | unique `email`, unique sparse `phone` |
| `roles` | permissions (codes) | — | unique `code` |
| `refreshTokens` | — | userId | unique `tokenHash`, index `familyId`, TTL on `expiresAt` |
| `verificationTokens` | — | userId | unique `tokenHash`, TTL on `expiresAt` |
| `sellers` | addresses, documents, approvals[] | userId | unique `userId`, `slug`, `code`; index `status` |
| `categories` | — | parentId | materialised `path` string index for subtree queries |
| `brands`, `productAttributes` | — | categoryId | unique slug / (categoryId, code) |
| `products` | variants[], images[], attributeValues[], approvals[] | categoryId, brandId, ownerSellerId | text index on title + searchText; indexes on (status, categoryId), (status, minPrice) |
| `listings` | inventory {quantity, reserved, lowStockThreshold} | sellerId, productId, variantId | unique (sellerId, sku), (sellerId, variantId) |
| `inventoryMovements` | — | listingId | index (listingId, createdAt) |
| `carts` | items[] | userId / guestToken | unique sparse userId, guestToken |
| `orders` | address snapshot, payment, statusHistory[] | customerId | unique (customerId, idempotencyKey), unique orderNumber |
| `sellerOrders` | items[] (full snapshots incl. commission), shipments[] with events | orderId, sellerId | index (sellerId, status, createdAt) — sellers query only this collection |
| `returns`, `refunds` | items[] | orderId, sellerOrderId | |
| `sellerLedger` | — | sellerId | append-only, index (sellerId, createdAt) |
| `settlements` | transactions[] | sellerId | |
| `coupons`, `couponUsages` | — | | unique code; unique couponUsage.orderId |
| `reviews` | images[], reports[] | productId, userId | unique (productId, userId) |
| `notifications`, `outboundMessages`, `auditLogs`, `securityEvents`, `settings` | | | TTL optional for logs |

Order items are embedded in `sellerOrders` (the unit a seller fulfils) rather than in `orders`, so seller
queries never touch other sellers' data.

## Transaction strategy
* Order placement: `session.withTransaction()` wrapping (1) idempotency lookup, (2) per-listing
  `updateOne({ _id, $expr: { $gte: [{ $subtract: ['$inventory.quantity', '$inventory.reserved'] }, qty] } }, { $inc: { 'inventory.reserved': qty } })`
  and aborting when `modifiedCount === 0`, (3) inserts, (4) coupon `updateOne({ _id, $or: [{usageLimit: null}, {$expr: {$lt: ['$usedCount','$usageLimit']}}] }, { $inc: { usedCount: 1 } })`.
* Ledger: per-seller running balance maintained on the seller document with `$inc` inside the same transaction.
* Retry on `TransientTransactionError` labels.

## Adapter work list
1. `database/mongoose/provider.ts` implementing `DatabaseProvider` (connect/health/transaction).
2. Mongoose schemas mirroring the table above.
3. Repository implementations for each module; move the Prisma queries in services behind those interfaces.
4. Enable the combination in `config/env.ts` and run the full test suite against a replica set.
