// Seeds the demo "Featured Categories" shown on the homepage.
// Run with:  npx ts-node src/scripts/seedCategories.ts
//
// Idempotent — matches on the category name, so re-running updates instead of
// duplicating. Images point at files shipped in the frontend's public folder;
// replace them from Admin → Categories once real artwork is ready.

import mongoose from 'mongoose';
import config from '../app/config';
import { Category } from '../app/modules/category/category.model';

const DEMO_CATEGORIES = [
    { name: 'Organic', icon: '🥗', image: '/images/categories/organic.svg' },
    { name: 'Honey', icon: '🍯', image: '/images/categories/honey.svg' },
    { name: 'Dates', icon: '🌴', image: '/images/categories/dates.svg' },
    { name: 'Spices', icon: '🌶️', image: '/images/categories/spices.svg' },
    { name: 'Nuts & Seeds', icon: '🥜', image: '/images/categories/nuts.svg' },
    { name: 'Beverage', icon: '🫖', image: '/images/categories/beverage.svg' },
    { name: 'Rice', icon: '🍚', image: '/images/categories/rice.svg' },
    { name: 'Flours & Lentils', icon: '🌾', image: '/images/categories/flours.svg' },
];

const slugify = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function main() {
    await mongoose.connect(config.database_url);
    console.log('✅ Connected:', config.database_url.replace(/\/\/[^@]+@/, '//***@'));

    for (const [index, cat] of DEMO_CATEGORIES.entries()) {
        const res = await Category.findOneAndUpdate(
            { name: cat.name },
            {
                $set: {
                    ...cat,
                    slug: slugify(cat.name),
                    parent: null,
                    level: 0,
                    order: index,
                    isActive: true,
                    isFeatured: true,
                    showInMenu: true,
                    showInHome: true,
                    isDeleted: false,
                },
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        console.log(`  ✔ ${cat.name.padEnd(18)} → ${res?._id}`);
    }

    const total = await Category.countDocuments({ isDeleted: { $ne: true } });
    console.log(`\n🎉 Done. ${DEMO_CATEGORIES.length} demo categories seeded (${total} total).`);
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
