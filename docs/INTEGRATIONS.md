# External integrations

Everything runs locally without paid services. Each integration is an interface with a working local adapter.

| Capability | Interface | Local/default adapter | Production options |
|---|---|---|---|
| Payments | `PaymentProvider` (`modules/payments/payment-provider.ts`) | Cash on Delivery | Razorpay, Stripe, PayU |
| Storage | `StorageProvider` | Local disk + HMAC-signed private URLs | AWS S3 / MinIO / R2 (`STORAGE_PROVIDER=s3`) |
| Email | `EmailChannel` | Console + `OutboundMessage` dev inbox (`/api/v1/dev/mailbox`, admin Outbox) | SMTP (`EMAIL_PROVIDER=smtp`) / SES |
| SMS (OTP, shipping) | `SmsChannel` | Console | MSG91, Twilio, Gupshup |
| WhatsApp | `WhatsAppChannel` | Console | Meta Cloud API, Gupshup |
| Shipping | `ShippingProvider` | Manual entry (carrier + tracking) | Shiprocket, Delhivery |
| Search | `StorefrontService` (MySQL FULLTEXT + LIKE fallback) | MySQL | OpenSearch/Elasticsearch behind the same service methods |
| Jobs | `JobQueue` | In-process | BullMQ on Redis (`REDIS_ENABLED=true`) |
| Cache / rate limit store | `CacheProvider`, `RateLimitStore` | Memory | Redis |

## Adding an online payment gateway (e.g. Razorpay)
1. Implement `PaymentProvider` (`createPayment` creates a gateway order and returns `nextAction`; `verifyPayment`
   validates the signature; `refundPayment` calls the refund API).
2. Add `PaymentMethod` enum values (`UPI`, `CARD`…) and a `PENDING_PAYMENT` order phase with reservation expiry
   (a job releases stock for unpaid orders).
3. Add a webhook route with **signature verification** and idempotent processing (store gateway event ids).
4. Register the provider in `PaymentRegistry` only when credentials are configured. Do not show online methods
   before then — the checkout lists exactly what the registry returns.
Cart, pricing, inventory reservation and order creation stay unchanged.

## Adding a carrier (e.g. Shiprocket)
Implement `createShipment`/`track` on a `ShippingProvider`, call it from the SHIPPED transition to obtain the AWB,
and add a webhook or polling job that appends `ShipmentEvent`s and advances sub-order status.
