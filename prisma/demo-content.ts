/**
 * Demo catalogue content shared by the seed and `pnpm db:refresh-demo`:
 *  • product illustrations (original SVG art rendered to WebP renditions)
 *  • sample customer ratings & reviews, clearly attributed to demo accounts
 *    (`*@demo.vyora.local`, marked "(demo)") so they are never mistaken for real customers.
 */
import sharp from 'sharp';
import type { Container } from '../src/bootstrap/container';
import { storeOptimizedImage } from '../src/infrastructure/storage';
import { artKindFor, productSvg } from './art/product-art';

export async function renderProductImages(c: Container, title: string, colorHint?: string) {
  const out = [];
  for (const angle of [0, 1]) {
    const png = await sharp(Buffer.from(productSvg(title, { angle, colorHint }))).png().toBuffer();
    out.push(await storeOptimizedImage(c.storage, 'products', png, 'image/png'));
  }
  return out;
}

/** Replace every product's images with freshly rendered illustrations. */
export async function refreshProductImages(c: Container, log = console.log) {
  const db = c.db;
  const products = await db.product.findMany({
    where: { deletedAt: null },
    select: { id: true, title: true, images: true, variants: { where: { deletedAt: null }, take: 1, orderBy: { sortOrder: 'asc' } } },
  });
  for (const p of products) {
    const opts = (p.variants[0]?.options ?? {}) as Record<string, string>;
    const imgs = await renderProductImages(c, p.title, opts.color);
    await db.$transaction([
      db.productImage.deleteMany({ where: { productId: p.id } }),
      db.productImage.createMany({ data: imgs.map((im, i) => ({ productId: p.id, url: im.url, storageKey: im.key, alt: p.title, sortOrder: i })) }),
    ]);
    for (const old of p.images) {
      if (old.storageKey) {
        await c.storage.delete(old.storageKey, 'public').catch(() => undefined);
        await c.storage.delete(old.storageKey.replace(/\.webp$/, '-sm.webp'), 'public').catch(() => undefined);
      }
    }
    log(`  ✔ ${artKindFor(p.title).padEnd(14)} ${p.title}`);
  }
  await c.cache.delPrefix('');
  return products.length;
}

const REVIEWERS = [
  'Aarav', 'Diya', 'Kabir', 'Ananya', 'Vihaan', 'Isha', 'Arjun', 'Meera', 'Rohan', 'Sara', 'Aditya', 'Nisha',
  'Karthik', 'Pooja', 'Farhan', 'Lakshmi', 'Siddharth', 'Tanvi', 'Rahul', 'Zoya', 'Harsh', 'Divya', 'Manav', 'Riya',
];

const TEXT: Record<string, Array<[string, string]>> = {
  electronics: [
    ['Value for money', 'Battery backup is excellent and the build feels premium for the price.'],
    ['Works as described', 'Setup took two minutes. Sound and display quality are better than expected.'],
    ['Good, minor gripes', 'Performance is smooth. Charger could have been faster, otherwise happy.'],
    ['Loving it', 'Using it daily for two weeks — no issues at all. Delivery was quick too.'],
  ],
  fashion: [
    ['Perfect fit', 'Fabric is soft and breathable. True to size, colour exactly as shown.'],
    ['Nice quality', 'Stitching is neat and it survived three washes without fading.'],
    ['Good buy', 'Looks great, slightly long for me but still very comfortable.'],
    ['Super comfortable', 'Wore it all day at a wedding, got many compliments!'],
  ],
  home: [
    ['Sturdy and useful', 'Good build quality and easy to clean. Looks lovely in my kitchen.'],
    ['Great value', 'Exactly what I needed. Packaging was careful and nothing was damaged.'],
    ['Pretty and practical', 'Adds a warm touch to the living room. Would buy again.'],
  ],
  grocery: [
    ['Fresh and tasty', 'Aroma and quality are top notch. Will reorder every month.'],
    ['Good quality', 'Well packed, good expiry date, tastes authentic.'],
  ],
  beauty: [
    ['Visible results', 'Skin feels hydrated and brighter after a week of use.'],
    ['Gentle and effective', 'No irritation on my sensitive skin. Lovely fragrance.'],
    ['Nice product', 'Texture is light and non-sticky. A little goes a long way.'],
  ],
  toys: [
    ['Kids love it', 'Bright colours, safe edges and keeps my daughter busy for hours.'],
    ['Well made', 'Sturdy and great for learning. Perfect gift.'],
  ],
};

const groupOf = (category: string) =>
  /electronic|mobile|laptop|audio|wearable|accessor/i.test(category)
    ? 'electronics'
    : /fashion|cloth|wear|footwear|shoe|bag|watch|jewel|sunglass/i.test(category)
      ? 'fashion'
      : /home|kitchen|cook|decor|furnish|storage/i.test(category)
        ? 'home'
        : /grocery|staple|snack|beverage/i.test(category)
          ? 'grocery'
          : /beauty|skin|makeup|hair|fragrance/i.test(category)
            ? 'beauty'
            : 'toys';

/** Seed approved sample reviews (3–9 per product) and recompute product/seller ratings. Idempotent. */
export async function seedDemoReviews(c: Container, log = console.log) {
  const db = c.db;
  const role = await db.role.findUniqueOrThrow({ where: { code: 'CUSTOMER' } });
  const hash = await c.services.auth.hashPassword(`Demo-${Date.now()}-reviewer!`);
  const reviewers = [];
  for (const [i, name] of REVIEWERS.entries()) {
    const email = `reviewer${i + 1}@demo.vyora.local`;
    const u =
      (await db.user.findUnique({ where: { email } })) ??
      (await db.user.create({
        data: { email, name: `${name} (demo)`, passwordHash: hash, emailVerifiedAt: new Date(), roles: { create: [{ roleId: role.id }] } },
      }));
    reviewers.push(u);
  }
  const products = await db.product.findMany({
    where: { deletedAt: null, status: 'APPROVED' },
    select: { id: true, title: true, ownerSellerId: true, category: { select: { name: true, parent: { select: { name: true } } } } },
  });
  let created = 0;
  for (const [pi, p] of products.entries()) {
    const existing = await db.review.count({ where: { productId: p.id, user: { email: { endsWith: '@demo.vyora.local' } } } });
    if (existing >= 3) continue;
    const texts = TEXT[groupOf(`${p.category.parent?.name ?? ''} ${p.category.name}`)];
    const n = 3 + ((pi * 7) % 7);
    const rows = [];
    for (let k = 0; k < n; k++) {
      const u = reviewers[(pi * 5 + k) % reviewers.length];
      const r = [5, 4, 5, 4, 3, 5, 4, 5, 2, 4][(pi + k * 3) % 10];
      const [title, body] = texts[(pi + k) % texts.length];
      rows.push({
        productId: p.id,
        userId: u.id,
        rating: r,
        title,
        body,
        status: 'APPROVED' as const,
        isVerifiedPurchase: false,
        helpfulCount: (pi * 3 + k * 7) % 40,
        createdAt: new Date(Date.now() - ((pi * 13 + k * 29) % 120) * 86400_000),
      });
    }
    const res = await db.review.createMany({ data: rows, skipDuplicates: true });
    created += res.count;
  }
  // Recompute rating aggregates.
  for (const p of products) {
    const agg = await db.review.aggregate({ where: { productId: p.id, status: 'APPROVED', deletedAt: null }, _avg: { rating: true }, _count: { _all: true } });
    await db.product.update({ where: { id: p.id }, data: { ratingAvg: Number((agg._avg.rating ?? 0).toFixed(2)), ratingCount: agg._count._all } });
  }
  const sellers = [...new Set(products.map((p) => p.ownerSellerId).filter(Boolean))] as string[];
  for (const sid of sellers) {
    const s = await db.review.aggregate({ where: { status: 'APPROVED', deletedAt: null, product: { ownerSellerId: sid } }, _avg: { rating: true }, _count: { _all: true } });
    await db.seller.update({ where: { id: sid }, data: { ratingAvg: Number((s._avg.rating ?? 0).toFixed(2)), ratingCount: s._count._all } });
  }
  await c.cache.delPrefix('');
  log(`  ✔ ${created} demo reviews added across ${products.length} products`);
  return created;
}

/** Remove all demo reviews/accounts (before going live). */
export async function removeDemoReviews(c: Container) {
  const db = c.db;
  const users = await db.user.findMany({ where: { email: { endsWith: '@demo.vyora.local' } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  const { count } = await db.review.deleteMany({ where: { userId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  const products = await db.product.findMany({ select: { id: true } });
  for (const p of products) {
    const agg = await db.review.aggregate({ where: { productId: p.id, status: 'APPROVED', deletedAt: null }, _avg: { rating: true }, _count: { _all: true } });
    await db.product.update({ where: { id: p.id }, data: { ratingAvg: Number((agg._avg.rating ?? 0).toFixed(2)), ratingCount: agg._count._all } });
  }
  return count;
}
