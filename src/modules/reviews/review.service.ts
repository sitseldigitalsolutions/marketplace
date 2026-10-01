import type { Prisma, PrismaClient, ReviewStatus } from '@prisma/client';
import type { StorageProvider } from '../../infrastructure/storage';
import { storeOptimizedImage } from '../../infrastructure/storage';
import type { UploadedFile } from '../../http/types';
import { businessRule, conflict, forbidden, notFound } from '../../shared/errors';
import { num } from '../../shared/money';
import { pageArgs, paginated } from '../../shared/pagination';
import { plainText } from '../../shared/text';
import type { AuditActor, AuditService } from '../audit/audit.service';
import type { SettingsService } from '../settings/settings.service';

export class ReviewService {
  constructor(
    private readonly db: PrismaClient,
    private readonly storage: StorageProvider,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  /** Recompute product & seller rating aggregates from approved reviews. */
  private async refreshRatings(productId: string) {
    const agg = await this.db.review.aggregate({
      where: { productId, status: 'APPROVED', deletedAt: null },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await this.db.product.update({
      where: { id: productId },
      data: { ratingAvg: Number((agg._avg.rating ?? 0).toFixed(2)), ratingCount: agg._count._all },
    });
    const owner = await this.db.product.findUnique({ where: { id: productId }, select: { ownerSellerId: true } });
    if (owner?.ownerSellerId) {
      const s = await this.db.review.aggregate({
        where: { status: 'APPROVED', deletedAt: null, product: { ownerSellerId: owner.ownerSellerId } },
        _avg: { rating: true },
        _count: { _all: true },
      });
      await this.db.seller.update({
        where: { id: owner.ownerSellerId },
        data: { ratingAvg: Number((s._avg.rating ?? 0).toFixed(2)), ratingCount: s._count._all },
      });
    }
  }

  /** Whether (and via which order item) the user may review this product. */
  async eligibility(userId: string, productId: string) {
    const [existing, item] = await Promise.all([
      this.db.review.findUnique({ where: { productId_userId: { productId, userId } } }),
      this.db.orderItem.findFirst({
        where: { productId, order: { customerId: userId }, sellerOrder: { status: 'DELIVERED' }, review: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      }),
    ]);
    const settings = await this.settings.get('reviews');
    return {
      canReview: !existing && (Boolean(item) || !settings.onlyVerifiedPurchasers),
      verifiedPurchase: Boolean(item),
      orderItemId: item?.id ?? null,
      existingReviewId: existing?.id ?? null,
    };
  }

  async create(
    userId: string,
    input: { productId: string; orderItemId?: string; rating: number; title?: string; body?: string },
    files: UploadedFile[],
  ) {
    const product = await this.db.product.findFirst({ where: { id: input.productId, deletedAt: null, status: 'APPROVED' } });
    if (!product) throw notFound('Product');
    const settings = await this.settings.get('reviews');
    // A verified purchase badge requires a delivered order item belonging to this user.
    let orderItemId: string | null = null;
    if (input.orderItemId) {
      const item = await this.db.orderItem.findFirst({
        where: { id: input.orderItemId, productId: input.productId, order: { customerId: userId }, sellerOrder: { status: 'DELIVERED' } },
        include: { review: true },
      });
      if (!item) throw forbidden('You can only review items from your delivered orders');
      if (item.review) throw conflict('You have already reviewed this purchase');
      orderItemId = item.id;
    } else {
      const eligible = await this.eligibility(userId, input.productId);
      orderItemId = eligible.orderItemId;
    }
    if (!orderItemId && settings.onlyVerifiedPurchasers) throw forbidden('Only customers who bought this product can review it');
    if (await this.db.review.findUnique({ where: { productId_userId: { productId: input.productId, userId } } })) {
      throw conflict('You have already reviewed this product');
    }
    if (files.length > 5) throw businessRule('You can attach at most 5 photos');
    const images = [];
    for (const f of files) images.push(await storeOptimizedImage(this.storage, 'reviews', f.buffer, f.mimeType));
    const review = await this.db.review.create({
      data: {
        productId: input.productId,
        userId,
        orderItemId,
        rating: input.rating,
        title: plainText(input.title) || null,
        body: plainText(input.body) || null,
        isVerifiedPurchase: Boolean(orderItemId),
        status: settings.requireModeration ? 'PENDING' : 'APPROVED',
        images: { create: images.map((i) => ({ url: i.url, storageKey: i.key })) },
      },
    });
    if (review.status === 'APPROVED') await this.refreshRatings(input.productId);
    return review;
  }

  async forProduct(productId: string, q: { page: number; pageSize: number; sort?: string; rating?: number; withPhotos?: boolean }) {
    const where: Prisma.ReviewWhereInput = {
      productId,
      status: 'APPROVED',
      deletedAt: null,
      ...(q.rating ? { rating: q.rating } : {}),
      ...(q.withPhotos ? { images: { some: {} } } : {}),
    };
    const orderBy: Prisma.ReviewOrderByWithRelationInput[] =
      q.sort === 'helpful'
        ? [{ helpfulCount: 'desc' }, { createdAt: 'desc' }]
        : q.sort === 'rating_high'
          ? [{ rating: 'desc' }]
          : q.sort === 'rating_low'
            ? [{ rating: 'asc' }]
            : [{ createdAt: 'desc' }];
    const [items, total] = await Promise.all([
      this.db.review.findMany({
        where,
        orderBy,
        ...pageArgs(q.page, q.pageSize),
        include: { images: true, user: { select: { name: true } } },
      }),
      this.db.review.count({ where }),
    ]);
    return paginated(
      items.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        isVerifiedPurchase: r.isVerifiedPurchase,
        helpfulCount: r.helpfulCount,
        createdAt: r.createdAt,
        author: r.user.name.split(' ')[0],
        images: r.images.map((i) => ({ id: i.id, url: i.url })),
      })),
      total,
      q.page,
      q.pageSize,
    );
  }

  mine(userId: string) {
    return this.db.review.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { title: true, slug: true } }, images: true },
    });
  }

  async remove(userId: string, reviewId: string) {
    const r = await this.db.review.findFirst({ where: { id: reviewId, userId, deletedAt: null } });
    if (!r) throw notFound('Review');
    await this.db.review.update({ where: { id: r.id }, data: { deletedAt: new Date(), orderItemId: null } });
    await this.refreshRatings(r.productId);
  }

  async report(userId: string, reviewId: string, reason: string) {
    const r = await this.db.review.findFirst({ where: { id: reviewId, status: 'APPROVED', deletedAt: null } });
    if (!r) throw notFound('Review');
    if (r.userId === userId) throw businessRule('You cannot report your own review');
    await this.db.reviewReport.upsert({
      where: { reviewId_userId: { reviewId, userId } },
      create: { reviewId, userId, reason },
      update: { reason, resolvedAt: null },
    });
  }

  async markHelpful(reviewId: string) {
    await this.db.review.updateMany({ where: { id: reviewId, status: 'APPROVED' }, data: { helpfulCount: { increment: 1 } } });
  }

  // ── Moderation ─────────────────────────────────────────────
  async moderationQueue(q: { page: number; pageSize: number; status?: ReviewStatus; reported?: boolean }) {
    const where: Prisma.ReviewWhereInput = {
      deletedAt: null,
      ...(q.status ? { status: q.status } : {}),
      ...(q.reported ? { reports: { some: { resolvedAt: null } } } : {}),
    };
    const [items, total] = await Promise.all([
      this.db.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(q.page, q.pageSize),
        include: {
          images: true,
          user: { select: { name: true, email: true } },
          product: { select: { id: true, title: true, slug: true } },
          reports: { where: { resolvedAt: null } },
        },
      }),
      this.db.review.count({ where }),
    ]);
    return paginated(items, total, q.page, q.pageSize);
  }

  async moderate(reviewId: string, status: 'APPROVED' | 'REJECTED' | 'REMOVED', note: string | undefined, actor: AuditActor) {
    const r = await this.db.review.findFirst({ where: { id: reviewId, deletedAt: null } });
    if (!r) throw notFound('Review');
    await this.db.review.update({ where: { id: reviewId }, data: { status, moderationNote: note ?? null } });
    await this.db.reviewReport.updateMany({ where: { reviewId, resolvedAt: null }, data: { resolvedAt: new Date() } });
    await this.audit.record(actor, { action: `review.${status.toLowerCase()}`, entityType: 'Review', entityId: reviewId, before: { status: r.status }, after: { status, note } });
    await this.refreshRatings(r.productId);
  }

  async stats() {
    const [pending, reported, avg] = await Promise.all([
      this.db.review.count({ where: { status: 'PENDING', deletedAt: null } }),
      this.db.review.count({ where: { deletedAt: null, reports: { some: { resolvedAt: null } } } }),
      this.db.review.aggregate({ where: { status: 'APPROVED', deletedAt: null }, _avg: { rating: true } }),
    ]);
    return { pending, reported, averageRating: num(avg._avg.rating ?? 0) };
  }
}
