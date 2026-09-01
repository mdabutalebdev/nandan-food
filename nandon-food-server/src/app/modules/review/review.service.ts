import { Types } from 'mongoose';
import { Review } from './review.model';
import AppError from '../../utils/AppError';
import QueryBuilder from '../../utils/QueryBuilder';

// Reviews written before moderation existed have no `status`. Backfill once per
// process from the old boolean so they don't silently vanish from the storefront.
let statusBackfilled = false;
const backfillStatus = async () => {
    if (statusBackfilled) return;
    statusBackfilled = true;
    try {
        await Review.updateMany({ status: { $exists: false }, isApproved: true }, { $set: { status: 'approved' } });
        await Review.updateMany({ status: { $exists: false } }, { $set: { status: 'pending' } });
    } catch {
        statusBackfilled = false; // let the next request retry
    }
};

const ReviewService = {
    async getProductReviews(productId: string, query: Record<string, unknown>) {
        await backfillStatus();

        const reviewQuery = new QueryBuilder(
            Review.find({ product: productId, status: 'approved' }).populate('user', 'firstName lastName avatar'),
            query
        ).sort().paginate();

        const reviews = await reviewQuery.modelQuery;
        const meta = await reviewQuery.countTotal();

        // Rating breakdown for the summary panel (all approved reviews, not just this page)
        const rows = await Review.aggregate([
            { $match: { product: new Types.ObjectId(productId), status: 'approved' } },
            { $group: { _id: '$rating', count: { $sum: 1 } } },
        ]);

        const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let total = 0;
        let sum = 0;
        for (const row of rows) {
            const star = Number(row._id);
            counts[star] = row.count;
            total += row.count;
            sum += star * row.count;
        }

        return {
            reviews,
            meta: {
                ...meta,
                summary: {
                    total,
                    average: total ? Math.round((sum / total) * 10) / 10 : 0,
                    counts,
                    // "Recommended" = 4 or 5 stars, the way the reference storefront counts it
                    recommended: counts[4] + counts[5],
                },
            },
        };
    },

    /**
     * Approved reviews across the whole catalogue, for the homepage testimonial
     * strip. Admin approval is the only gate: whatever an admin approves shows
     * here — no hidden rating or length rules to silently drop it.
     */
    async getShowcaseReviews(limit = 12) {
        await backfillStatus();

        return await Review.find({ status: 'approved' })
            .populate('user', 'firstName lastName avatar')
            .populate('product', 'name slug thumbnail')
            .sort('-createdAt')
            .limit(Math.min(limit, 30));
    },

    async createReview(userId: string, payload: any) {
        const exists = await Review.findOne({ product: payload.product, user: userId });
        if (exists) throw new AppError(400, 'You have already reviewed this product');
        return await Review.create({ ...payload, user: userId });
    },

    // Public (guest) review — no login required. Post-save hook on Review model
    // keeps product.reviewCount / commentCount / rating in sync.
    async publicCreateReview(payload: any) {
        const { product, rating, comment, userName, images, profession } = payload;
        return await Review.create({
            product,
            rating,
            comment,
            images: Array.isArray(images) ? images.slice(0, 3) : [],
            userName: userName?.trim() || 'Anonymous',
            profession: profession?.trim() || '',
            user: null,
            status: 'pending', // an admin has to approve it before it shows
        });
    },

    async updateReview(id: string, userId: string, payload: any) {
        const review = await Review.findOneAndUpdate(
            { _id: id, user: userId },
            payload,
            { new: true }
        );
        if (!review) throw new AppError(404, 'Review not found');
        return review;
    },

    async deleteReview(id: string, userId: string, isAdmin: boolean) {
        const filter = isAdmin ? { _id: id } : { _id: id, user: userId };
        const review = await Review.findOneAndDelete(filter);
        if (!review) throw new AppError(404, 'Review not found');
        return review;
    },

    async getAllReviews(query: Record<string, unknown>) {
        await backfillStatus();

        // Blank status = "all", so don't let QueryBuilder filter on an empty string
        const cleaned = { ...query };
        if (!cleaned.status) delete cleaned.status;

        const reviewQuery = new QueryBuilder(
            Review.find().populate('user', 'firstName lastName').populate('product', 'name thumbnail'),
            cleaned
        ).filter().sort().paginate();

        const reviews = await reviewQuery.modelQuery;
        const meta = await reviewQuery.countTotal();

        // Tab counters for the admin table
        const rows = await Review.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
        const counts = { pending: 0, approved: 0, rejected: 0 };
        for (const r of rows) {
            if (r._id in counts) (counts as any)[r._id] = r.count;
        }

        return { reviews, meta: { ...meta, counts } };
    },

    // Admin: approve / reject a review. Re-saved (not updateOne) so the model's
    // post-save hook recomputes the product's rating and review count.
    async setReviewStatus(id: string, status: 'pending' | 'approved' | 'rejected') {
        const review = await Review.findById(id);
        if (!review) throw new AppError(404, 'Review not found');
        review.status = status;
        await review.save();
        return review;
    },

    // Admin: update a review regardless of who wrote it (moderation + admin reply).
    // Looks up by id only — NOT by `user`, so an admin can edit guest / other
    // users' reviews (the old user-scoped path 404'd here, breaking admin reply).
    async adminUpdateReview(
        id: string,
        payload: { status?: 'pending' | 'approved' | 'rejected'; adminReply?: string; comment?: string; rating?: number; title?: string },
    ) {
        const review = await Review.findById(id);
        if (!review) throw new AppError(404, 'Review not found');

        if (payload.status) review.status = payload.status;
        if (typeof payload.adminReply === 'string') (review as any).adminReply = payload.adminReply.trim();
        if (typeof payload.comment === 'string') review.comment = payload.comment;
        if (typeof payload.rating === 'number') review.rating = payload.rating;
        if (typeof payload.title === 'string') review.title = payload.title;

        // Re-saved (not updateOne) so the post-save hook recomputes product stats.
        await review.save();
        return review;
    },

    // Public: increment review like count
    async likeReview(reviewId: string) {
        const review = await Review.findByIdAndUpdate(
            reviewId,
            { $inc: { likes: 1 } },
            { new: true }
        );
        if (!review) throw new AppError(404, 'Review not found');
        return review;
    },

    // Public: add reply to a review
    async replyToReview(reviewId: string, payload: { text: string; userName?: string }) {
        const text = (payload.text || '').trim();
        if (!text) throw new AppError(400, 'Reply text is required');

        const review = await Review.findByIdAndUpdate(
            reviewId,
            {
                $push: {
                    replies: {
                        text,
                        userName: payload.userName?.trim() || 'Anonymous',
                        likes: 0,
                    },
                },
            },
            { new: true }
        );
        if (!review) throw new AppError(404, 'Review not found');
        return review;
    },

    // Public: like a specific reply inside a review
    async likeReply(reviewId: string, replyId: string) {
        const review = await Review.findOneAndUpdate(
            { _id: reviewId, 'replies._id': replyId },
            { $inc: { 'replies.$.likes': 1 } },
            { new: true }
        );
        if (!review) throw new AppError(404, 'Reply not found');
        return review;
    },

    // Admin: recompute reviewCount / commentCount / rating for every product — fixes drift from legacy data
    async resyncProductStats() {
        const { Product } = require('../product/product.model');
        const aggregated = await Review.aggregate([
            { $match: { status: 'approved' } },
            {
                $group: {
                    _id: '$product',
                    count: { $sum: 1 },
                    avgRating: { $avg: '$rating' },
                },
            },
        ]);

        const statsByProduct = new Map<string, { count: number; rating: number }>();
        for (const row of aggregated) {
            statsByProduct.set(String(row._id), {
                count: row.count,
                rating: Math.round(row.avgRating * 10) / 10,
            });
        }

        const allProducts = await Product.find({}, '_id').lean();
        let updated = 0;
        for (const p of allProducts) {
            const s = statsByProduct.get(String(p._id)) || { count: 0, rating: 0 };
            await Product.findByIdAndUpdate(p._id, {
                reviewCount: s.count,
                commentCount: s.count,
                rating: s.rating,
            });
            updated++;
        }

        return { scanned: allProducts.length, updated };
    },
};

export default ReviewService;
