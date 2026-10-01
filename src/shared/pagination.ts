import type { Paginated } from '@vyora/shared';

export const pageArgs = (page: number, pageSize: number) => ({ skip: (page - 1) * pageSize, take: pageSize });

export function paginated<T>(items: T[], total: number, page: number, pageSize: number): Paginated<T> {
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
