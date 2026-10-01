/**
 * Development seed. Idempotent for reference data (roles, permissions, categories, brands,
 * settings); demo data (sellers, products, customers, orders) is created only when missing.
 *
 *   pnpm db:seed
 */
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, type ProductUpsertInput } from '@vyora/shared';
import { loadEnv } from '../src/config/env';
import { createContainer } from '../src/bootstrap/container';
import { slugify } from '../src/shared/text';
import type { AuditActor } from '../src/modules/audit/audit.service';
import { renderProductImages, seedDemoReviews } from './demo-content';

const env = loadEnv();
const c = createContainer(env);
const db = c.db;
const s = c.services;
const system = { auth: null, ip: '127.0.0.1', userAgent: 'seed' };

function hash(str: string) {
  let h = 0;
  for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

async function upsertRolesAndAdmin() {
  for (const code of ALL_PERMISSIONS) {
    await db.permission.upsert({ where: { code }, create: { code }, update: {} });
  }
  const perms = await db.permission.findMany();
  const roleDefs = [
    { code: 'ADMIN', name: 'Administrator', description: 'Full marketplace control' },
    { code: 'SELLER', name: 'Seller', description: 'Manages own store, products and orders' },
    { code: 'CUSTOMER', name: 'Customer', description: 'Shops on the marketplace' },
  ] as const;
  for (const r of roleDefs) {
    const role = await db.role.upsert({ where: { code: r.code }, create: { ...r, isSystem: true }, update: { name: r.name, description: r.description } });
    const existing = await db.rolePermission.count({ where: { roleId: role.id } });
    if (existing === 0) {
      const wanted = DEFAULT_ROLE_PERMISSIONS[r.code];
      await db.rolePermission.createMany({
        data: perms.filter((p) => wanted.includes(p.code as never)).map((p) => ({ roleId: role.id, permissionId: p.id })),
        skipDuplicates: true,
      });
    }
  }
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@vyora.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345';
  const adminRole = await db.role.findUniqueOrThrow({ where: { code: 'ADMIN' } });
  const customerRole = await db.role.findUniqueOrThrow({ where: { code: 'CUSTOMER' } });
  const admin = await db.user.upsert({
    where: { email },
    create: {
      email,
      name: 'Marketplace Admin',
      passwordHash: await s.auth.hashPassword(password),
      emailVerifiedAt: new Date(),
      roles: { create: [{ roleId: adminRole.id }, { roleId: customerRole.id }] },
      customerProfile: { create: {} },
    },
    update: {},
  });
  console.log(`✔ admin: ${email} / ${password}`);
  return admin;
}

interface CatDef {
  name: string;
  icon: string;
  tax?: number;
  commission?: number;
  children: string[];
}

const CATEGORIES: CatDef[] = [
  { name: 'Electronics', icon: 'laptop', tax: 18, commission: 7, children: ['Mobiles', 'Laptops', 'Audio', 'Wearables', 'Accessories'] },
  { name: 'Fashion', icon: 'shirt', tax: 12, commission: 15, children: ["Men's Clothing", "Women's Clothing", 'Kids Wear', 'Ethnic Wear'] },
  { name: 'Home & Kitchen', icon: 'home', tax: 18, commission: 12, children: ['Cookware', 'Home Decor', 'Furnishing', 'Storage'] },
  { name: 'Beauty', icon: 'sparkles', tax: 18, commission: 14, children: ['Skincare', 'Makeup', 'Haircare', 'Fragrances'] },
  { name: 'Grocery', icon: 'basket', tax: 5, commission: 6, children: ['Staples', 'Snacks', 'Beverages'] },
  { name: 'Footwear', icon: 'footprints', tax: 12, commission: 14, children: ["Men's Shoes", "Women's Footwear", 'Sports Shoes'] },
  { name: 'Accessories', icon: 'watch', tax: 18, commission: 16, children: ['Bags', 'Watches', 'Jewellery', 'Sunglasses'] },
  { name: 'Toys', icon: 'puzzle', tax: 12, commission: 12, children: ['Learning Toys', 'Soft Toys', 'Outdoor Play'] },
];

async function seedCatalogReference() {
  const map = new Map<string, string>();
  for (const [i, def] of CATEGORIES.entries()) {
    const slug = slugify(def.name);
    let root = await db.category.findUnique({ where: { slug } });
    if (!root) root = await s.catalog.createCategory({ name: def.name, slug, icon: def.icon, sortOrder: i, isActive: true, taxRate: def.tax, commissionPercent: def.commission }, system);
    map.set(def.name, root.id);
    for (const [j, child] of def.children.entries()) {
      const cslug = slugify(child);
      let cat = await db.category.findUnique({ where: { slug: cslug } });
      if (!cat) cat = await s.catalog.createCategory({ name: child, slug: cslug, parentId: root.id, sortOrder: j, isActive: true }, system);
      map.set(child, cat.id);
    }
  }
  // Attributes: global variant axes + category-specific filters.
  const attrs: Array<{ code: string; name: string; type: 'SELECT' | 'TEXT'; options: string[]; axis?: boolean; category?: string }> = [
    { code: 'color', name: 'Colour', type: 'SELECT', options: ['Black', 'White', 'Blue', 'Red', 'Green', 'Pink', 'Grey', 'Beige', 'Yellow'], axis: true },
    { code: 'size', name: 'Size', type: 'SELECT', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '6', '7', '8', '9', '10'], axis: true },
    { code: 'storage', name: 'Storage', type: 'SELECT', options: ['64 GB', '128 GB', '256 GB', '512 GB'], axis: true },
    { code: 'material', name: 'Material', type: 'SELECT', options: ['Cotton', 'Polyester', 'Silk', 'Linen', 'Denim', 'Leather', 'Stainless Steel', 'Wood', 'Plastic'] },
    { code: 'ram', name: 'RAM', type: 'SELECT', options: ['4 GB', '6 GB', '8 GB', '12 GB', '16 GB'], category: 'Electronics' },
    { code: 'connectivity', name: 'Connectivity', type: 'SELECT', options: ['Bluetooth', 'Wired', 'Wi-Fi', '5G'], category: 'Electronics' },
    { code: 'skin_type', name: 'Skin type', type: 'SELECT', options: ['All', 'Oily', 'Dry', 'Sensitive', 'Combination'], category: 'Beauty' },
    { code: 'age_group', name: 'Age group', type: 'SELECT', options: ['0-2 years', '3-5 years', '6-8 years', '9+ years'], category: 'Toys' },
  ];
  for (const a of attrs) {
    const categoryId = a.category ? map.get(a.category)! : null;
    const existing = await db.productAttribute.findFirst({ where: { code: a.code, categoryId } });
    if (!existing) {
      await s.catalog.createAttribute({ code: a.code, name: a.name, type: a.type, options: a.options, categoryId, isFilterable: true, isVariantAxis: Boolean(a.axis), isRequired: false }, system);
    }
  }
  const brandNames = ['Nimbus', 'Aurora Audio', 'Kavya', 'UrbanThread', 'Ethnica', 'Casa Loom', 'ChefCraft', 'Glowveda', 'PureLeaf', 'Stride', 'TimeWise', 'Playnest', 'Voltix', 'Monsoon Home', 'Terra Bags'];
  const brands = new Map<string, string>();
  for (const name of brandNames) {
    const slug = slugify(name);
    const b = (await db.brand.findUnique({ where: { slug } })) ?? (await s.catalog.createBrand({ name, slug, isActive: true }, system));
    brands.set(name, b.id);
  }
  // Shipping, tax default, COD pincode sample
  await s.shipping.upsertMethod({ method: 'STANDARD', label: 'Standard delivery', baseFee: 40, freeAbove: 499, minDays: 3, maxDays: 7, isActive: true }, system);
  await s.shipping.upsertMethod({ method: 'EXPRESS', label: 'Express delivery', baseFee: 99, freeAbove: 1999, minDays: 1, maxDays: 3, isActive: true }, system);
  if (!(await db.taxConfiguration.findFirst({ where: { categoryId: null } }))) {
    await s.tax.create({ name: 'Default GST 18%', rate: 18, isInclusive: true, isActive: true, categoryId: null }, system);
  }
  if (!(await db.commissionRule.findFirst({ where: { scope: 'GLOBAL' } }))) {
    await s.finance.createRule({ scope: 'GLOBAL', percentage: env.COMMISSION_DEFAULT_PERCENTAGE, fixedAmount: 0, isActive: true }, system);
  }
  return { categories: map, brands };
}

const SELLERS = [
  { name: 'Ananya Rao', email: 'seller.nimbus@vyora.local', phone: '9876500001', business: 'Nimbus Electronics Hub', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', pan: 'ABCPR1234K', gstin: '29ABCPR1234K1Z5', featured: true },
  { name: 'Rohit Mehra', email: 'seller.threads@vyora.local', phone: '9876500002', business: 'UrbanThread Fashions', city: 'Jaipur', state: 'Rajasthan', pincode: '302001', pan: 'BCDPM2345L', gstin: '08BCDPM2345L1Z2', featured: true },
  { name: 'Fatima Khan', email: 'seller.casa@vyora.local', phone: '9876500003', business: 'Casa Loom Living', city: 'Pune', state: 'Maharashtra', pincode: '411001', pan: 'CDEPK3456M', gstin: '27CDEPK3456M1Z9', featured: true },
  { name: 'Suresh Iyer', email: 'seller.glow@vyora.local', phone: '9876500004', business: 'Glowveda Naturals', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001', pan: 'DEFPI4567N', gstin: '33DEFPI4567N1Z3', featured: false },
];

type P = { title: string; cat: string; brand: string; price: number; mrp: number; stock: number; desc: string; hl: string[]; specs: Array<[string, string]>; variants?: Array<Record<string, string>>; tags?: string[] };

const PRODUCTS: Record<string, P[]> = {
  'seller.nimbus@vyora.local': [
    { title: 'Nimbus X5 5G Smartphone', cat: 'Mobiles', brand: 'Nimbus', price: 18999, mrp: 22999, stock: 40, desc: 'A fast 5G smartphone with a 120Hz AMOLED display, 50MP camera and a 5000mAh battery that lasts all day.', hl: ['6.6" 120Hz AMOLED', '50MP dual camera', '5000mAh, 33W fast charging'], specs: [['Display', '6.6 inch AMOLED'], ['Battery', '5000 mAh'], ['Processor', 'Octa-core 2.4GHz']], variants: [{ storage: '128 GB', color: 'Black' }, { storage: '256 GB', color: 'Black' }, { storage: '128 GB', color: 'Blue' }], tags: ['phone', '5g', 'android'] },
    { title: 'Nimbus Lite 4G Phone', cat: 'Mobiles', brand: 'Nimbus', price: 8499, mrp: 10999, stock: 60, desc: 'Affordable everyday smartphone with a large display and dependable battery life.', hl: ['6.5" HD+ display', '13MP camera', '5000mAh'], specs: [['Display', '6.5 inch LCD'], ['RAM', '4 GB']], tags: ['phone', 'budget'] },
    { title: 'Voltix Pro 14 Laptop', cat: 'Laptops', brand: 'Voltix', price: 54990, mrp: 69990, stock: 12, desc: 'Thin and light 14-inch laptop with 16GB RAM, 512GB SSD and a full-HD IPS display for work and play.', hl: ['16GB RAM, 512GB SSD', '14" FHD IPS', '1.3 kg'], specs: [['Processor', '8-core'], ['Weight', '1.3 kg'], ['OS', 'Windows 11']], tags: ['laptop', 'notebook'] },
    { title: 'Voltix Chromebook 11', cat: 'Laptops', brand: 'Voltix', price: 19990, mrp: 24990, stock: 18, desc: 'Lightweight Chromebook ideal for students, with all-day battery and instant boot.', hl: ['11.6" display', '10-hour battery'], specs: [['Storage', '64 GB eMMC']], tags: ['laptop', 'student'] },
    { title: 'Aurora Audio Wireless Earbuds', cat: 'Audio', brand: 'Aurora Audio', price: 1799, mrp: 3999, stock: 150, desc: 'True wireless earbuds with active noise cancellation, 30 hour playback and low-latency gaming mode.', hl: ['Active noise cancellation', '30h total playback', 'IPX5 water resistant'], specs: [['Connectivity', 'Bluetooth 5.3'], ['Playback', '30 hours']], variants: [{ color: 'Black' }, { color: 'White' }], tags: ['earbuds', 'tws', 'headphones'] },
    { title: 'Aurora Audio Over-Ear Headphones', cat: 'Audio', brand: 'Aurora Audio', price: 3499, mrp: 5999, stock: 45, desc: 'Comfortable over-ear headphones with deep bass, 40mm drivers and foldable design.', hl: ['40mm drivers', '50h battery'], specs: [['Connectivity', 'Bluetooth + AUX']], tags: ['headphones'] },
    { title: 'Aurora Audio Portable Speaker', cat: 'Audio', brand: 'Aurora Audio', price: 2299, mrp: 3499, stock: 3, desc: 'Rugged portable Bluetooth speaker with 360° sound and 12 hours of playtime.', hl: ['360° sound', 'IPX7 waterproof'], specs: [['Output', '20W']], tags: ['speaker', 'bluetooth'] },
    { title: 'Nimbus Fit Smartwatch', cat: 'Wearables', brand: 'Nimbus', price: 2999, mrp: 5999, stock: 70, desc: 'Fitness smartwatch with heart-rate, SpO2, sleep tracking and 100+ sports modes.', hl: ['1.8" AMOLED', 'SpO2 & heart rate', '10-day battery'], specs: [['Water resistance', '5 ATM']], variants: [{ color: 'Black' }, { color: 'Pink' }], tags: ['smartwatch', 'fitness'] },
    { title: 'Voltix 20000mAh Power Bank', cat: 'Accessories', brand: 'Voltix', price: 1499, mrp: 2499, stock: 90, desc: 'High-capacity power bank with 22.5W fast charging and dual USB outputs.', hl: ['20000 mAh', '22.5W fast charge'], specs: [['Ports', 'USB-C + 2× USB-A']], tags: ['power bank', 'charger'] },
    { title: 'Voltix Braided USB-C Cable (1.5m)', cat: 'Accessories', brand: 'Voltix', price: 299, mrp: 699, stock: 300, desc: 'Durable braided USB-C cable supporting 60W fast charging and data transfer.', hl: ['60W charging', 'Nylon braided'], specs: [['Length', '1.5 m']], tags: ['cable', 'usb-c'] },
  ],
  'seller.threads@vyora.local': [
    { title: 'UrbanThread Men Slim Fit Cotton Shirt', cat: "Men's Clothing", brand: 'UrbanThread', price: 699, mrp: 1499, stock: 120, desc: 'Breathable pure cotton slim fit shirt, perfect for office and casual outings.', hl: ['100% cotton', 'Slim fit', 'Machine wash'], specs: [['Fabric', 'Cotton'], ['Fit', 'Slim']], variants: [{ size: 'M', color: 'Blue' }, { size: 'L', color: 'Blue' }, { size: 'XL', color: 'Blue' }, { size: 'M', color: 'White' }, { size: 'L', color: 'White' }], tags: ['shirt', 'formal'] },
    { title: 'UrbanThread Men Denim Jeans', cat: "Men's Clothing", brand: 'UrbanThread', price: 999, mrp: 2199, stock: 80, desc: 'Stretchable mid-rise denim jeans with a comfortable tapered fit.', hl: ['Stretch denim', 'Tapered fit'], specs: [['Fabric', 'Denim']], variants: [{ size: 'M' }, { size: 'L' }, { size: 'XL' }], tags: ['jeans', 'denim'] },
    { title: 'UrbanThread Women Floral Maxi Dress', cat: "Women's Clothing", brand: 'UrbanThread', price: 899, mrp: 1999, stock: 65, desc: 'Flowy floral maxi dress in soft rayon with a flattering waist tie.', hl: ['Soft rayon', 'Waist tie', 'Ankle length'], specs: [['Fabric', 'Rayon']], variants: [{ size: 'S' }, { size: 'M' }, { size: 'L' }], tags: ['dress', 'summer'] },
    { title: 'UrbanThread Women Oversized Hoodie', cat: "Women's Clothing", brand: 'UrbanThread', price: 799, mrp: 1599, stock: 50, desc: 'Cosy fleece-lined oversized hoodie for chilly evenings.', hl: ['Fleece lined', 'Kangaroo pocket'], specs: [['Fabric', 'Cotton blend']], variants: [{ size: 'S', color: 'Grey' }, { size: 'M', color: 'Grey' }, { size: 'M', color: 'Pink' }], tags: ['hoodie', 'winter'] },
    { title: 'Kavya Women Cotton Kurta Set', cat: 'Ethnic Wear', brand: 'Kavya', price: 1199, mrp: 2799, stock: 70, desc: 'Hand block printed cotton kurta with palazzo and dupatta.', hl: ['Hand block print', '3-piece set'], specs: [['Fabric', 'Cotton']], variants: [{ size: 'S' }, { size: 'M' }, { size: 'L' }, { size: 'XL' }], tags: ['kurta', 'ethnic'] },
    { title: 'Ethnica Men Silk Blend Kurta', cat: 'Ethnic Wear', brand: 'Ethnica', price: 1299, mrp: 2499, stock: 40, desc: 'Festive silk blend kurta with mandarin collar — perfect for weddings and festivals.', hl: ['Silk blend', 'Mandarin collar'], specs: [['Fabric', 'Silk blend']], variants: [{ size: 'M' }, { size: 'L' }, { size: 'XL' }], tags: ['kurta', 'festive'] },
    { title: 'UrbanThread Kids Printed T-Shirt Pack of 3', cat: 'Kids Wear', brand: 'UrbanThread', price: 549, mrp: 999, stock: 90, desc: 'Soft cotton printed t-shirts for kids, pack of three fun designs.', hl: ['Pack of 3', 'Soft cotton'], specs: [['Fabric', 'Cotton']], tags: ['kids', 't-shirt'] },
    { title: 'Stride Men Running Shoes', cat: 'Sports Shoes', brand: 'Stride', price: 1799, mrp: 3499, stock: 55, desc: 'Lightweight running shoes with breathable mesh upper and cushioned sole.', hl: ['Breathable mesh', 'Cushioned sole'], specs: [['Sole', 'EVA']], variants: [{ size: '7' }, { size: '8' }, { size: '9' }, { size: '10' }], tags: ['shoes', 'running'] },
    { title: 'Stride Women Casual Sneakers', cat: "Women's Footwear", brand: 'Stride', price: 1299, mrp: 2499, stock: 45, desc: 'Everyday white sneakers with memory foam insole.', hl: ['Memory foam', 'Vegan leather'], specs: [['Upper', 'PU']], variants: [{ size: '6' }, { size: '7' }, { size: '8' }], tags: ['sneakers'] },
    { title: 'Stride Men Leather Formal Shoes', cat: "Men's Shoes", brand: 'Stride', price: 1999, mrp: 3999, stock: 0, desc: 'Genuine leather oxford shoes with a classic polished finish.', hl: ['Genuine leather', 'Cushioned insole'], specs: [['Material', 'Leather']], variants: [{ size: '8' }, { size: '9' }], tags: ['formal shoes'] },
    { title: 'Terra Bags Everyday Laptop Backpack', cat: 'Bags', brand: 'Terra Bags', price: 1099, mrp: 2299, stock: 75, desc: 'Water-resistant backpack with padded 15.6" laptop compartment and USB charging port.', hl: ['Fits 15.6" laptop', 'Water resistant', 'USB port'], specs: [['Capacity', '30 L']], variants: [{ color: 'Black' }, { color: 'Grey' }], tags: ['backpack', 'bag'] },
    { title: 'TimeWise Classic Analog Watch', cat: 'Watches', brand: 'TimeWise', price: 1499, mrp: 3299, stock: 35, desc: 'Minimal analog watch with stainless steel case and genuine leather strap.', hl: ['Stainless steel', 'Leather strap', '3 ATM'], specs: [['Case', '40 mm']], tags: ['watch'] },
    { title: 'Kavya Oxidised Silver Jhumka Earrings', cat: 'Jewellery', brand: 'Kavya', price: 349, mrp: 899, stock: 120, desc: 'Handcrafted oxidised silver-tone jhumkas with intricate detailing.', hl: ['Handcrafted', 'Lightweight'], specs: [['Material', 'Alloy']], tags: ['earrings', 'jewellery'] },
    { title: 'UrbanThread Polarised Aviator Sunglasses', cat: 'Sunglasses', brand: 'UrbanThread', price: 599, mrp: 1499, stock: 60, desc: 'UV400 polarised aviator sunglasses with metal frame.', hl: ['UV400', 'Polarised'], specs: [['Frame', 'Metal']], tags: ['sunglasses'] },
  ],
  'seller.casa@vyora.local': [
    { title: 'ChefCraft Non-Stick Cookware Set (3 pcs)', cat: 'Cookware', brand: 'ChefCraft', price: 1899, mrp: 3499, stock: 40, desc: 'Induction-friendly non-stick cookware set: fry pan, kadai and tawa with toxin-free coating.', hl: ['Induction friendly', 'PFOA free', '3-piece set'], specs: [['Material', 'Aluminium']], tags: ['cookware', 'kitchen'] },
    { title: 'ChefCraft Stainless Steel Pressure Cooker 5L', cat: 'Cookware', brand: 'ChefCraft', price: 2199, mrp: 3299, stock: 30, desc: 'Tri-ply stainless steel pressure cooker with safety valve, suitable for all cooktops.', hl: ['Tri-ply base', '5 litre'], specs: [['Material', 'Stainless Steel']], tags: ['pressure cooker'] },
    { title: 'ChefCraft Glass Storage Containers (Set of 6)', cat: 'Storage', brand: 'ChefCraft', price: 899, mrp: 1599, stock: 80, desc: 'Borosilicate glass containers with airtight lids — microwave and oven safe.', hl: ['Borosilicate glass', 'Airtight'], specs: [['Pieces', '6']], tags: ['storage', 'containers'] },
    { title: 'Casa Loom Handwoven Cotton Bedsheet', cat: 'Furnishing', brand: 'Casa Loom', price: 1299, mrp: 2599, stock: 50, desc: 'Handwoven 100% cotton double bedsheet with two pillow covers.', hl: ['Handwoven', '100% cotton', 'Double size'], specs: [['Size', '90 x 100 in']], variants: [{ color: 'Beige' }, { color: 'Blue' }], tags: ['bedsheet'] },
    { title: 'Casa Loom Jute Area Rug', cat: 'Home Decor', brand: 'Casa Loom', price: 1599, mrp: 2999, stock: 25, desc: 'Natural jute area rug, hand braided for a warm rustic look.', hl: ['Natural jute', 'Hand braided'], specs: [['Size', '4 x 6 ft']], tags: ['rug', 'decor'] },
    { title: 'Monsoon Home Ceramic Table Lamp', cat: 'Home Decor', brand: 'Monsoon Home', price: 1399, mrp: 2499, stock: 20, desc: 'Glazed ceramic table lamp with linen shade, bulb included.', hl: ['Ceramic base', 'Linen shade'], specs: [['Height', '45 cm']], tags: ['lamp', 'lighting'] },
    { title: 'Monsoon Home Scented Candle Trio', cat: 'Home Decor', brand: 'Monsoon Home', price: 499, mrp: 999, stock: 100, desc: 'Soy wax scented candles in jasmine, sandalwood and vanilla.', hl: ['Soy wax', '3 fragrances'], specs: [['Burn time', '25 hours each']], tags: ['candles', 'gift'] },
    { title: 'PureLeaf Organic Basmati Rice 5kg', cat: 'Staples', brand: 'PureLeaf', price: 649, mrp: 799, stock: 200, desc: 'Aged organic long-grain basmati rice with rich aroma.', hl: ['Certified organic', 'Aged 12 months'], specs: [['Weight', '5 kg']], tags: ['rice', 'organic'] },
    { title: 'PureLeaf Cold Pressed Groundnut Oil 1L', cat: 'Staples', brand: 'PureLeaf', price: 329, mrp: 399, stock: 150, desc: 'Wood-pressed groundnut oil, unrefined and chemical free.', hl: ['Wood pressed', 'Unrefined'], specs: [['Volume', '1 L']], tags: ['oil'] },
    { title: 'PureLeaf Roasted Makhana Snack Pack', cat: 'Snacks', brand: 'PureLeaf', price: 199, mrp: 299, stock: 180, desc: 'Crunchy roasted fox nuts in peri-peri flavour — a healthy snack.', hl: ['Roasted, not fried', 'High protein'], specs: [['Weight', '200 g']], tags: ['snacks', 'healthy'] },
    { title: 'PureLeaf Assam Tea 500g', cat: 'Beverages', brand: 'PureLeaf', price: 279, mrp: 350, stock: 160, desc: 'Strong and brisk CTC Assam tea, sourced directly from estates.', hl: ['Estate sourced'], specs: [['Weight', '500 g']], tags: ['tea'] },
    { title: 'Playnest Wooden Alphabet Puzzle', cat: 'Learning Toys', brand: 'Playnest', price: 399, mrp: 799, stock: 60, desc: 'Colourful wooden alphabet puzzle that builds early literacy and motor skills.', hl: ['Non-toxic paint', 'Ages 3+'], specs: [['Material', 'Wood']], tags: ['puzzle', 'kids'] },
    { title: 'Playnest Plush Teddy Bear 60cm', cat: 'Soft Toys', brand: 'Playnest', price: 699, mrp: 1299, stock: 40, desc: 'Super soft, huggable teddy bear made with child-safe materials.', hl: ['Child safe', '60 cm'], specs: [['Material', 'Polyester']], variants: [{ color: 'Beige' }, { color: 'Pink' }], tags: ['teddy', 'soft toy'] },
    { title: 'Playnest Kids Scooter', cat: 'Outdoor Play', brand: 'Playnest', price: 1799, mrp: 2999, stock: 15, desc: 'Three-wheel kick scooter with LED wheels and adjustable height.', hl: ['LED wheels', 'Adjustable height'], specs: [['Age', '3-8 years']], tags: ['scooter', 'outdoor'] },
  ],
  'seller.glow@vyora.local': [
    { title: 'Glowveda Vitamin C Face Serum', cat: 'Skincare', brand: 'Glowveda', price: 449, mrp: 799, stock: 120, desc: '10% vitamin C serum with hyaluronic acid for brighter, even-toned skin.', hl: ['10% Vitamin C', 'Hyaluronic acid'], specs: [['Volume', '30 ml']], tags: ['serum', 'skincare'] },
    { title: 'Glowveda Aloe Hydrating Face Wash', cat: 'Skincare', brand: 'Glowveda', price: 249, mrp: 399, stock: 150, desc: 'Gentle sulphate-free face wash with aloe vera for daily cleansing.', hl: ['Sulphate free', 'Aloe vera'], specs: [['Volume', '150 ml']], tags: ['face wash'] },
    { title: 'Glowveda SPF 50 Sunscreen Gel', cat: 'Skincare', brand: 'Glowveda', price: 399, mrp: 599, stock: 110, desc: 'Lightweight, non-greasy SPF 50 PA+++ sunscreen gel.', hl: ['SPF 50 PA+++', 'No white cast'], specs: [['Volume', '50 g']], tags: ['sunscreen'] },
    { title: 'Glowveda Matte Liquid Lipstick', cat: 'Makeup', brand: 'Glowveda', price: 299, mrp: 549, stock: 90, desc: 'Long-lasting transfer-proof matte liquid lipstick.', hl: ['12h wear', 'Transfer proof'], specs: [['Volume', '4 ml']], variants: [{ color: 'Red' }, { color: 'Pink' }, { color: 'Beige' }], tags: ['lipstick', 'makeup'] },
    { title: 'Glowveda Onion Hair Oil', cat: 'Haircare', brand: 'Glowveda', price: 349, mrp: 499, stock: 100, desc: 'Red onion hair oil with 14 herbs to reduce hair fall.', hl: ['14 herbs', 'Reduces hair fall'], specs: [['Volume', '200 ml']], tags: ['hair oil'] },
    { title: 'Glowveda Sandalwood Eau de Parfum', cat: 'Fragrances', brand: 'Glowveda', price: 799, mrp: 1499, stock: 45, desc: 'Warm sandalwood and amber eau de parfum for long-lasting fragrance.', hl: ['Long lasting', 'Unisex'], specs: [['Volume', '100 ml']], tags: ['perfume'] },
  ],
};

async function seedSellersAndProducts(refs: Awaited<ReturnType<typeof seedCatalogReference>>, adminActor: AuditActor) {
  const sellerIds: string[] = [];
  for (const def of SELLERS) {
    let user = await db.user.findUnique({ where: { email: def.email }, include: { seller: true } });
    if (!user?.seller) {
      await s.sellers.register(
        {
          name: def.name, email: def.email, phone: def.phone, password: 'Seller@12345', businessName: def.business, businessType: 'PROPRIETORSHIP',
          addressLine1: '12, Market Road', addressLine2: undefined, city: def.city, state: def.state, pincode: def.pincode, gstin: def.gstin, pan: def.pan,
          acceptTerms: true, acceptCommissionPolicy: true,
        },
        { ip: '127.0.0.1', userAgent: 'seed' },
      );
      user = await db.user.findUniqueOrThrow({ where: { email: def.email }, include: { seller: true } });
      await db.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
      await s.sellers.changeStatus(user.seller!.id, 'APPROVED', undefined, adminActor);
      await db.seller.update({ where: { id: user.seller!.id }, data: { isFeatured: def.featured, description: `${def.business} — trusted seller from ${def.city}.` } });
    }
    sellerIds.push(user.seller!.id);
    const sellerActor = { auth: null, ip: '127.0.0.1', userAgent: 'seed' };
    const existingCount = await db.product.count({ where: { ownerSellerId: user.seller!.id } });
    if (existingCount > 0) continue;
    for (const p of PRODUCTS[def.email]) {
      const variants = (p.variants ?? [{}]).map((opts, i) => ({
        options: opts,
        sku: `${slugify(p.brand).slice(0, 5).toUpperCase()}-${hash(p.title).toString(36).slice(0, 5).toUpperCase()}-${i + 1}`,
        price: p.price + (opts.storage === '256 GB' ? 3000 : 0),
        mrp: p.mrp + (opts.storage === '256 GB' ? 3000 : 0),
        stock: p.stock === 0 ? 0 : Math.max(2, Math.round(p.stock / (p.variants?.length ?? 1))),
        lowStockThreshold: 5,
        isActive: true,
      }));
      const input: ProductUpsertInput = {
        title: p.title,
        description: `${p.desc}\n\nSold and shipped by ${def.business}. Every order is packed with care and dispatched within 48 hours.`,
        highlights: p.hl,
        categoryId: refs.categories.get(p.cat)!,
        brandId: refs.brands.get(p.brand) ?? null,
        specifications: p.specs.map(([key, value]) => ({ key, value })),
        attributes: [],
        tags: p.tags ?? [],
        isReturnable: !['Staples', 'Snacks', 'Beverages'].includes(p.cat),
        returnWindowDays: ['Staples', 'Snacks', 'Beverages'].includes(p.cat) ? 0 : 7,
        codAvailable: true,
        variants: variants as ProductUpsertInput['variants'],
        submit: false,
      };
      const created = await s.products.create(user.seller!.id, input, sellerActor);
      const imgs = await renderProductImages(c, p.title, (p.variants?.[0] ?? {}).color);
      await db.productImage.createMany({ data: imgs.map((im, i) => ({ productId: created.id, url: im.url, storageKey: im.key, alt: p.title, sortOrder: i })) });
      await s.products.submit(created.id, { kind: 'seller', sellerId: user.seller!.id }, sellerActor);
      await s.products.approve(created.id, adminActor);
      // Stagger publish dates so "new arrivals" and "bestsellers" differ.
      await db.product.update({
        where: { id: created.id },
        data: { publishedAt: new Date(Date.now() - (hash(p.title) % 40) * 86400_000), isFeatured: hash(p.title) % 5 === 0, viewCount: hash(p.title) % 500 },
      });
    }
    console.log(`✔ seller ${def.business} with ${PRODUCTS[def.email].length} products`);
  }

  // A seller still awaiting approval, with a draft product (for the admin review queue).
  if (!(await db.user.findUnique({ where: { email: 'seller.pending@vyora.local' } }))) {
    await s.sellers.register(
      {
        name: 'Deepak Sharma', email: 'seller.pending@vyora.local', phone: '9876500009', password: 'Seller@12345', businessName: 'Sharma Handicrafts',
        businessType: 'INDIVIDUAL', addressLine1: '7 Lake View', city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001', pan: 'EFGPS5678P',
        acceptTerms: true, acceptCommissionPolicy: true,
      } as never,
      { ip: '127.0.0.1', userAgent: 'seed' },
    );
    console.log('✔ pending seller: seller.pending@vyora.local');
  }
  return sellerIds;
}

async function seedContent(refs: Awaited<ReturnType<typeof seedCatalogReference>>) {
  if ((await db.banner.count()) === 0) {
    const banners = [
      { title: 'The Big Festive Sale', subtitle: 'Up to 60% off on fashion, electronics & home — from sellers across India', ctaLabel: 'Shop the sale', linkUrl: '/search?q=&onSale=true', theme: 'linear-gradient(120deg,#5B3DF5 0%,#9B5CFF 55%,#FF6B4A 100%)', placement: 'HERO' as const, sortOrder: 0 },
      { title: 'Smart gadgets, smarter prices', subtitle: 'Earbuds from ₹1,799 · Smartwatches from ₹2,999', ctaLabel: 'Explore electronics', linkUrl: '/c/electronics', theme: 'linear-gradient(120deg,#0F172A 0%,#2563EB 60%,#22D3EE 100%)', placement: 'HERO' as const, sortOrder: 1 },
      { title: 'Handpicked for your home', subtitle: 'Handwoven textiles and cookware you will love', ctaLabel: 'Refresh your home', linkUrl: '/c/home-and-kitchen', theme: 'linear-gradient(120deg,#0EA5A4 0%,#34D399 60%,#FDE68A 100%)', placement: 'HERO' as const, sortOrder: 2 },
      { title: 'Use code WELCOME10', subtitle: '10% off your first order, up to ₹200', ctaLabel: 'Start shopping', linkUrl: '/search?q=', theme: 'linear-gradient(90deg,#FF6B4A,#FFB547)', placement: 'STRIP' as const, sortOrder: 0 },
    ];
    for (const b of banners) await s.content.createBanner({ ...b, isActive: true } as never, system);
  }
  if ((await db.homeSection.count()) === 0) {
    const sections = [
      { type: 'CATEGORY_GRID', title: 'Shop by category', limit: 8 },
      { type: 'TRENDING', title: 'Trending now', subtitle: 'What everyone is looking at', limit: 12 },
      { type: 'ON_SALE', title: 'Deals of the day', subtitle: 'Biggest discounts right now', limit: 12 },
      { type: 'BEST_SELLERS', title: 'Best sellers', limit: 12 },
      { type: 'RECENTLY_VIEWED', title: 'Recently viewed', limit: 12 },
      { type: 'NEW_ARRIVALS', title: 'New arrivals', limit: 12 },
      { type: 'FEATURED_SELLERS', title: 'Featured sellers', subtitle: 'Independent stores we love', limit: 6 },
      { type: 'CATEGORY_PRODUCTS', title: 'Fashion picks', categoryId: refs.categories.get('Fashion'), limit: 12 },
      { type: 'RECOMMENDED', title: 'Top rated for you', limit: 12 },
    ] as const;
    for (const [i, sec] of sections.entries()) await s.content.createSection({ ...sec, sortOrder: i, isActive: true } as never, system);
  }
  if ((await db.coupon.count()) === 0) {
    const now = Date.now();
    const in90 = new Date(now + 90 * 86400_000);
    await s.coupons.create({ code: 'WELCOME10', description: '10% off your first order (max ₹200)', type: 'PERCENTAGE', value: 10, maxDiscount: 200, minOrderAmount: 299, scope: 'ALL', scopeIds: [], fundedBy: 'PLATFORM', startsAt: new Date(now - 86400_000), endsAt: in90, usageLimit: 10000, perCustomerLimit: 1, firstOrderOnly: true, isActive: true }, system);
    await s.coupons.create({ code: 'FLAT100', description: '₹100 off on orders above ₹999', type: 'FIXED', value: 100, maxDiscount: null, minOrderAmount: 999, scope: 'ALL', scopeIds: [], fundedBy: 'PLATFORM', startsAt: new Date(now - 86400_000), endsAt: in90, usageLimit: null, perCustomerLimit: 3, firstOrderOnly: false, isActive: true }, system);
    await s.coupons.create({ code: 'FASHION20', description: '20% off fashion (max ₹500)', type: 'PERCENTAGE', value: 20, maxDiscount: 500, minOrderAmount: 499, scope: 'CATEGORY', scopeIds: [refs.categories.get('Fashion')!], fundedBy: 'PLATFORM', startsAt: new Date(now - 86400_000), endsAt: in90, usageLimit: 500, perCustomerLimit: 2, firstOrderOnly: false, isActive: true }, system);
    await s.coupons.create({ code: 'FREESHIP', description: 'Free standard shipping', type: 'FREE_SHIPPING', value: 0, maxDiscount: null, minOrderAmount: 0, scope: 'ALL', scopeIds: [], fundedBy: 'PLATFORM', startsAt: new Date(now - 86400_000), endsAt: in90, usageLimit: null, perCustomerLimit: 5, firstOrderOnly: false, isActive: true }, system);
  }
  if ((await db.promotion.count()) === 0) {
    await s.content.createPromotion({ name: 'Festive Fashion Week', description: 'Up to 60% off ethnic wear', discountPercent: 40, categoryId: refs.categories.get('Fashion'), startsAt: new Date(Date.now() - 86400_000), endsAt: new Date(Date.now() + 14 * 86400_000), isActive: true } as never, system);
  }
}

async function seedCustomersAndOrders(adminActor: AuditActor) {
  const customers = [
    { name: 'Priya Nair', email: 'priya@vyora.local', phone: '9123400001', city: 'Kochi', state: 'Kerala', pincode: '682001' },
    { name: 'Arjun Singh', email: 'arjun@vyora.local', phone: '9123400002', city: 'New Delhi', state: 'Delhi', pincode: '110001' },
    { name: 'Meera Joshi', email: 'meera@vyora.local', phone: '9123400003', city: 'Ahmedabad', state: 'Gujarat', pincode: '380001' },
  ];
  const ids: string[] = [];
  for (const cu of customers) {
    let user = await db.user.findUnique({ where: { email: cu.email } });
    if (!user) {
      await s.auth.registerCustomer({ name: cu.name, email: cu.email, phone: cu.phone, password: 'Customer@123' }, { ip: '127.0.0.1', userAgent: 'seed' });
      user = await db.user.findUniqueOrThrow({ where: { email: cu.email } });
      await db.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
      await s.customers.createAddress(user.id, { fullName: cu.name, phone: cu.phone, line1: '21, Park Avenue', city: cu.city, state: cu.state, pincode: cu.pincode, type: 'HOME', isDefault: true });
    }
    ids.push(user.id);
  }
  console.log('✔ customers: priya@ / arjun@ / meera@vyora.local  (password Customer@123)');
  if ((await db.order.count()) > 0) return;

  // Place real orders through the checkout service so every downstream record is consistent.
  const listings = await db.sellerProductListing.findMany({ where: { status: 'APPROVED', inventory: { quantity: { gt: 5 } } }, take: 40, orderBy: { createdAt: 'asc' } });
  let n = 0;
  for (const [ci, userId] of ids.entries()) {
    for (let k = 0; k < 3; k++) {
      const picks = [listings[(ci * 7 + k * 3) % listings.length], listings[(ci * 7 + k * 3 + 11) % listings.length]];
      for (const l of picks) await s.cart.add({ userId }, l.id, 1);
      const address = await db.customerAddress.findFirstOrThrow({ where: { userId } });
      const placed = await s.checkout.placeOrder(userId, { addressId: address.id, shippingMethod: 'STANDARD', paymentMethod: 'COD', idempotencyKey: `seed-${ci}-${k}` }, { ip: '127.0.0.1', userAgent: 'seed' });
      n++;
      // Move some orders through fulfillment for realistic dashboards.
      const subs = await db.sellerOrder.findMany({ where: { orderId: placed.id } });
      for (const so of subs) {
        const stage = (ci + k) % 4;
        if (stage === 0) continue;
        await s.fulfillment.updateSellerOrderStatus(so.id, 'CONFIRMED', {}, { kind: 'admin' }, adminActor);
        if (stage === 1) continue;
        await s.fulfillment.updateSellerOrderStatus(so.id, 'PROCESSING', {}, { kind: 'admin' }, adminActor);
        await s.fulfillment.updateSellerOrderStatus(so.id, 'SHIPPED', { carrier: 'BlueDart', trackingNumber: `BD${hash(so.id)}` }, { kind: 'admin' }, adminActor);
        if (stage === 2) continue;
        await s.fulfillment.updateSellerOrderStatus(so.id, 'DELIVERED', {}, { kind: 'admin' }, adminActor);
        await s.fulfillment.confirmCodCollection(so.id, { reference: `COD-${hash(so.id)}` }, adminActor);
      }
    }
  }
  console.log(`✔ ${n} demo orders placed via checkout`);
}

async function main() {
  const admin = await upsertRolesAndAdmin();
  const adminRoles = await db.userRole.findMany({ where: { userId: admin.id }, include: { role: { include: { permissions: { include: { permission: true } } } } } });
  const adminActor = {
    auth: {
      userId: admin.id, sessionId: 'seed', email: admin.email, name: admin.name, roles: ['ADMIN' as const], sellerId: null, sellerStatus: null,
      permissions: new Set(adminRoles.flatMap((r) => r.role.permissions.map((p) => p.permission.code))),
    },
    ip: '127.0.0.1',
    userAgent: 'seed',
  };
  const refs = await seedCatalogReference();
  console.log('✔ categories, attributes, brands, shipping & tax');
  await seedSellersAndProducts(refs, adminActor);
  await seedContent(refs);
  console.log('✔ banners, homepage sections, coupons, promotions');
  await seedCustomersAndOrders(adminActor);
  await seedDemoReviews(c);
  await c.jobs.drain();
}

main()
  .then(async () => {
    await c.shutdown();
    console.log('\nSeed complete.');
  })
  .catch(async (err) => {
    console.error(err);
    await c.shutdown();
    process.exit(1);
  });
