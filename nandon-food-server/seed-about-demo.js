/**
 * Seed DEMO content for the About Us page (message, management, clients,
 * certifications) so the full page design can be previewed. All of this is
 * placeholder data — replace or delete it from Admin → About Page → …
 *   node seed-about-demo.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/freshfoodbazar';

const ownerMessage = {
  title: 'Message',
  name: 'Md Lokman Hossain',
  designation: 'Chairman, Fardin Meat & Agro Food Ltd.',
  message:
    'Since 2005 we have grown from a small supply house into a trusted name in fresh and frozen food across Bangladesh. Our promise has never changed — safe, halal and honestly-priced food, delivered with care.\n\nThank you for trusting Nandon Foods. We are committed to serving your family and your business with the same dedication that built this company.',
  imageUrl: 'https://i.pravatar.cc/600?img=12',
};

const member = (name, designation, img, order) => ({
  imageUrl: `https://i.pravatar.cc/500?img=${img}`,
  title: name,
  description: designation,
  link: '',
  active: true,
  order,
});
const management = [
  member('Md Lokman Hossain', 'Chairman', 12, 0),
  member('Fatema Begum', 'Managing Director', 45, 1),
  member('Abdur Rahman', 'Director', 33, 2),
  member('Nusrat Jahan', 'Director', 47, 3),
  member('Sujon Das', 'Director (Operations)', 68, 4),
];

const logo = (name, order) => ({
  imageUrl: `https://placehold.co/240x100/ffffff/333333/png?text=${encodeURIComponent(name)}`,
  title: name,
  description: '',
  link: '',
  active: true,
  order,
});
const clients = [
  'Biman Bangladesh', 'Foodpanda', 'Sasti Bazar', 'Tasty Treat', 'EFC',
  'CFC', 'BFC', 'Lavender Online', 'Burger Xpress',
].map((n, i) => logo(n, i));

const cert = (name, order) => ({
  imageUrl: `https://placehold.co/600x800/ffffff/333333/png?text=${encodeURIComponent(name)}`,
  title: name,
  description: '',
  link: '',
  active: true,
  order,
});
const certifications = [
  'HACCP Certificate', 'ISO 9001:2015', 'VAT Registration', 'TIN Certificate',
  'Trade License', 'Halal Compliance', 'City Corporation',
].map((n, i) => cert(n, i));

async function main() {
  await mongoose.connect(URL);
  const db = mongoose.connection.db;
  console.log('✅ Connected to DB:', db.databaseName);
  const res = await db.collection('sitecontents').updateOne(
    { _key: 'main' },
    { $set: { ownerMessage, management, clients, certifications } },
    { upsert: true },
  );
  console.log(`🧾 Seeded About demo — message + ${management.length} members, ${clients.length} clients, ${certifications.length} certificates (matched ${res.matchedCount}, modified ${res.modifiedCount}).`);
  await mongoose.disconnect();
  console.log('🔌 Done.');
}

main().catch((e) => {
  console.error('❌ Seed failed:', e.message);
  process.exit(1);
});
