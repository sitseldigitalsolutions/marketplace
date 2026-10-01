import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@vyora/shared';
import type { Container } from '../../bootstrap/container';
import { ACCESS_COOKIE, CSRF_COOKIE, REFRESH_COOKIE } from '../../http/pipeline';
import { reply, route } from '../../http/route';
import type { RequestContext } from '../../http/types';
import { randomToken } from '../../shared/crypto';
import { unauthenticated } from '../../shared/errors';
import type { IssuedSession } from './auth.service';
import { GUEST_CART_COOKIE } from '../cart/cart.service';

const tags = ['Auth'];
const REFRESH_PATH = '/api/v1/auth';

export function authRoutes(c: Container) {
  const setSession = async (ctx: RequestContext, s: IssuedSession) => {
    ctx.setCookie(ACCESS_COOKIE, s.accessToken, { maxAgeSeconds: s.accessMaxAgeSeconds });
    ctx.setCookie(REFRESH_COOKIE, s.refreshToken, { maxAgeSeconds: s.refreshMaxAgeSeconds, path: REFRESH_PATH });
    // Rotate the CSRF token on privilege change.
    ctx.setCookie(CSRF_COOKIE, randomToken(24), { httpOnly: false });
    // Merge an anonymous cart into the account.
    const guest = ctx.cookies[GUEST_CART_COOKIE];
    if (guest) {
      await c.services.cart.mergeGuestCart(guest, s.userId);
      ctx.clearCookie(GUEST_CART_COOKIE);
    }
    return c.services.auth.sessionUser(s.userId);
  };
  const clearSession = (ctx: RequestContext) => {
    ctx.clearCookie(ACCESS_COOKIE);
    ctx.clearCookie(REFRESH_COOKIE, { path: REFRESH_PATH });
  };
  const meta = (ctx: RequestContext) => ({ ip: ctx.ip, userAgent: ctx.userAgent });

  return [
    route({
      method: 'GET',
      path: '/auth/csrf',
      auth: 'public',
      docs: { tags, summary: 'Issue a CSRF token cookie (double-submit)' },
      handler: async (ctx) => {
        let token = ctx.cookies[CSRF_COOKIE];
        if (!token) {
          token = randomToken(24);
          ctx.setCookie(CSRF_COOKIE, token, { httpOnly: false });
        }
        return { csrfToken: token };
      },
    }),
    route({
      method: 'POST',
      path: '/auth/register',
      auth: 'public',
      schema: { body: registerSchema },
      rateLimit: { name: 'auth:register', windowSeconds: 3600, max: 20 },
      docs: { tags, summary: 'Register a customer account' },
      handler: async (ctx) => {
        const session = await c.services.auth.registerCustomer(ctx.body, meta(ctx));
        return reply.created(await setSession(ctx, session), 'Welcome aboard! Your account has been created.');
      },
    }),
    route({
      method: 'POST',
      path: '/auth/login',
      auth: 'public',
      schema: { body: loginSchema },
      rateLimit: { name: 'auth:login', windowSeconds: 60, max: 10 },
      docs: { tags, summary: 'Sign in with email and password' },
      handler: async (ctx) => {
        const session = await c.services.auth.login(ctx.body.email, ctx.body.password, meta(ctx));
        return reply.ok(await setSession(ctx, session), 'Signed in successfully');
      },
    }),
    route({
      method: 'POST',
      path: '/auth/refresh',
      auth: 'public',
      rateLimit: { name: 'auth:refresh', windowSeconds: 60, max: 60 },
      docs: { tags, summary: 'Rotate the refresh token and issue a new access token' },
      handler: async (ctx) => {
        const token = ctx.cookies[REFRESH_COOKIE];
        if (!token) throw unauthenticated('Your session has expired. Please sign in again.');
        try {
          const session = await c.services.auth.refresh(token, meta(ctx));
          ctx.setCookie(ACCESS_COOKIE, session.accessToken, { maxAgeSeconds: session.accessMaxAgeSeconds });
          ctx.setCookie(REFRESH_COOKIE, session.refreshToken, { maxAgeSeconds: session.refreshMaxAgeSeconds, path: REFRESH_PATH });
          return c.services.auth.sessionUser(session.userId);
        } catch (err) {
          clearSession(ctx);
          throw err;
        }
      },
    }),
    route({
      method: 'POST',
      path: '/auth/logout',
      auth: 'optional',
      docs: { tags, summary: 'Sign out and revoke the session' },
      handler: async (ctx) => {
        await c.services.auth.logout(ctx.cookies[REFRESH_COOKIE], ctx.auth);
        clearSession(ctx);
        return reply.ok(null, 'Signed out');
      },
    }),
    route({
      method: 'GET',
      path: '/auth/me',
      auth: 'required',
      docs: { tags, summary: 'Current user with roles, permissions and seller account' },
      handler: async (ctx) => c.services.auth.sessionUser(ctx.auth!.userId),
    }),
    route({
      method: 'POST',
      path: '/auth/forgot-password',
      auth: 'public',
      schema: { body: forgotPasswordSchema },
      rateLimit: { name: 'auth:forgot', windowSeconds: 900, max: 5 },
      docs: { tags, summary: 'Email a password reset link' },
      handler: async (ctx) => {
        await c.services.auth.forgotPassword(ctx.body.email, meta(ctx));
        return reply.ok(null, 'If an account exists for this email, a reset link is on its way.');
      },
    }),
    route({
      method: 'POST',
      path: '/auth/reset-password',
      auth: 'public',
      schema: { body: resetPasswordSchema },
      rateLimit: { name: 'auth:reset', windowSeconds: 900, max: 10 },
      docs: { tags, summary: 'Set a new password using a reset or invitation token' },
      handler: async (ctx) => {
        const session = await c.services.auth.resetPassword(ctx.body.token, ctx.body.password, meta(ctx));
        return reply.ok(await setSession(ctx, session), 'Your password has been updated');
      },
    }),
    route({
      method: 'POST',
      path: '/auth/verify-email',
      auth: 'public',
      schema: { body: verifyEmailSchema },
      rateLimit: { name: 'auth:verify', windowSeconds: 900, max: 20 },
      docs: { tags, summary: 'Confirm an email address' },
      handler: async (ctx) => {
        await c.services.auth.verifyEmail(ctx.body.token);
        return reply.ok(null, 'Your email address is verified');
      },
    }),
    route({
      method: 'POST',
      path: '/auth/resend-verification',
      auth: 'required',
      rateLimit: { name: 'auth:resend', windowSeconds: 900, max: 3, by: 'user' },
      docs: { tags, summary: 'Resend the email verification link' },
      handler: async (ctx) => {
        await c.services.auth.sendVerificationEmail(ctx.auth!.userId);
        return reply.ok(null, 'Verification email sent');
      },
    }),
    route({
      method: 'POST',
      path: '/auth/change-password',
      auth: 'required',
      schema: { body: changePasswordSchema },
      rateLimit: { name: 'auth:change', windowSeconds: 900, max: 10, by: 'user' },
      docs: { tags, summary: 'Change password (signs out other devices)' },
      handler: async (ctx) => {
        await c.services.auth.changePassword(
          ctx.auth!.userId,
          ctx.body.currentPassword,
          ctx.body.newPassword,
          meta(ctx),
          ctx.auth!.sessionId,
        );
        return reply.ok(null, 'Password changed. Other devices have been signed out.');
      },
    }),
  ];
}
