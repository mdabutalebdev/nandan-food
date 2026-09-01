import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { Order } from '../order/order.model';
import { Product } from '../product/product.model';
import { User } from '../user/user.model';
import { Category } from '../category/category.model';

const AnalyticsController = {
    // GET /analytics/dashboard — Main dashboard summary
    getDashboardSummary: catchAsync(async (req: Request, res: Response) => {
        const [
            totalOrders,
            totalProducts,
            totalCustomers,
            totalCategories,
            pendingOrders,
            deliveredOrders,
        ] = await Promise.all([
            Order.countDocuments(),
            // `$ne: true`, not `false` — seeded products were written without the
            // field, so an equality match counts none of them.
            Product.countDocuments({ isDeleted: { $ne: true } }),
            User.countDocuments({ role: 'user' }),
            Category.countDocuments({ isActive: true }),
            Order.countDocuments({ status: 'pending' }),
            Order.countDocuments({ status: 'delivered' }),
        ]);

        const revenueData = await Order.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
        ]);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayOrders = await Order.countDocuments({ createdAt: { $gte: todayStart } });

        const todayRevenue = await Order.aggregate([
            { $match: { createdAt: { $gte: todayStart }, paymentStatus: 'paid' } },
            { $group: { _id: null, total: { $sum: '$total' } } },
        ]);

        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: 'Dashboard summary fetched',
            data: {
                totalRevenue: revenueData[0]?.totalRevenue || 0,
                totalOrders,
                totalProducts,
                totalCustomers,
                totalCategories,
                pendingOrders,
                deliveredOrders,
                todayOrders,
                todayRevenue: todayRevenue[0]?.total || 0,
            },
        });
    }),

    // GET /analytics/monthly-revenue
    getMonthlyRevenue: catchAsync(async (req: Request, res: Response) => {
        const monthlyRevenue = await Order.aggregate([
            { $match: { paymentStatus: 'paid' } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                    },
                    revenue: { $sum: '$total' },
                    orders: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
            { $limit: 12 },
        ]);

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const data = monthlyRevenue.map((item) => ({
            month: months[item._id.month - 1],
            year: item._id.year,
            revenue: item.revenue,
            orders: item.orders,
        }));

        sendResponse(res, { statusCode: 200, success: true, message: 'Monthly revenue fetched', data });
    }),

    // GET /analytics/recent-orders
    getRecentOrders: catchAsync(async (req: Request, res: Response) => {
        const limit = Number(req.query.limit) || 10;
        const orders = await Order.find()
            .populate('user', 'name email')
            .sort('-createdAt')
            .limit(limit)
            .select('orderNumber user total status paymentStatus paymentMethod items createdAt');

        sendResponse(res, { statusCode: 200, success: true, message: 'Recent orders fetched', data: orders });
    }),

    // GET /analytics/top-products
    getTopProducts: catchAsync(async (req: Request, res: Response) => {
        const limit = Number(req.query.limit) || 10;
        const topProducts = await Product.find({ isDeleted: { $ne: true } })
            .sort('-totalSold')
            .limit(limit)
            .select('name thumbnail price totalSold stock category averageRating');

        sendResponse(res, { statusCode: 200, success: true, message: 'Top products fetched', data: topProducts });
    }),

    // GET /analytics/sales-by-category
    getSalesByCategory: catchAsync(async (req: Request, res: Response) => {
        const salesByCategory = await Order.aggregate([
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product',
                    foreignField: '_id',
                    as: 'productInfo',
                },
            },
            { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'productInfo.category',
                    foreignField: '_id',
                    as: 'categoryInfo',
                },
            },
            { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$categoryInfo._id',
                    name: { $first: '$categoryInfo.name' },
                    totalSales: { $sum: '$items.total' },
                    totalItems: { $sum: '$items.quantity' },
                },
            },
            { $sort: { totalSales: -1 } },
            { $limit: 10 },
        ]);

        sendResponse(res, { statusCode: 200, success: true, message: 'Sales by category fetched', data: salesByCategory });
    }),

    // GET /analytics/revenue
    getRevenueStats: catchAsync(async (req: Request, res: Response) => {
        const { startDate, endDate } = req.query;
        const match: any = { paymentStatus: 'paid' };

        if (startDate) match.createdAt = { $gte: new Date(startDate as string) };
        if (endDate) {
            match.createdAt = { ...match.createdAt, $lte: new Date(endDate as string) };
        }

        const dailyRevenue = await Order.aggregate([
            { $match: match },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    revenue: { $sum: '$total' },
                    orders: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        sendResponse(res, { statusCode: 200, success: true, message: 'Revenue stats fetched', data: dailyRevenue });
    }),

    /**
     * GET /analytics/sales-report?from&to&channel&status
     * One call that powers the whole Reports page: headline totals, the daily
     * series, and the by-channel / by-status / by-payment / by-product splits.
     */
    getSalesReport: catchAsync(async (req: Request, res: Response) => {
        const { from, to, channel, status } = req.query;

        const match: any = { isDeleted: { $ne: true } };
        if (from || to) {
            match.createdAt = {};
            if (from) match.createdAt.$gte = new Date(String(from));
            if (to) {
                const end = new Date(String(to));
                end.setHours(23, 59, 59, 999);
                match.createdAt.$lte = end;
            }
        }
        if (channel && channel !== 'all') match.salesChannel = channel;
        if (status && status !== 'all') match.status = status;

        const [summaryAgg, daily, byChannel, byStatus, byPayment, topProducts, byCategory] = await Promise.all([
            Order.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: null,
                        orders: { $sum: 1 },
                        revenue: { $sum: '$total' },
                        subtotal: { $sum: '$subtotal' },
                        discount: { $sum: { $add: ['$discount', { $ifNull: ['$manualDiscount', 0] }] } },
                        shipping: { $sum: '$shippingCost' },
                        paid: { $sum: { $ifNull: ['$paidAmount', 0] } },
                        items: { $sum: { $sum: '$items.quantity' } },
                    },
                },
            ]),
            Order.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        revenue: { $sum: '$total' },
                        orders: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
            Order.aggregate([
                { $match: match },
                { $group: { _id: { $ifNull: ['$salesChannel', 'online'] }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
                { $sort: { revenue: -1 } },
            ]),
            Order.aggregate([
                { $match: match },
                { $group: { _id: '$status', revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
                { $sort: { orders: -1 } },
            ]),
            Order.aggregate([
                { $match: match },
                { $group: { _id: '$paymentMethod', revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
                { $sort: { revenue: -1 } },
            ]),
            Order.aggregate([
                { $match: match },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.product',
                        name: { $first: '$items.name' },
                        thumbnail: { $first: '$items.thumbnail' },
                        qty: { $sum: '$items.quantity' },
                        revenue: { $sum: '$items.total' },
                    },
                },
                { $sort: { revenue: -1 } },
                { $limit: 15 },
            ]),
            Order.aggregate([
                { $match: match },
                { $unwind: '$items' },
                { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'p' } },
                { $unwind: { path: '$p', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: 'categories', localField: 'p.category', foreignField: '_id', as: 'c' } },
                { $unwind: { path: '$c', preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: '$c._id',
                        name: { $first: { $ifNull: ['$c.name', 'Uncategorised'] } },
                        revenue: { $sum: '$items.total' },
                        qty: { $sum: '$items.quantity' },
                    },
                },
                { $sort: { revenue: -1 } },
                { $limit: 10 },
            ]),
        ]);

        const s = summaryAgg[0] || {};
        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: 'Sales report fetched',
            data: {
                summary: {
                    orders: s.orders || 0,
                    revenue: s.revenue || 0,
                    subtotal: s.subtotal || 0,
                    discount: s.discount || 0,
                    shipping: s.shipping || 0,
                    paid: s.paid || 0,
                    due: Math.max(0, (s.revenue || 0) - (s.paid || 0)),
                    items: s.items || 0,
                    avgOrderValue: s.orders ? Math.round((s.revenue || 0) / s.orders) : 0,
                },
                daily: daily.map((d: any) => ({ date: d._id, revenue: d.revenue, orders: d.orders })),
                byChannel, byStatus, byPayment, topProducts, byCategory,
            },
        });
    }),

    /** GET /analytics/top-customers?from&to&limit — who is spending the most. */
    getTopCustomers: catchAsync(async (req: Request, res: Response) => {
        const { from, to } = req.query;
        const limit = Number(req.query.limit) || 10;

        const match: any = { isDeleted: { $ne: true } };
        if (from || to) {
            match.createdAt = {};
            if (from) match.createdAt.$gte = new Date(String(from));
            if (to) {
                const end = new Date(String(to));
                end.setHours(23, 59, 59, 999);
                match.createdAt.$lte = end;
            }
        }

        const rows = await Order.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$shippingAddress.phone',
                    name: { $first: '$shippingAddress.fullName' },
                    company: { $first: '$corporate.companyName' },
                    orders: { $sum: 1 },
                    revenue: { $sum: '$total' },
                    lastOrder: { $max: '$createdAt' },
                },
            },
            { $sort: { revenue: -1 } },
            { $limit: limit },
        ]);

        sendResponse(res, { statusCode: 200, success: true, message: 'Top customers fetched', data: rows });
    }),
};

export default AnalyticsController;
