/**
 * Create / reset the Nandon Foods admin login with a KNOWN password.
 * Password is bcrypt-hashed directly (same as the app's login compare),
 * so it works regardless of the model hooks.
 *
 * Run from the backend folder:  node create-admin.js
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;
const SALT = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

// ── The admin credentials to set ──
const ADMIN_EMAIL = 'admin@nandonfood.com';
const ADMIN_PASSWORD = 'Nandon@2026';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, lowercase: true, trim: true },
    password: String,
    firstName: String,
    lastName: String,
    phone: String,
    role: { type: String, default: 'user' },
    status: { type: String, default: 'active' },
    isEmailVerified: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, strict: false }
);
const User = mongoose.model('User', userSchema);

async function main() {
  if (!DATABASE_URL) throw new Error('DATABASE_URL missing in .env');
  await mongoose.connect(DATABASE_URL);
  console.log('✅ Connected:', DATABASE_URL.replace(/\/\/[^@]+@/, '//***@'), '\n');

  // Show any existing admins first.
  const existingAdmins = await User.find({ role: 'admin' }).select('email firstName lastName status');
  if (existingAdmins.length) {
    console.log(`ℹ️  Existing admin(s) in DB:`);
    existingAdmins.forEach((a) => console.log(`   • ${a.email}  (${a.status})`));
    console.log('');
  }

  const hashed = await bcrypt.hash(ADMIN_PASSWORD, SALT);

  const admin = await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      $set: {
        email: ADMIN_EMAIL,
        password: hashed,
        firstName: 'Nandon',
        lastName: 'Admin',
        phone: '01617-298308',
        role: 'admin',
        status: 'active',
        isEmailVerified: true,
        isDeleted: false,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  console.log('🎉 Admin ready! Use these to log in:\n');
  console.log('   📧 Email:    ' + ADMIN_EMAIL);
  console.log('   🔑 Password: ' + ADMIN_PASSWORD);
  console.log('   🔰 Role:     ' + admin.role + '  (' + admin.status + ')\n');
  console.log('⚠️  Change this password after first login.');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
