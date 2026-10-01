import { z } from 'zod';
import {
  addCartItemSchema,
  addressSchema,
  applyCouponSchema,
  cancelOrderSchema,
  checkoutQuoteSchema,
  idSchema,
  orderListQuerySchema,
  paginationQuerySchema,
  Permissions,
  placeOrderSchema,
  profileUpdateSchema,
  returnRequestSchema,
  reviewReportSchema,
  reviewSchema,
  updateCartItemSchema,
} from '@vyora/shared';
import type { Container } from '../../bootstrap/container';
import { actorOf, idParams, MB, userIdOf } from '../../http/helpers';
import { reply, route } from '../../http/route';
import type { RequestContext } from '../../http/types';
import { GUEST_CART_COOKIE, type CartOwner } from '../cart/cart.service';

const P = Permissions;

export function customerRoutes(c: Container) {
  const s = c.services;

  /** Cart owner: the signed-in user, otherwise an anonymous guest token cookie. */
  const owner = (ctx: RequestContext, create: boolean): CartOwner | null => {
    if (ctx.auth) return { userId: ctx.auth.userId };
    const token = ctx.cookies[GUEST_CART_COOKIE];
    if (token && /^[A-Za-z0-9_-]{32,64}$/.test(token)) return { guestToken: token };
    if (!create) return null;
    const fresh = s.cart.newGuestToken();
    ctx.setCookie(GUEST_CART_COOKIE, fresh, { maxAgeSeconds: 30 * 86400 });
    return { guestToken: fresh };
  };

  const cart = [
    route({
      method: 'GET',
      path: '/cart',
      auth: 'optional',
      docs: { tags: ['Cart'], summary: 'Current cart (user or guest) with live prices and availability' },
      handler: async (ctx) => s.cart.view(owner(ctx, false)),
    }),
    route({
      method: 'POST',
      path: '/cart/items',
      auth: 'optional',
      schema: { body: addCartItemSchema },
      rateLimit: { name: 'cart:add', windowSeconds: 60, max: 60 },
      docs: { tags: ['Cart'], summary: 'Add a seller offer (listing) to the cart' },
      handler: async (ctx) => {
        const o = owner(ctx, true)!;
        await s.cart.add(o, ctx.body.listingId, ctx.body.quantity);
        return reply.ok(await s.cart.view(o), 'Added to cart');
      },
    }),
    route({
      method: 'PATCH',
      path: '/cart/items/:id',
      auth: 'optional',
      schema: { params: idParams, body: updateCartItemSchema },
      docs: { tags: ['Cart'], summary: 'Change quantity' },
      handler: async (ctx) => {
        const o = owner(ctx, false);
        if (!o) return reply.ok(await s.cart.view(null));
        await s.cart.update(o, ctx.params.id, ctx.body.quantity);
        return s.cart.view(o);
      },
    }),
    route({
      method: 'DELETE',
      path: '/cart/items/:id',
      auth: 'optional',
      schema: { params: idParams },
      docs: { tags: ['Cart'], summary: 'Remove an item' },
      handler: async (ctx) => {
        const o = owner(ctx, false);
        if (o) await s.cart.remove(o, ctx.params.id);
        return reply.ok(await s.cart.view(o), 'Removed from cart');
      },
    }),
    route({
      method: 'POST',
      path: '/cart/coupon',
      auth: 'optional',
      schema: { body: applyCouponSchema },
      rateLimit: { name: 'cart:coupon', windowSeconds: 300, max: 20 },
      docs: { tags: ['Cart'], summary: 'Apply a coupon code (validated server-side)' },
      handler: async (ctx) => reply.ok(await s.cart.applyCoupon(owner(ctx, true)!, ctx.body.code), 'Coupon applied'),
    }),
    route({
      method: 'DELETE',
      path: '/cart/coupon',
      auth: 'optional',
      docs: { tags: ['Cart'], summary: 'Remove the coupon' },
      handler: async (ctx) => {
        const o = owner(ctx, false);
        if (o) await s.cart.removeCoupon(o);
        return s.cart.view(o);
      },
    }),
    route({
      method: 'POST',
      path: '/cart/acknowledge-prices',
      auth: 'optional',
      docs: { tags: ['Cart'], summary: 'Accept updated prices for items whose price changed' },
      handler: async (ctx) => {
        const o = owner(ctx, false);
        if (o) await s.cart.acknowledgePrices(o);
        return s.cart.view(o);
      },
    }),
  ];

  const orders = [
    route({
      method: 'POST',
      path: '/checkout',
      auth: 'required',
      permissions: [P.CUSTOMER_ORDERS],
      schema: { body: checkoutQuoteSchema },
      docs: { tags: ['Checkout'], summary: 'Checkout review: server-computed totals, delivery estimate and payment options' },
      handler: async (ctx) => s.checkout.quote(userIdOf(ctx), ctx.body),
    }),
    route({
      method: 'POST',
      path: '/orders',
      auth: 'required',
      permissions: [P.CUSTOMER_ORDERS],
      schema: { body: placeOrderSchema },
      rateLimit: { name: 'orders:place', windowSeconds: 60, max: 10, by: 'user' },
      docs: { tags: ['Orders'], summary: 'Place an order (COD). Idempotent per idempotencyKey.' },
      handler: async (ctx) => {
        const result = await s.checkout.placeOrder(userIdOf(ctx), ctx.body, { ip: ctx.ip, userAgent: ctx.userAgent });
        return result.duplicate ? reply.ok(result, 'Order already placed') : reply.created(result, 'Order placed successfully');
      },
    }),
    route({
      method: 'GET',
      path: '/orders',
      auth: 'required',
      permissions: [P.CUSTOMER_ORDERS],
      schema: { query: orderListQuerySchema.omit({ sellerId: true }) },
      docs: { tags: ['Orders'], summary: 'Your orders' },
      handler: async (ctx) => s.orderQueries.customerOrders(userIdOf(ctx), ctx.query),
    }),
    route({
      method: 'GET',
      path: '/orders/:id',
      auth: 'required',
      permissions: [P.CUSTOMER_ORDERS],
      schema: { params: idParams },
      docs: { tags: ['Orders'], summary: 'Order detail with tracking (only your own orders)' },
      handler: async (ctx) => s.orderQueries.customerOrder(userIdOf(ctx), ctx.params.id),
    }),
    route({
      method: 'POST',
      path: '/orders/:id/cancel',
      auth: 'required',
      permissions: [P.CUSTOMER_ORDERS],
      schema: { params: idParams, body: cancelOrderSchema },
      docs: { tags: ['Orders'], summary: 'Cancel the whole order or selected items before shipment' },
      handler: async (ctx) => {
        await s.fulfillment.cancelByCustomer(userIdOf(ctx), ctx.params.id, ctx.body, actorOf(ctx));
        return reply.ok(await s.orderQueries.customerOrder(userIdOf(ctx), ctx.params.id), 'Cancellation confirmed');
      },
    }),
    route({
      method: 'POST',
      path: '/orders/:id/returns',
      auth: 'required',
      permissions: [P.CUSTOMER_ORDERS],
      schema: { params: idParams, body: returnRequestSchema },
      docs: { tags: ['Orders'], summary: 'Request a return for delivered items' },
      handler: async (ctx) => reply.created(await s.fulfillment.requestReturn(userIdOf(ctx), ctx.params.id, ctx.body, actorOf(ctx)), 'Return requested'),
    }),
    route({
      method: 'GET',
      path: '/me/returns',
      auth: 'required',
      schema: { query: paginationQuerySchema },
      docs: { tags: ['Orders'], summary: 'Your return requests and refund status' },
      handler: async (ctx) => s.orderQueries.returns({ sellerId: null, customerId: userIdOf(ctx) }, ctx.query),
    }),
    route({
      method: 'POST',
      path: '/me/returns/:id/cancel',
      auth: 'required',
      schema: { params: idParams },
      docs: { tags: ['Orders'], summary: 'Withdraw a return request' },
      handler: async (ctx) => {
        await s.fulfillment.cancelReturn(userIdOf(ctx), ctx.params.id, actorOf(ctx));
        return reply.ok(null, 'Return cancelled');
      },
    }),
  ];

  const account = [
    route({
      method: 'GET',
      path: '/me/profile',
      auth: 'required',
      docs: { tags: ['Account'], summary: 'Your profile' },
      handler: async (ctx) => s.customers.profile(userIdOf(ctx)),
    }),
    route({
      method: 'PATCH',
      path: '/me/profile',
      auth: 'required',
      permissions: [P.CUSTOMER_PROFILE],
      schema: { body: profileUpdateSchema },
      docs: { tags: ['Account'], summary: 'Update your profile' },
      handler: async (ctx) => reply.ok(await s.customers.updateProfile(userIdOf(ctx), ctx.body), 'Profile updated'),
    }),
    route({
      method: 'POST',
      path: '/me/phone/otp',
      auth: 'required',
      rateLimit: { name: 'phone:otp', windowSeconds: 900, max: 3, by: 'user' },
      docs: { tags: ['Account'], summary: 'Send a phone verification code (SMS provider; console in development)' },
      handler: async (ctx) => reply.ok(await s.customers.requestPhoneOtp(userIdOf(ctx)), 'Verification code sent'),
    }),
    route({
      method: 'POST',
      path: '/me/phone/verify',
      auth: 'required',
      schema: { body: z.object({ otp: z.string().trim().max(10) }) },
      rateLimit: { name: 'phone:verify', windowSeconds: 900, max: 5, by: 'user' },
      docs: { tags: ['Account'], summary: 'Verify phone with the code' },
      handler: async (ctx) => {
        await s.customers.verifyPhoneOtp(userIdOf(ctx), ctx.body.otp);
        return reply.ok(null, 'Phone number verified');
      },
    }),
    route({
      method: 'POST',
      path: '/me/delete-request',
      auth: 'required',
      docs: { tags: ['Account'], summary: 'Request account deletion' },
      handler: async (ctx) => {
        await s.customers.requestDeletion(userIdOf(ctx), actorOf(ctx));
        ctx.clearCookie('vy_at');
        ctx.clearCookie('vy_rt', { path: '/api/v1/auth' });
        return reply.ok(null, 'Your deletion request has been received. You have been signed out.');
      },
    }),
    route({
      method: 'GET',
      path: '/me/addresses',
      auth: 'required',
      docs: { tags: ['Account'], summary: 'Saved addresses' },
      handler: async (ctx) => s.customers.listAddresses(userIdOf(ctx)),
    }),
    route({
      method: 'POST',
      path: '/me/addresses',
      auth: 'required',
      schema: { body: addressSchema },
      docs: { tags: ['Account'], summary: 'Add address' },
      handler: async (ctx) => reply.created(await s.customers.createAddress(userIdOf(ctx), ctx.body), 'Address saved'),
    }),
    route({
      method: 'PUT',
      path: '/me/addresses/:id',
      auth: 'required',
      schema: { params: idParams, body: addressSchema },
      docs: { tags: ['Account'], summary: 'Update address' },
      handler: async (ctx) => reply.ok(await s.customers.updateAddress(userIdOf(ctx), ctx.params.id, ctx.body), 'Address updated'),
    }),
    route({
      method: 'PATCH',
      path: '/me/addresses/:id/default',
      auth: 'required',
      schema: { params: idParams },
      docs: { tags: ['Account'], summary: 'Make default address' },
      handler: async (ctx) => {
        await s.customers.setDefaultAddress(userIdOf(ctx), ctx.params.id);
        return reply.ok(await s.customers.listAddresses(userIdOf(ctx)), 'Default address updated');
      },
    }),
    route({
      method: 'DELETE',
      path: '/me/addresses/:id',
      auth: 'required',
      schema: { params: idParams },
      docs: { tags: ['Account'], summary: 'Delete address' },
      handler: async (ctx) => {
        await s.customers.deleteAddress(userIdOf(ctx), ctx.params.id);
        return reply.ok(null, 'Address removed');
      },
    }),
    route({
      method: 'GET',
      path: '/me/wishlist',
      auth: 'required',
      docs: { tags: ['Wishlist'], summary: 'Wishlist products' },
      handler: async (ctx) => s.customers.wishlist(userIdOf(ctx)),
    }),
    route({
      method: 'GET',
      path: '/me/wishlist/ids',
      auth: 'required',
      docs: { tags: ['Wishlist'], summary: 'Product ids in the wishlist' },
      handler: async (ctx) => s.customers.wishlistIds(userIdOf(ctx)),
    }),
    route({
      method: 'POST',
      path: '/me/wishlist/:id',
      auth: 'required',
      schema: { params: idParams },
      docs: { tags: ['Wishlist'], summary: 'Add product to wishlist' },
      handler: async (ctx) => {
        await s.customers.addToWishlist(userIdOf(ctx), ctx.params.id);
        return reply.ok(await s.customers.wishlistIds(userIdOf(ctx)), 'Saved to wishlist');
      },
    }),
    route({
      method: 'DELETE',
      path: '/me/wishlist/:id',
      auth: 'required',
      schema: { params: idParams },
      docs: { tags: ['Wishlist'], summary: 'Remove product from wishlist' },
      handler: async (ctx) => {
        await s.customers.removeFromWishlist(userIdOf(ctx), ctx.params.id);
        return reply.ok(await s.customers.wishlistIds(userIdOf(ctx)), 'Removed from wishlist');
      },
    }),
    route({
      method: 'GET',
      path: '/me/recently-viewed',
      auth: 'required',
      docs: { tags: ['Account'], summary: 'Recently viewed products' },
      handler: async (ctx) => s.customers.recentlyViewed(userIdOf(ctx)),
    }),
    route({
      method: 'GET',
      path: '/me/recommendations',
      auth: 'required',
      docs: { tags: ['Account'], summary: 'Personalised recommendations' },
      handler: async (ctx) => s.storefront.recommendedFor(userIdOf(ctx)),
    }),
    route({
      method: 'POST',
      path: '/me/stock-alerts/:id',
      auth: 'required',
      schema: { params: idParams },
      docs: { tags: ['Account'], summary: 'Notify me when a product is back in stock' },
      handler: async (ctx) => {
        await s.customers.subscribeStock(userIdOf(ctx), ctx.params.id);
        return reply.ok(null, "We'll let you know when it's back");
      },
    }),
    route({
      method: 'GET',
      path: '/me/notifications',
      auth: 'required',
      schema: { query: paginationQuerySchema.extend({ unread: z.enum(['true', 'false']).optional() }) },
      docs: { tags: ['Notifications'], summary: 'In-app notifications' },
      handler: async (ctx) => s.notifications.list(userIdOf(ctx), ctx.query.page, ctx.query.pageSize, ctx.query.unread === 'true'),
    }),
    route({
      method: 'POST',
      path: '/me/notifications/read',
      auth: 'required',
      schema: { body: z.object({ id: idSchema.optional() }) },
      docs: { tags: ['Notifications'], summary: 'Mark one or all notifications read' },
      handler: async (ctx) => {
        await s.notifications.markRead(userIdOf(ctx), ctx.body.id);
        return reply.ok(null);
      },
    }),

    // ── Reviews ──────────────────────────────────────────────
    route({
      method: 'GET',
      path: '/reviews/product/:id',
      auth: 'public',
      schema: {
        params: idParams,
        query: paginationQuerySchema.extend({
          rating: z.coerce.number().int().min(1).max(5).optional(),
          withPhotos: z.enum(['true', 'false']).optional(),
          sort: z.enum(['recent', 'helpful', 'rating_high', 'rating_low']).optional(),
        }),
      },
      docs: { tags: ['Reviews'], summary: 'Approved reviews for a product' },
      handler: async (ctx) =>
        s.reviews.forProduct(ctx.params.id, { ...ctx.query, withPhotos: ctx.query.withPhotos === 'true' }),
    }),
    route({
      method: 'GET',
      path: '/reviews/eligibility/:id',
      auth: 'required',
      schema: { params: idParams },
      docs: { tags: ['Reviews'], summary: 'Can I review this product, and will it be a verified purchase?' },
      handler: async (ctx) => s.reviews.eligibility(userIdOf(ctx), ctx.params.id),
    }),
    route({
      method: 'POST',
      path: '/reviews',
      auth: 'required',
      permissions: [P.CUSTOMER_REVIEWS],
      schema: { body: reviewSchema },
      upload: { maxFiles: 5, maxFileBytes: c.env.UPLOAD_MAX_IMAGE_MB * MB, allowed: 'image' },
      rateLimit: { name: 'reviews:create', windowSeconds: 3600, max: 20, by: 'user' },
      docs: { tags: ['Reviews'], summary: 'Write a review (multipart; optional photos)' },
      handler: async (ctx) => reply.created(await s.reviews.create(userIdOf(ctx), ctx.body, ctx.files), 'Thanks for your review!'),
    }),
    route({
      method: 'GET',
      path: '/me/reviews',
      auth: 'required',
      docs: { tags: ['Reviews'], summary: 'Your reviews' },
      handler: async (ctx) => s.reviews.mine(userIdOf(ctx)),
    }),
    route({
      method: 'DELETE',
      path: '/me/reviews/:id',
      auth: 'required',
      schema: { params: idParams },
      docs: { tags: ['Reviews'], summary: 'Delete your review' },
      handler: async (ctx) => {
        await s.reviews.remove(userIdOf(ctx), ctx.params.id);
        return reply.ok(null, 'Review deleted');
      },
    }),
    route({
      method: 'POST',
      path: '/reviews/:id/report',
      auth: 'required',
      schema: { params: idParams, body: reviewReportSchema },
      rateLimit: { name: 'reviews:report', windowSeconds: 3600, max: 30, by: 'user' },
      docs: { tags: ['Reviews'], summary: 'Report a review' },
      handler: async (ctx) => {
        await s.reviews.report(userIdOf(ctx), ctx.params.id, ctx.body.reason);
        return reply.ok(null, 'Thanks — our team will take a look');
      },
    }),
    route({
      method: 'POST',
      path: '/reviews/:id/helpful',
      auth: 'required',
      schema: { params: idParams },
      rateLimit: { name: 'reviews:helpful', windowSeconds: 3600, max: 100, by: 'user' },
      docs: { tags: ['Reviews'], summary: 'Mark a review helpful' },
      handler: async (ctx) => {
        await s.reviews.markHelpful(ctx.params.id);
        return reply.ok(null);
      },
    }),
  ];

  return [...cart, ...orders, ...account];
}
