/**
 * Built-in notification templates. Admins can override any of them (NotificationTemplate table);
 * these defaults are used when no override exists. Variables use {{name}} syntax.
 */
export interface TemplateDef {
  subject: string;
  body: string;
  /** Channels delivered by default for this event. */
  channels: Array<'IN_APP' | 'EMAIL' | 'SMS'>;
  description: string;
}

export const DEFAULT_TEMPLATES: Record<string, TemplateDef> = {
  'auth.welcome': {
    subject: 'Welcome to {{brand}}, {{name}}!',
    body: 'Hi {{name}}, your {{brand}} account is ready. Start exploring thousands of products from trusted sellers.',
    channels: ['IN_APP', 'EMAIL'],
    description: 'Customer registration',
  },
  'auth.verify_email': {
    subject: 'Verify your email for {{brand}}',
    body: 'Hi {{name}}, please confirm your email address by opening this link: {{link}}\nThe link expires in 24 hours.',
    channels: ['EMAIL'],
    description: 'Email verification link',
  },
  'auth.password_reset': {
    subject: 'Reset your {{brand}} password',
    body: 'Hi {{name}}, we received a request to reset your password. Open this link to choose a new one: {{link}}\nThe link expires in 1 hour. If you did not request this, you can ignore this email.',
    channels: ['EMAIL'],
    description: 'Password reset link',
  },
  'seller.invite': {
    subject: 'You have been invited to sell on {{brand}}',
    body: 'Hi {{name}}, a seller account for {{businessName}} has been created for you. Set your password here: {{link}}\nThe link expires in 72 hours.',
    channels: ['EMAIL'],
    description: 'Admin-created seller invitation',
  },
  'seller.registered': {
    subject: 'We received your seller application',
    body: 'Hi {{name}}, thanks for registering {{businessName}} on {{brand}}. Our team will review your application shortly.',
    channels: ['IN_APP', 'EMAIL'],
    description: 'Seller registration (to seller)',
  },
  'seller.registered_admin': {
    subject: 'New seller application: {{businessName}}',
    body: '{{businessName}} ({{email}}) has applied to sell on {{brand}} and is awaiting approval.',
    channels: ['IN_APP'],
    description: 'Seller registration (to admins)',
  },
  'seller.approved': {
    subject: 'Your seller account is approved 🎉',
    body: 'Congratulations {{name}}! {{businessName}} is now approved on {{brand}}. You can start listing products from your seller dashboard.',
    channels: ['IN_APP', 'EMAIL'],
    description: 'Seller approval',
  },
  'seller.rejected': {
    subject: 'Update on your seller application',
    body: 'Hi {{name}}, unfortunately we could not approve {{businessName}} at this time. Reason: {{reason}}',
    channels: ['IN_APP', 'EMAIL'],
    description: 'Seller rejection',
  },
  'seller.suspended': {
    subject: 'Your seller account has been suspended',
    body: 'Hi {{name}}, {{businessName}} has been suspended. Reason: {{reason}}. Contact support for help.',
    channels: ['IN_APP', 'EMAIL'],
    description: 'Seller suspension',
  },
  'seller.reactivated': {
    subject: 'Your seller account is active again',
    body: 'Hi {{name}}, {{businessName}} has been reactivated on {{brand}}.',
    channels: ['IN_APP', 'EMAIL'],
    description: 'Seller reactivation',
  },
  'product.approved': {
    subject: 'Product approved: {{productName}}',
    body: '"{{productName}}" has been approved and is now live on {{brand}}.',
    channels: ['IN_APP', 'EMAIL'],
    description: 'Product approval',
  },
  'product.rejected': {
    subject: 'Product needs changes: {{productName}}',
    body: '"{{productName}}" was not approved. Reason: {{reason}}. Update the listing and resubmit it for review.',
    channels: ['IN_APP', 'EMAIL'],
    description: 'Product rejection',
  },
  'order.placed': {
    subject: 'Order {{orderNumber}} placed successfully',
    body: 'Hi {{name}}, thank you for shopping with {{brand}}! Your order {{orderNumber}} of {{amount}} has been placed. Payment: Cash on Delivery.',
    channels: ['IN_APP', 'EMAIL'],
    description: 'Order placed (customer)',
  },
  'order.new_for_seller': {
    subject: 'New order {{subOrderNumber}}',
    body: 'You have a new order {{subOrderNumber}} with {{itemCount}} item(s) worth {{amount}}. Please confirm it from your dashboard.',
    channels: ['IN_APP', 'EMAIL'],
    description: 'New order (seller)',
  },
  'order.status_changed': {
    subject: 'Your order {{orderNumber}} is {{status}}',
    body: 'Hi {{name}}, items from {{sellerName}} in order {{orderNumber}} are now {{status}}. {{note}}',
    channels: ['IN_APP', 'EMAIL'],
    description: 'Order status update (customer)',
  },
  'order.shipped': {
    subject: 'Shipped: order {{orderNumber}}',
    body: 'Good news {{name}}! Items from {{sellerName}} have shipped via {{carrier}}. Tracking number: {{trackingNumber}}.',
    channels: ['IN_APP', 'EMAIL', 'SMS'],
    description: 'Shipment update',
  },
  'order.delivered': {
    subject: 'Delivered: order {{orderNumber}}',
    body: 'Hi {{name}}, your items from {{sellerName}} have been delivered. We hope you love them — leave a review!',
    channels: ['IN_APP', 'EMAIL'],
    description: 'Delivery confirmation',
  },
  'order.cancelled': {
    subject: 'Order {{orderNumber}} cancelled',
    body: 'Items in order {{orderNumber}} have been cancelled. Reason: {{reason}}',
    channels: ['IN_APP', 'EMAIL'],
    description: 'Cancellation (customer)',
  },
  'order.cancelled_seller': {
    subject: 'Order {{subOrderNumber}} cancelled by customer',
    body: 'The customer cancelled {{subOrderNumber}}. Reason: {{reason}}',
    channels: ['IN_APP'],
    description: 'Cancellation (seller)',
  },
  'return.requested': {
    subject: 'Return requested for {{subOrderNumber}}',
    body: 'A customer requested a return ({{returnNumber}}) for {{subOrderNumber}}. Reason: {{reason}}',
    channels: ['IN_APP', 'EMAIL'],
    description: 'Return request (seller)',
  },
  'return.updated': {
    subject: 'Return {{returnNumber}} {{status}}',
    body: 'Hi {{name}}, your return {{returnNumber}} is now {{status}}. {{note}}',
    channels: ['IN_APP', 'EMAIL'],
    description: 'Return update (customer)',
  },
  'settlement.updated': {
    subject: 'Settlement {{settlementNumber}} {{status}}',
    body: 'Settlement {{settlementNumber}} of {{amount}} is now {{status}}. {{reference}}',
    channels: ['IN_APP', 'EMAIL'],
    description: 'Settlement status (seller)',
  },
  'inventory.low_stock': {
    subject: 'Low stock: {{sku}}',
    body: '{{productName}} ({{sku}}) has only {{available}} unit(s) left.',
    channels: ['IN_APP', 'EMAIL'],
    description: 'Low-stock alert (seller)',
  },
  'stock.back_in_stock': {
    subject: 'Back in stock: {{productName}}',
    body: '{{productName}} is available again on {{brand}}. Grab it before it sells out!',
    channels: ['IN_APP', 'EMAIL'],
    description: 'Availability notification (customer)',
  },
};

export function render(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => {
    const v = vars[k];
    return v === undefined || v === null ? '' : String(v);
  });
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
