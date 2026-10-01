import type { SettingsRepository } from '../../database/interfaces/repositories';

/** Marketplace configuration with typed defaults. Stored values (SystemSetting) override defaults. */
export const DEFAULT_SETTINGS = {
  branding: {
    name: 'Vyora',
    tagline: 'Everything you love, from sellers you trust',
    logoUrl: null as string | null,
    primaryColor: '#5B3DF5',
    accentColor: '#FF6B4A',
    announcement: 'Free delivery on orders above ₹499 · Cash on Delivery available across India',
    supportEmail: 'support@vyora.local',
    supportPhone: '1800-000-0000',
  },
  catalog: {
    /** When an APPROVED product is edited by its seller, send it back to review. */
    productChangesRequireReapproval: true,
    /** New offers by other sellers on an already-approved catalog product skip review. */
    autoApproveListingsOnApprovedProducts: false,
  },
  orders: {
    /** Automatically confirm new sub-orders instead of waiting for seller acceptance. */
    autoConfirm: false,
    /** Sub-orders still unconfirmed after this many hours are flagged in admin. */
    confirmationSlaHours: 24,
  },
  cod: {
    enabled: true,
    minOrderValue: 0,
    maxOrderValue: 50000,
    fee: 0,
    restrictedCategoryIds: [] as string[],
  },
  sellers: {
    /** Suspended sellers may keep fulfilling already-confirmed orders (never accept new ones). */
    suspendedCanFulfillExisting: true,
  },
  commission: {
    /** GST charged by the marketplace on its commission, deducted from seller payouts. */
    taxRate: 18,
  },
  returns: {
    enabled: true,
  },
  reviews: {
    requireModeration: true,
    onlyVerifiedPurchasers: false,
  },
  tax: {
    /** Listing prices include GST (Indian retail convention). */
    pricesInclusive: true,
    defaultRate: 18,
  },
};

export type Settings = typeof DEFAULT_SETTINGS;
export type SettingKey = keyof Settings;
export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as SettingKey[];

export class SettingsService {
  private cache: { value: Settings; at: number } | null = null;
  constructor(private readonly repo: SettingsRepository) {}

  async all(): Promise<Settings> {
    if (this.cache && Date.now() - this.cache.at < 5000) return this.cache.value;
    const stored = await this.repo.getAll();
    const merged = structuredClone(DEFAULT_SETTINGS) as Settings;
    for (const key of SETTING_KEYS) {
      const v = stored[key];
      if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(merged[key], v);
    }
    this.cache = { value: merged, at: Date.now() };
    return merged;
  }

  async get<K extends SettingKey>(key: K): Promise<Settings[K]> {
    return (await this.all())[key];
  }

  /** Shallow-merge a partial update into one settings group. Unknown fields are dropped. */
  async update<K extends SettingKey>(key: K, patch: Partial<Settings[K]>, actorId?: string) {
    const current = await this.get(key);
    const allowed = Object.keys(DEFAULT_SETTINGS[key]);
    const next = { ...current } as Record<string, unknown>;
    for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
      if (!allowed.includes(k)) continue;
      const def = (DEFAULT_SETTINGS[key] as Record<string, unknown>)[k];
      if (def !== null && v !== null && typeof def !== typeof v) continue;
      next[k] = v;
    }
    await this.repo.set(key, next, actorId);
    this.cache = null;
    return next as Settings[K];
  }

  invalidate() {
    this.cache = null;
  }
}
