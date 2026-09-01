/**
 * Seed a few demo job openings onto the site-content singleton (careers array).
 * Overwrites the careers list — edit/add/remove freely from Admin → Pages → Careers.
 *   node seed-careers.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/freshfoodbazar';

const JOBS = [
  {
    title: 'Delivery Rider',
    location: 'Dhaka, Bangladesh',
    type: 'Full-time',
    department: 'Operations',
    description:
      'Deliver fresh & frozen orders to customers on time and with care.\n\nRequirements:\n• Own motorcycle with valid driving license\n• Knowledge of Dhaka city routes\n• Polite, punctual and honest\n\nBenefits: competitive salary + fuel allowance + performance bonus.',
    deadline: '30 Sep 2026',
    applyEmail: 'hr@nandonfood.com',
    applyLink: '',
    active: true,
    order: 0,
  },
  {
    title: 'Butcher / Meat Processor',
    location: 'Dhaka, Bangladesh',
    type: 'Full-time',
    department: 'Processing',
    description:
      'Cut, clean, portion and pack meat following strict hygiene and 100% halal standards.\n\nRequirements:\n• 2+ years experience in meat processing\n• Understanding of HACCP / food-safety basics\n• Attention to quality and cleanliness',
    deadline: '',
    applyEmail: 'hr@nandonfood.com',
    applyLink: '',
    active: true,
    order: 1,
  },
  {
    title: 'Customer Support Executive',
    location: 'Dhaka, Bangladesh',
    type: 'Full-time',
    department: 'Support',
    description:
      'Be the friendly voice of Nandon Foods — handle customer calls, orders, and complaints with patience and care.\n\nRequirements:\n• Good Bangla & basic English communication\n• Comfortable with phone + WhatsApp support\n• Fresh graduates welcome',
    deadline: '15 Oct 2026',
    applyEmail: 'hr@nandonfood.com',
    applyLink: '',
    active: true,
    order: 2,
  },
];

async function main() {
  await mongoose.connect(URL);
  const db = mongoose.connection.db;
  console.log('✅ Connected to DB:', db.databaseName);
  const res = await db.collection('sitecontents').updateOne({ _key: 'main' }, { $set: { careers: JOBS } }, { upsert: true });
  console.log(`💼 Seeded ${JOBS.length} job openings (matched ${res.matchedCount}, modified ${res.modifiedCount}).`);
  await mongoose.disconnect();
  console.log('🔌 Done.');
}

main().catch((e) => {
  console.error('❌ Seed failed:', e.message);
  process.exit(1);
});
