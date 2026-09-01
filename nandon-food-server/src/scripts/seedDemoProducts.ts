// Seeds 2–3 demo products under every category created by seedCategories.ts.
// Run with:  npx ts-node src/scripts/seedDemoProducts.ts
//
// Idempotent — matches on product name, so re-running updates instead of
// duplicating. Saves through the document (not insertMany/updateOne) so the
// model's pre-save hooks still generate slug, SKU and the discount percentage.

import mongoose from 'mongoose';
import config from '../app/config';
import { Category } from '../app/modules/category/category.model';
import { Product } from '../app/modules/product/product.model';

interface DemoProduct {
    name: string;
    slugImage: string;   // file under /images/products
    price: number;
    originalPrice?: number;
    stock: number;
    description: string;
    tags: string[];
    sold: number;      // seeds the Top Selling ordering
    rating: number;
}

const CATALOGUE: Record<string, DemoProduct[]> = {
    Organic: [
        { name: 'Organic Cold Pressed Coconut Oil 500ml', slugImage: 'organic-coconut-oil-500ml', price: 620, originalPrice: 750, stock: 40, description: 'Cold pressed from fresh coconut kernels with no heat, no refining and no additives. Keeps its natural aroma — good for cooking, hair and skin.', tags: ['organic', 'oil', 'coconut'], sold: 198, rating: 4.6 },
        { name: 'Organic Apple Cider Vinegar 500ml', slugImage: 'organic-apple-cider-vinegar', price: 480, originalPrice: 560, stock: 35, description: 'Raw and unfiltered with the mother intact. Naturally fermented from organic apples, bottled without pasteurisation.', tags: ['organic', 'vinegar'], sold: 70, rating: 4.4 },
        { name: 'Organic Ghani Mustard Oil 1L', slugImage: 'organic-mustard-oil-1l', price: 540, originalPrice: 640, stock: 50, description: 'Wood-pressed in a traditional ghani so the pungency and nutrients survive. Pure mustard, nothing blended in.', tags: ['organic', 'oil', 'mustard'], sold: 351, rating: 4.7 },
    ],
    Honey: [
        { name: 'Sundarban Natural Honey 500g', slugImage: 'sundarban-natural-honey-500g', price: 850, originalPrice: 1000, stock: 30, description: 'Collected by traditional honey hunters from the Sundarban mangrove forest. Raw, unheated and unprocessed.', tags: ['honey', 'raw', 'sundarban'], sold: 412, rating: 4.9 },
        { name: 'African Organic Wild Honey 500g', slugImage: 'african-wild-honey-500g', price: 1250, originalPrice: 1450, stock: 25, description: 'EU and USDA certified wild honey with a deep, distinctive flavour. One hundred percent natural forest honey.', tags: ['honey', 'organic', 'certified'], sold: 271, rating: 4.8 },
        { name: 'Litchi Flower Honey 250g', slugImage: 'litchi-flower-honey-250g', price: 420, stock: 45, description: 'Light and floral, gathered during the litchi bloom. Delicate enough for tea and desserts.', tags: ['honey', 'litchi'], sold: 103, rating: 4.6 },
    ],
    Dates: [
        { name: 'Ajwa Dates 1kg', slugImage: 'ajwa-dates-1kg', price: 1450, originalPrice: 1700, stock: 28, description: 'Soft, dark Ajwa dates from Madinah with a fine texture and mild sweetness. Packed fresh.', tags: ['dates', 'ajwa'], sold: 386, rating: 4.8 },
        { name: 'Medjool Dates 1kg', slugImage: 'medjool-dates-1kg', price: 1250, originalPrice: 1400, stock: 32, description: 'Large, fleshy Medjool dates with a caramel-like sweetness. A premium everyday date.', tags: ['dates', 'medjool'], sold: 233, rating: 4.6 },
        { name: 'Sukkari Dates 1kg', slugImage: 'sukkari-dates-1kg', price: 980, stock: 40, description: 'Golden Sukkari dates that stay soft and melt in the mouth. A favourite for iftar.', tags: ['dates', 'sukkari'], sold: 117, rating: 4.5 },
    ],
    Spices: [
        { name: 'Premium Chili Powder 200g', slugImage: 'premium-chili-powder-200g', price: 180, originalPrice: 220, stock: 60, description: 'Sun-dried red chillies stone-ground in small batches. Bright colour, no artificial dye.', tags: ['spice', 'chili'], sold: 164, rating: 4.4 },
        { name: 'Whole Cumin Seed 200g', slugImage: 'whole-cumin-seed-200g', price: 160, stock: 55, description: 'Hand-cleaned whole cumin with a strong, warm aroma. Grind fresh for the best flavour.', tags: ['spice', 'cumin'], sold: 47, rating: 4.2 },
        { name: 'Green Cardamom 50g', slugImage: 'green-cardamom-50g', price: 340, originalPrice: 400, stock: 38, description: 'Plump green cardamom pods picked at full aroma. A little goes a long way in tea and biryani.', tags: ['spice', 'cardamom'], sold: 151, rating: 4.7 },
    ],
    'Nuts & Seeds': [
        { name: 'Roasted Cashew Nuts 500g', slugImage: 'roasted-cashew-nuts-500g', price: 890, originalPrice: 1050, stock: 42, description: 'Whole W320 cashews roasted in small batches with a light salt finish. Crisp and fresh.', tags: ['nuts', 'cashew'], sold: 298, rating: 4.6 },
        { name: 'Premium Almonds 500g', slugImage: 'premium-almonds-500g', price: 760, originalPrice: 880, stock: 48, description: 'Plump California almonds, raw and unsalted. Ideal for soaking, baking or snacking.', tags: ['nuts', 'almond'], sold: 245, rating: 4.5 },
        { name: 'Mixed Healthy Seeds 250g', slugImage: 'mixed-seeds-250g', price: 380, stock: 50, description: 'A daily blend of pumpkin, sunflower, flax and chia seeds. Sprinkle over yoghurt or salad.', tags: ['seeds', 'healthy'], sold: 58, rating: 4.3 },
    ],
    Beverage: [
        { name: 'Original Green Tea 100g', slugImage: 'green-tea-100g', price: 320, originalPrice: 380, stock: 55, description: 'Whole leaf green tea from high-grown gardens. Clean, grassy cup with no bitterness.', tags: ['tea', 'green tea'], sold: 128, rating: 4.4 },
        { name: 'Masala Tea Premix 200g', slugImage: 'masala-tea-200g', price: 290, stock: 47, description: 'Black tea blended with cardamom, cinnamon, clove and ginger. Just add milk and sugar.', tags: ['tea', 'masala'], sold: 81, rating: 4.3 },
        { name: 'Rose Petal Tea 100g', slugImage: 'rose-tea-100g', price: 450, originalPrice: 520, stock: 26, description: 'Air-dried rose petals for a caffeine-free floral infusion. Soothing on its own or with honey.', tags: ['tea', 'rose', 'herbal'], sold: 35, rating: 4.5 },
    ],
    Rice: [
        { name: 'Chinigura Aromatic Rice 5kg', slugImage: 'chinigura-rice-5kg', price: 720, originalPrice: 820, stock: 60, description: 'Tiny-grain Chinigura with the classic aroma that fills the kitchen. Best for polao and payesh.', tags: ['rice', 'aromatic'], sold: 324, rating: 4.7 },
        { name: 'Katari Bhog Rice 5kg', slugImage: 'katari-bhog-rice-5kg', price: 680, stock: 65, description: 'Fine, fragrant Katari Bhog rice, well sorted and stone-free. Cooks light and separate.', tags: ['rice', 'katari'], sold: 140, rating: 4.5 },
    ],
    'Flours & Lentils': [
        { name: 'Red Lentil (Masoor Dal) 1kg', slugImage: 'red-lentil-masoor-dal-1kg', price: 145, originalPrice: 170, stock: 80, description: 'Cleaned and polished red lentil that cooks soft in minutes. The everyday dal.', tags: ['lentil', 'dal'], sold: 210, rating: 4.4 },
        { name: 'Chickpea Flour (Besan) 1kg', slugImage: 'chickpea-flour-besan-1kg', price: 165, stock: 70, description: 'Stone-ground from split chickpeas, sifted fine. Ready for piyaju, beguni and batter.', tags: ['flour', 'besan'], sold: 92, rating: 4.2 },
        { name: 'Whole Wheat Atta 2kg', slugImage: 'whole-wheat-atta-2kg', price: 210, originalPrice: 245, stock: 75, description: 'Chakki-ground whole wheat with the bran retained. Makes soft, everyday ruti.', tags: ['flour', 'atta', 'wheat'], sold: 176, rating: 4.3 },
    ],
};

async function main() {
    await mongoose.connect(config.database_url);
    console.log('✅ Connected:', config.database_url.replace(/\/\/[^@]+@/, '//***@'));

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const [categoryName, products] of Object.entries(CATALOGUE)) {
        const category = await Category.findOne({ name: categoryName, isDeleted: { $ne: true } });

        if (!category) {
            console.log(`  ⚠ Category "${categoryName}" not found — run seedCategories.ts first. Skipping ${products.length} product(s).`);
            skipped += products.length;
            continue;
        }

        console.log(`\n  ${categoryName}`);

        for (const p of products) {
            const thumbnail = `/images/products/${p.slugImage}.svg`;
            const fields = {
                name: p.name,
                description: p.description,
                price: p.price,
                originalPrice: p.originalPrice ?? null,
                thumbnail,
                images: [thumbnail],
                category: category._id,
                subcategory: null,
                priceType: 'fixed' as const,
                productType: 'simple' as const,
                stock: p.stock,
                status: 'active' as const,
                visibility: 'visible' as const,
                isDeleted: false,
                tags: p.tags,
                country: 'Bangladesh' as const,
                totalSold: p.sold,
                rating: p.rating,
                reviewCount: Math.round(p.sold / 6),
            };

            const existing = await Product.findOne({ name: p.name });

            if (existing) {
                existing.set(fields);
                await existing.save();
                updated++;
                console.log(`    ↻ ${p.name}`);
            } else {
                await new Product(fields).save();
                created++;
                console.log(`    + ${p.name}`);
            }
        }
    }

    const total = await Product.countDocuments({ isDeleted: { $ne: true } });
    console.log(`\n🎉 Done. ${created} created, ${updated} updated, ${skipped} skipped — ${total} products total.`);
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
