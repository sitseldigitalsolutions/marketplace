import { Redis } from 'ioredis';
import type { PrismaClient } from '@prisma/client';
import type { Env } from '../config/env';
import { createDatabaseProvider, type DatabaseProvider } from '../database';
import { PrismaAuditRepository, PrismaSecurityEventRepository, PrismaSettingsRepository } from '../database/prisma/repositories';
import { MemoryRateLimitStore, RedisRateLimitStore, type RateLimitStore } from '../http/rate-limit';
import { MemoryCache, NoopCache, RedisCache, type CacheProvider } from '../infrastructure/cache';
import { BullJobQueue, InlineJobQueue, type JobQueue } from '../infrastructure/jobs';
import { createChannels } from '../infrastructure/messaging/channels';
import { createStorage, type StorageProvider } from '../infrastructure/storage';
import { AnalyticsService } from '../modules/analytics/analytics.service';
import { AuditService } from '../modules/audit/audit.service';
import { AuthService } from '../modules/auth/auth.service';
import { createPasswordHasher } from '../modules/auth/password';
import { CartService } from '../modules/cart/cart.service';
import { CatalogService } from '../modules/catalog/category.service';
import { ProductIndexer } from '../modules/catalog/product-indexer';
import { ProductIoService } from '../modules/catalog/product-io.service';
import { ProductService } from '../modules/catalog/product.service';
import { StorefrontService } from '../modules/catalog/storefront.service';
import { ContentService } from '../modules/content/content.service';
import { CouponService } from '../modules/coupons/coupon.service';
import { CustomerService } from '../modules/customers/customer.service';
import { FinanceService } from '../modules/finance/finance.service';
import { InventoryService } from '../modules/inventory/inventory.service';
import { NotificationService } from '../modules/notifications/notification.service';
import { CheckoutService } from '../modules/orders/checkout.service';
import { FulfillmentService } from '../modules/orders/fulfillment.service';
import { OrderQueryService } from '../modules/orders/order-query.service';
import { CashOnDeliveryProvider, PaymentRegistry } from '../modules/payments/payment-provider';
import { ReviewService } from '../modules/reviews/review.service';
import { SellerService } from '../modules/sellers/seller.service';
import { SettingsService } from '../modules/settings/settings.service';
import { ShippingService } from '../modules/shipping/shipping.service';
import { TaxService } from '../modules/tax/tax.service';
import { UserAdminService } from '../modules/users/user-admin.service';

/** Composition root: builds every service once from configuration. */
export function createContainer(env: Env) {
  const database: DatabaseProvider<PrismaClient> = createDatabaseProvider(env);
  const db = database.client;

  const redis = env.REDIS_ENABLED ? new Redis(env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: false }) : null;
  const rateLimitStore: RateLimitStore = redis ? new RedisRateLimitStore(redis) : new MemoryRateLimitStore();
  const cache: CacheProvider = env.APP_ENV === 'test' ? new NoopCache() : redis ? new RedisCache(redis) : new MemoryCache();
  const jobs: JobQueue = redis ? new BullJobQueue(redis) : new InlineJobQueue();
  const storage: StorageProvider = createStorage(env);
  const channels = createChannels(env);

  const settings = new SettingsService(new PrismaSettingsRepository(db));
  const audit = new AuditService(new PrismaAuditRepository(db), new PrismaSecurityEventRepository(db));
  const notifications = new NotificationService(db, env, channels, jobs, settings);
  const hasher = createPasswordHasher(env.PASSWORD_HASHER, env.APP_ENV === 'test');
  const auth = new AuthService(db, env, hasher, audit, notifications);

  const indexer = new ProductIndexer(db, cache);
  const catalog = new CatalogService(db, cache, audit);
  const storefront = new StorefrontService(db, catalog, cache);
  const inventory = new InventoryService(db, indexer, audit, notifications);
  const products = new ProductService(db, storage, inventory, indexer, settings, audit, notifications);
  const productIo = new ProductIoService(db, products, inventory, indexer);
  const sellers = new SellerService(db, auth, storage, indexer, audit, notifications);

  const tax = new TaxService(db, settings, audit);
  const shipping = new ShippingService(db, settings, audit);
  const coupons = new CouponService(db, audit);
  const cart = new CartService(db, coupons, shipping, tax, settings);
  const finance = new FinanceService(db, audit, notifications, env.COMMISSION_DEFAULT_PERCENTAGE);
  const payments = new PaymentRegistry([new CashOnDeliveryProvider()]);
  const checkout = new CheckoutService(db, cart, coupons, inventory, shipping, finance, payments, settings, indexer, audit, notifications);
  const fulfillment = new FulfillmentService(db, inventory, finance, coupons, shipping, settings, indexer, audit, notifications);
  const orderQueries = new OrderQueryService(db);

  const customers = new CustomerService(db, auth, storefront, channels, audit);
  const reviews = new ReviewService(db, storage, settings, audit);
  const content = new ContentService(db, storefront, catalog, settings, storage, cache, audit);
  const analytics = new AnalyticsService(db, finance, products, env.DEFAULT_TIMEZONE);
  const users = new UserAdminService(db, auth, audit);

  return {
    env,
    database,
    db,
    redis,
    cache,
    jobs,
    storage,
    rateLimitStore,
    services: {
      settings, audit, notifications, auth, indexer, catalog, storefront, inventory, products, productIo, sellers, tax, shipping,
      coupons, cart, finance, payments, checkout, fulfillment, orderQueries, customers, reviews, content, analytics, users,
    },
    async shutdown() {
      await jobs.close();
      await database.disconnect();
      if (redis) redis.disconnect();
    },
  };
}

export type Container = ReturnType<typeof createContainer>;
