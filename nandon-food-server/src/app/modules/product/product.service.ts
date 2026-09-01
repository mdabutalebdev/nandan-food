import { Product } from './product.model';
import { Category } from '../category/category.model';
import AppError from '../../utils/AppError';
import QueryBuilder from '../../utils/QueryBuilder';

const ProductService = {
    // ── Get all products (public, with full filtering) ──────────────────
    async getAllProducts(query: Record<string, unknown>) {
        // Country filter (sourcing origin). "All"/empty means no country filter.
        const country = typeof query.country === 'string' && query.country && query.country !== 'All'
            ? (query.country as string)
            : undefined;
        // Remove invalid country value so QueryBuilder.filter() doesn't filter on "All"/empty.
        // Valid values are applied automatically by filter() (normal path) and injected
        // explicitly into the search+category rebuild path below.
        if (!country) {
            delete query.country;
        }

        // Multi-select sidebar filters arrive comma-separated ("Palermo,Glarvest").
        // QueryBuilder.filter() only does equality, so pull them out and apply $in.
        const csv = (v: unknown) =>
            typeof v === 'string' && v.trim()
                ? v.split(',').map(s => s.trim()).filter(Boolean)
                : [];
        const brands = csv(query.brand);
        const flags = csv(query.flag);
        // `ids` powers admin-curated lists (home page sliders) — an explicit set of products
        const ids = csv(query.ids);
        // `categoryIds` powers category pages — a category plus all its descendants.
        // A product matches when either its category OR subcategory is in the set.
        const categoryFilterIds = csv(query.categoryIds);
        delete query.brand;
        delete query.flag;
        delete query.ids;
        delete query.categoryIds;
        const multiFilter: any = {};
        if (brands.length) multiFilter.brand = { $in: brands };
        if (flags.length) multiFilter.flags = { $in: flags };
        if (ids.length) multiFilter._id = { $in: ids };
        if (categoryFilterIds.length) {
            multiFilter.$or = [
                { category: { $in: categoryFilterIds } },
                { subcategory: { $in: categoryFilterIds } },
            ];
        }

        // If searching, also look for matching categories by name
        let categoryIds: string[] = [];
        if (query.searchTerm) {
            const matchingCategories = await Category.find({
                name: { $regex: query.searchTerm as string, $options: 'i' },
            }).select('_id');
            categoryIds = matchingCategories.map((c) => c._id.toString());
        }

        // Build base query — if we found matching categories, include them
        let baseFilter: any = { isDeleted: false, ...multiFilter };
        if (categoryIds.length > 0 && query.searchTerm) {
            // Will be merged with search conditions via $and
            baseFilter = {
                isDeleted: false,
                ...multiFilter,
                $or: [
                    { category: { $in: categoryIds } },
                    // The QueryBuilder.search() will add field-level search conditions
                    { _searchPlaceholder: true },
                ],
            };
        }

        const productQuery = new QueryBuilder(
            Product.find(categoryIds.length > 0 ? { isDeleted: false, ...multiFilter } : baseFilter)
                .populate('category', 'name slug')
                .populate('subcategory', 'name slug'),
            query
        )
            .search(['name', 'description', 'tags', 'colors', 'aiLabels', 'slug'])
            .filter()
            .sort()
            .paginate()
            .fields();

        // If we have matching category IDs, merge them into the query
        if (categoryIds.length > 0 && query.searchTerm) {
            const currentFilter = productQuery.modelQuery.getFilter();
            productQuery.modelQuery = Product.find({
                isDeleted: false,
                ...(country ? { country } : {}),
                ...multiFilter,
                $or: [
                    { category: { $in: categoryIds } },
                    ...(currentFilter.$and || [currentFilter]),
                ],
            })
                .populate('category', 'name slug')
                .populate('subcategory', 'name slug');

            // Re-apply sort, paginate, fields
            const sort = (query?.sort as string)?.split(',')?.join(' ') || '-createdAt';
            const page = Number(query?.page) || 1;
            const limit = Number(query?.limit) || 10;
            const skip = (page - 1) * limit;
            productQuery.modelQuery = productQuery.modelQuery.sort(sort).skip(skip).limit(limit);
        }

        const products = await productQuery.modelQuery;
        const meta = await productQuery.countTotal();

        // ── Sidebar facets ────────────────────────────────────────────────
        // Each facet is counted with its own constraint removed from the filter.
        // Otherwise the option you just picked would be the only one left with a
        // count (and the price slider would collapse onto your own selection).
        const listFilter: any = productQuery.modelQuery.getFilter();
        const without = (key: string) => {
            const f = { ...listFilter };
            delete f[key];
            return f;
        };

        const [boundsRows, brandRows, flagRows] = await Promise.all([
            Product.aggregate([
                { $match: without('price') },
                { $group: { _id: null, minPrice: { $min: '$price' }, maxPrice: { $max: '$price' } } },
            ]),
            Product.aggregate([
                { $match: without('brand') },
                { $match: { brand: { $nin: ['', null] } } },
                { $group: { _id: '$brand', count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            Product.aggregate([
                { $match: without('flags') },
                { $unwind: '$flags' },
                { $group: { _id: '$flags', count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
        ]);

        return {
            products,
            meta: {
                ...meta,
                minPrice: boundsRows[0]?.minPrice ?? 0,
                maxPrice: boundsRows[0]?.maxPrice ?? 0,
                brands: brandRows.map((b) => ({ name: b._id, count: b.count })),
                flags: flagRows.map((f) => ({ name: f._id, count: f.count })),
            },
        };
    },

    // ── Get single product ──────────────────────────────────────────────
    async getProductById(id: string) {
        const product = await Product.findOne({ _id: id, isDeleted: { $ne: true } })
            .populate('category', 'name slug')
            .populate('subcategory', 'name slug');
        if (!product) throw new AppError(404, 'Product not found');

        // Increment view count
        await Product.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
        return product;
    },

    // ── Get product by slug ─────────────────────────────────────────────
    async getProductBySlug(slug: string) {
        let product = await Product.findOne({ slug, isDeleted: { $ne: true } })
            .populate('category', 'name slug')
            .populate('subcategory', 'name slug');

        // Backward-compat: old slugs ended with a "-<timestamp>" (e.g. "-1784991225336").
        // If the clean slug misses, strip a trailing numeric segment and retry so any
        // previously shared link keeps resolving to the product.
        if (!product) {
            const stripped = slug.replace(/-\d{6,}$/, '');
            if (stripped && stripped !== slug) {
                product = await Product.findOne({ slug: stripped, isDeleted: { $ne: true } })
                    .populate('category', 'name slug')
                    .populate('subcategory', 'name slug');
            }
        }

        if (!product) throw new AppError(404, 'Product not found');
        await Product.findByIdAndUpdate(product._id, { $inc: { viewCount: 1 } });
        return product;
    },

    // ── Admin stats ─────────────────────────────────────────────────────
    async getProductStats() {
        const [total, active, draft, outOfStock] = await Promise.all([
            Product.countDocuments({ isDeleted: false }),
            Product.countDocuments({ isDeleted: false, status: 'active' }),
            Product.countDocuments({ isDeleted: false, status: 'draft' }),
            Product.countDocuments({ isDeleted: false, status: 'out-of-stock' }),
        ]);
        return { total, active, draft, outOfStock };
    },

    // ── Create product ──────────────────────────────────────────────────
    async createProduct(payload: any) {
        // Normalise empty subcategory to null
        if (!payload.subcategory) payload.subcategory = null;

        const product = await Product.create(payload);

        // Update category (and subcategory) product counts
        await Category.findByIdAndUpdate(payload.category, { $inc: { productCount: 1 } });
        if (payload.subcategory) {
            await Category.findByIdAndUpdate(payload.subcategory, { $inc: { productCount: 1 } });
        }

        return product;
    },

    // ── Update product ──────────────────────────────────────────────────
    async updateProduct(id: string, payload: any) {
        // Remove discount from payload — it's auto-calculated in pre-save
        delete payload.discount;
        // Normalise empty subcategory to null (allows clearing it)
        if (payload.subcategory === '' || payload.subcategory === undefined) {
            if ('subcategory' in payload) payload.subcategory = null;
        }
        // `isDeleted: { $ne: true }` — not `isDeleted: false`. Seeded documents were
        // written without the field, so an equality match silently 404s on them.
        const product = await Product.findOneAndUpdate(
            { _id: id, isDeleted: { $ne: true } },
            payload,
            { new: true, runValidators: true }
        )
            .populate('category', 'name slug')
            .populate('subcategory', 'name slug');
        if (!product) throw new AppError(404, 'Product not found');
        return product;
    },

    // ── Delete product (soft) ───────────────────────────────────────────
    async deleteProduct(id: string) {
        const product = await Product.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
        if (!product) throw new AppError(404, 'Product not found');

        // Update category (and subcategory) product counts
        await Category.findByIdAndUpdate(product.category, { $inc: { productCount: -1 } });
        if ((product as any).subcategory) {
            await Category.findByIdAndUpdate((product as any).subcategory, { $inc: { productCount: -1 } });
        }
        return product;
    },

    // ── Bulk status update ──────────────────────────────────────────────
    async bulkUpdateStatus(ids: string[], status: string) {
        const result = await Product.updateMany(
            { _id: { $in: ids }, isDeleted: false },
            { status }
        );
        return result;
    },

    // ── Bulk delete ─────────────────────────────────────────────────────
    async bulkDelete(ids: string[]) {
        const result = await Product.updateMany({ _id: { $in: ids } }, { isDeleted: true });
        return result;
    },

    // ── Update stock (no longer needed — stock field removed) ───────────
    // Kept for API compatibility; status can still be set to out-of-stock manually

    // ── Featured products (top selling active products) ─────────────────
    async getFeaturedProducts(limit = 8) {
        return await Product.find({ isDeleted: false, status: 'active' })
            .populate('category', 'name slug')
            .sort({ totalSold: -1 })
            .limit(limit);
    },

    // ── Related products (same category) ────────────────────────────────
    async getRelatedProducts(productId: string, categoryId: string, limit = 6) {
        return await Product.find({
            _id: { $ne: productId },
            category: categoryId,
            isDeleted: false,
            status: 'active',
        })
            .populate('category', 'name slug')
            .sort({ rating: -1 })
            .limit(limit);
    },

    // ── Increment stat (like, share, view, comment) ─────────────────────
    async incrementStat(id: string, field: string) {
        const allowedFields = ['likeCount', 'shareCount', 'viewCount', 'commentCount'];
        if (!allowedFields.includes(field)) {
            throw new AppError(400, `Invalid stat field: ${field}`);
        }
        const product = await Product.findByIdAndUpdate(
            id,
            { $inc: { [field]: 1 } },
            { new: true }
        );
        if (!product) throw new AppError(404, 'Product not found');
        return product;
    },
};

export default ProductService;
