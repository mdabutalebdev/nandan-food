/**
 * Seed Nandon Foods' real category tree (from the brief image), with proper
 * parent / level hierarchy (0 = root, 1 = sub, 2 = sub-sub).
 *
 * Replaces any existing categories. Run from the backend folder:
 *     node seed-nandon-categories.js
 */
const mongoose = require('mongoose');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

const categorySchema = new mongoose.Schema(
  {
    name: String,
    slug: { type: String, unique: true },
    description: String,
    icon: String,
    image: String,
    banner: String,
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    level: { type: Number, default: 0 },
    order: Number,
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    showInMenu: { type: Boolean, default: true },
    showInHome: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    productCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Category = mongoose.model('Category', categorySchema);

const slugify = (name) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// The exact tree from the brief image.
const TREE = [
  { name: 'Chicken', icon: '🍗', children: [
    { name: 'Live chicken' },
    { name: 'Processed chicken' },
  ]},
  { name: 'Beef', icon: '🥩', children: [
    { name: 'Live cattle' },
    { name: 'Process beef', children: [
      { name: 'Primal cuts' },
    ]},
  ]},
  { name: 'Fish', icon: '🐟', children: [
    { name: 'Culture fish' },
    { name: 'Capture fish' },
  ]},
  { name: 'Duck', icon: '🦆', children: [
    { name: 'Deshi patihas' },
  ]},
  { name: 'Agro product', icon: '🌾' },
  { name: 'Egg', icon: '🥚' },
  { name: 'Frozen product', icon: '❄️', children: [
    { name: 'Chicken product' },
    { name: 'Beef product' },
    { name: 'Fish product' },
    { name: 'Vegetable product' },
  ]},
];

let created = 0;

async function insertNode(node, parentId, level, order, indent) {
  const doc = await Category.create({
    name: node.name,
    slug: slugify(node.name),
    icon: node.icon || '',
    description: node.description || '',
    parent: parentId,
    level,
    order,
    isActive: true,
    isFeatured: level === 0,
    showInMenu: true,
    showInHome: level === 0,
    isDeleted: false,
  });
  created++;
  console.log(`${indent}✔ ${node.name}  (level ${level})`);
  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      await insertNode(node.children[i], doc._id, level + 1, i, indent + '   ');
    }
  }
  return doc;
}

async function main() {
  await mongoose.connect(DATABASE_URL);
  console.log('✅ Connected:', DATABASE_URL.replace(/\/\/[^@]+@/, '//***@'));

  const before = await Category.countDocuments();
  await Category.deleteMany({});
  console.log(`🧹 Cleared ${before} existing categor${before === 1 ? 'y' : 'ies'}\n`);

  for (let i = 0; i < TREE.length; i++) {
    await insertNode(TREE[i], null, 0, i, '');
  }

  const total = await Category.countDocuments();
  console.log(`\n🎉 Done. Seeded ${created} categories (${total} total in DB).`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
