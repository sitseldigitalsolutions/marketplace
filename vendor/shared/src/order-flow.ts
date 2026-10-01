import { OrderStatus } from './enums';

/**
 * Seller sub-order fulfillment state machine. The parent (customer-facing) order status is derived
 * from its sub-orders by `deriveParentStatus`.
 */
export const SELLER_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_CONFIRMATION: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  RETURN_REQUESTED: [],
  RETURN_APPROVED: [],
  RETURN_REJECTED: [],
  RETURNED: [],
  REFUND_PENDING: [],
  REFUNDED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return SELLER_ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Statuses from which a customer may still cancel (before hand-over to the carrier). */
export const CUSTOMER_CANCELLABLE: OrderStatus[] = ['PENDING_CONFIRMATION', 'CONFIRMED', 'PROCESSING'];

const PROGRESS_RANK: Partial<Record<OrderStatus, number>> = {
  PENDING_CONFIRMATION: 0,
  CONFIRMED: 1,
  PROCESSING: 2,
  SHIPPED: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
};

/**
 * Parent order status = least-advanced active sub-order. Fully cancelled → CANCELLED.
 * Return / refund states are tracked per item and per return request, not on the parent.
 */
export function deriveParentStatus(subStatuses: OrderStatus[]): OrderStatus {
  const active = subStatuses.filter((s) => s !== 'CANCELLED');
  if (active.length === 0) return OrderStatus.CANCELLED;
  let best: OrderStatus = active[0];
  for (const s of active) {
    const r = PROGRESS_RANK[s] ?? 5;
    if (r < (PROGRESS_RANK[best] ?? 5)) best = s;
  }
  return best;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_CONFIRMATION: 'Awaiting confirmation',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURN_REQUESTED: 'Return requested',
  RETURN_APPROVED: 'Return approved',
  RETURN_REJECTED: 'Return rejected',
  RETURNED: 'Returned',
  REFUND_PENDING: 'Refund pending',
  REFUNDED: 'Refunded',
};
