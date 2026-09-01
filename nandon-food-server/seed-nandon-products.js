/**
 * Seed a set of demo Nandon Foods products, assigned to the real category tree.
 * Idempotent: every product carries the tag "nandon-seed", so a re-run wipes the
 * previous demo set first (your own products are untouched).
 *
 *   node seed-nandon-products.js
 *
 * Uses the same DATABASE_URL as the server, and inserts into whatever database
 * that connection string points at (no hard-coded db name).
 */
require('dotenv').config();
const mongoose = require('mongoose');

const URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/freshfoodbazar';
const oid = (s) => new mongoose.Types.ObjectId(s);

// ── Category IDs (live, from /api/categories) ──────────────────────
const C = {
  chicken: '6a883c57bdba7ceb9de5c88f',
  liveChicken: '6a883c57bdba7ceb9de5c891',
  processedChicken: '6a883c57bdba7ceb9de5c893',
  beef: '6a883c57bdba7ceb9de5c895',
  liveCattle: '6a883c57bdba7ceb9de5c897',
  processBeef: '6a883c57bdba7ceb9de5c899',
  primalCuts: '6a883c57bdba7ceb9de5c89b',
  fish: '6a883c57bdba7ceb9de5c89d',
  cultureFish: '6a883c57bdba7ceb9de5c89f',
  captureFish: '6a883c57bdba7ceb9de5c8a1',
  duck: '6a883c57bdba7ceb9de5c8a3',
  deshiPatihas: '6a883c57bdba7ceb9de5c8a5',
  agro: '6a883c57bdba7ceb9de5c8a7',
  egg: '6a883c57bdba7ceb9de5c8a9',
  frozen: '6a883c57bdba7ceb9de5c8ab',
  chickenProduct: '6a883c57bdba7ceb9de5c8ad',
  beefProduct: '6a883c57bdba7ceb9de5c8af',
  fishProduct: '6a883c57bdba7ceb9de5c8b1',
  vegetableProduct: '6a883c57bdba7ceb9de5c8b3',
};

const img = (id) => `https://images.unsplash.com/photo-${id}?w=800&auto=format&fit=crop`;

// Extra gallery photos per kind (so the product page shows a multi-image slider).
const POOL = {
  chicken: ['1587593810167-a84920ea0781', '1604503468506-a8da13d82791', '1610057099431-d73a1c9d2f2f'],
  beef: ['1603048297172-c92544798d5a', '1588347818131-c0f3e9c6c0b3', '1529692236671-f1f6cf9683ba'],
  fish: ['1535140728325-a4d3707eee61', '1611171711791-b34fa42e9e39', '1519708227418-c8fd9a32b7a2'],
  duck: ['1518492104633-130d0cc84637', '1610057099431-d73a1c9d2f2f'],
  frozen: ['1562967914-608f82629710', '1529042410759-befb1204b468', '1601050690597-df0568f70950'],
  egg: ['1582722872445-44dc5f7e3c8f', '1518569656558-1f25e69d93d7'],
  agro: ['1586201375761-83865001e31c', '1536304993881-ff6e9eefa2a6'],
};

// build 3 gallery images: the primary photo first, then 2 more from its kind pool
const galleryFor = (kind, primary) =>
  [...new Set([primary, ...(POOL[kind] || [])])].slice(0, 3).map(img);

// name, category, subcategory, price, originalPrice, photoId, flags, kind
const RAW = [
  ['Live Broiler Chicken (per kg)', C.chicken, C.liveChicken, 235, 270, '1548550023-2bdb3c5beed7', ['best-selling'], 'chicken'],
  ['Deshi Chicken — Live (per kg)', C.chicken, C.liveChicken, 480, 540, '1612170153139-6f881ff067e0', ['new-arrival'], 'chicken'],
  ['Chicken Breast Boneless 1kg', C.chicken, C.processedChicken, 380, 450, '1604503468506-a8da13d82791', ['best-selling', 'on-sale'], 'chicken'],
  ['Chicken Drumstick 1kg', C.chicken, C.processedChicken, 320, 380, '1587593810167-a84920ea0781', ['on-sale'], 'chicken'],
  ['Beef Bone-in — Fresh (per kg)', C.beef, C.processBeef, 720, 780, '1603048297172-c92544798d5a', ['best-selling'], 'beef'],
  ['Beef Tenderloin — Primal Cut 1kg', C.processBeef, C.primalCuts, 980, 1150, '1588347818131-c0f3e9c6c0b3', ['featured', 'on-sale'], 'beef'],
  ['Rui Fish — Cut & Cleaned 1kg', C.fish, C.cultureFish, 340, 400, '1535140728325-a4d3707eee61', ['new-arrival'], 'fish'],
  ['Ilish / Hilsa — Fresh 1kg', C.fish, C.captureFish, 1450, 1650, '1611171711791-b34fa42e9e39', ['featured', 'best-selling'], 'fish'],
  ['Deshi Duck — Dressed (1 pc)', C.duck, C.deshiPatihas, 650, 750, '1518492104633-130d0cc84637', ['new-arrival'], 'duck'],
  ['Chicken Nuggets — Frozen 500g', C.frozen, C.chickenProduct, 330, 390, '1562967914-608f82629710', ['on-sale', 'best-selling'], 'frozen'],
  ['Beef Meatballs — Frozen 500g', C.frozen, C.beefProduct, 360, 430, '1529042410759-befb1204b468', ['on-sale'], 'frozen'],
  ['Fish Finger — Frozen 500g', C.frozen, C.fishProduct, 300, 360, '1544982503-9f984c14501a', ['new-arrival'], 'frozen'],
  ['Mixed Frozen Vegetables 1kg', C.frozen, C.vegetableProduct, 180, 220, '1540420773420-3366772f4999', ['on-sale'], 'frozen'],
  ['Farm Fresh Eggs — Tray of 30', C.egg, null, 315, 360, '1582722872445-44dc5f7e3c8f', ['best-selling'], 'egg'],
  ['Premium Aromatic Rice 5kg', C.agro, null, 760, 860, '1586201375761-83865001e31c', ['featured'], 'agro'],
];

const now = new Date();
const PRODUCTS = RAW.map((r, i) => {
  const [name, category, subcategory, price, originalPrice, photo, flags, kind] = r;
  const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const images = galleryFor(kind, photo);
  return {
    name,
    slug,
    sku: `NDN-${String(i + 1).padStart(3, '0')}`,
    description:
      `${name} — 100% halal, fresh & hygienically processed by Nandon Foods. ` +
      `Sourced with care and delivered cold to keep it fresh. Great taste, honest price.`,
    tagline: 'Fresh · 100% Halal · Processed with care',
    priceType: 'fixed',
    productType: 'simple',
    price,
    originalPrice,
    discount,
    thumbnail: images[0],
    images,
    category: oid(category),
    subcategory: subcategory ? oid(subcategory) : null,
    country: 'Bangladesh',
    brand: 'Nandon',
    flags: flags || [],
    variants: [],
    stock: 100,
    status: 'active',
    visibility: 'visible',
    isDeleted: false,
    tags: ['nandon-seed'],
    colors: [],
    sizes: [],
    deliveryInfo: 'Free home delivery inside Dhaka on orders over ৳1500. Delivered cold within 24 hours.',
    paymentInfo: 'Cash on Delivery, bKash, Nagad and Rocket accepted.',
    termsInfo: 'Perishable item — please check on delivery. Returns accepted only for damaged/spoiled items.',
    rating: 4 + (i % 10) / 10,
    reviewCount: 5 + i,
    totalSold: 20 + i * 7,
    viewCount: 100 + i * 30,
    likeCount: 5 + i,
    createdAt: now,
    updatedAt: now,
  };
});

async function main() {
  await mongoose.connect(URL);
  const db = mongoose.connection.db;
  console.log('✅ Connected to DB:', db.databaseName);
  const col = db.collection('products');

  const removed = await col.deleteMany({ tags: 'nandon-seed' });
  console.log(`🧹 Removed ${removed.deletedCount} previous demo product(s).`);

  const res = await col.insertMany(PRODUCTS);
  console.log(`📦 Inserted ${res.insertedCount} demo products.`);

  // Refresh category productCount for the touched categories.
  const cats = db.collection('categories');
  const ids = [...new Set(PRODUCTS.flatMap((p) => [p.category, p.subcategory].filter(Boolean).map(String)))];
  for (const id of ids) {
    const count = await col.countDocuments({
      isDeleted: { $ne: true },
      $or: [{ category: oid(id) }, { subcategory: oid(id) }],
    });
    await cats.updateOne({ _id: oid(id) }, { $set: { productCount: count } });
  }
  console.log(`🔢 Updated productCount on ${ids.length} categories.`);

  await mongoose.disconnect();
  console.log('🔌 Done.');
}

main().catch((e) => {
  console.error('❌ Seed failed:', e.message);
  process.exit(1);
});
