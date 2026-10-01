import type { Env } from './config/env';
import { createExpressAdapter } from './adapters/express';
import { createHapiAdapter } from './adapters/hapi';
import type { HttpAdapter } from './adapters/types';
import { createContainer, type Container } from './bootstrap/container';
import { createPipeline } from './http/pipeline';
import type { AnyRoute } from './http/types';
import { adminRoutes } from './modules/admin/admin.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { catalogRoutes } from './modules/catalog/catalog.routes';
import { customerRoutes } from './modules/customers/customer.routes';
import { sellerRoutes } from './modules/sellers/seller.routes';
import { systemRoutes } from './modules/system/system.routes';

export interface App {
  container: Container;
  adapter: HttpAdapter;
  routes: AnyRoute[];
  close(): Promise<void>;
}

/** Build the application for the configured framework. Business logic is identical for both. */
export async function createApp(env: Env, opts: { framework?: 'express' | 'hapi' } = {}): Promise<App> {
  const container = createContainer(env);
  const framework = opts.framework ?? env.BACKEND_FRAMEWORK;
  const adapter = framework === 'hapi' ? createHapiAdapter(env) : createExpressAdapter(env);

  const routes: AnyRoute[] = [];
  routes.push(
    ...systemRoutes(container, () => routes),
    ...authRoutes(container),
    ...catalogRoutes(container),
    ...customerRoutes(container),
    ...sellerRoutes(container),
    ...adminRoutes(container),
  );

  const pipeline = createPipeline({
    env,
    resolveAuth: (token) => container.services.auth.resolveAuth(token),
    rateLimitStore: container.rateLimitStore,
    onSecurityEvent: (type, info) =>
      container.services.audit.securityEvent(type, { ip: info.ip, userId: info.userId, details: info.details }),
  });

  await container.database.connect();
  await adapter.init(routes, pipeline);

  return {
    container,
    adapter,
    routes,
    async close() {
      await adapter.close().catch(() => undefined);
      await container.shutdown();
    },
  };
}
