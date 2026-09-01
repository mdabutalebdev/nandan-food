/**
 * One-off: set a real Facebook URL on the site-content socials so the footer
 * actually renders an icon (the footer hides any social whose url is '#' or empty).
 * Demonstrates the social system works end-to-end; edit/add the rest in Admin →
 * Site Content → Social Links.
 *
 * Run:  npx ts-node src/scripts/set-facebook-social.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const URI = process.env.DATABASE_URL || process.env.MONGODB_URI || '';

async function run() {
    if (!URI) { console.error('❌ DATABASE_URL not set'); process.exit(1); }
    await mongoose.connect(URI);
    const db = mongoose.connection.db;
    if (!db) { console.error('❌ no db'); process.exit(1); }

    const col = db.collection('sitecontents');
    const doc = await col.findOne({});
    if (!doc) { console.error('❌ No site-content document found'); process.exit(1); }

    const socials: any[] = (doc as any).contact?.socials || [];
    console.log('BEFORE:', JSON.stringify(socials.map(s => ({ label: s.label, url: s.url, active: s.active }))));

    const FB = 'https://facebook.com/freshfoodbazar1';
    const idx = socials.findIndex(s => (s.label || '').toLowerCase() === 'facebook');
    if (idx >= 0) { socials[idx].url = FB; socials[idx].active = true; }
    else { socials.push({ label: 'Facebook', url: FB, color: '#1877F2', active: true }); }

    await col.updateOne({ _id: (doc as any)._id }, { $set: { 'contact.socials': socials } });

    const after = await col.findOne({ _id: (doc as any)._id });
    console.log('AFTER :', JSON.stringify(((after as any).contact?.socials || []).map((s: any) => ({ label: s.label, url: s.url, active: s.active }))));
    console.log('✅ Facebook set with a real URL + active — it should now appear in the footer.');

    await mongoose.disconnect();
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
