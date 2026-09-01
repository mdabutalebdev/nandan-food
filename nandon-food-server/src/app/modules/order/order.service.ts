import { Order } from './order.model';
import { Product } from '../product/product.model';
import { User } from '../user/user.model';
import { Coupon } from '../coupon/coupon.model';
import AppError from '../../utils/AppError';
import QueryBuilder from '../../utils/QueryBuilder';
import { notifyOrderToWhatsApp } from '../../utils/whatsappNotify';

/**
 * Resolve the delivery charge for an address from Settings.
 * Admins maintain a free-form list of zones (`deliveryZones`); the legacy
 * inside/outside-Dhaka pair is the fallback when no zone matches.
 */
export async function resolveShippingCost(
    shippingAddress: any,
    zoneName?: string,
    subtotal = 0,
): Promise<{ cost: number; zone: string }> {
    const { SiteContent } = require('../siteContent/siteContent.model');
    const site: any = await SiteContent.findOne({ _key: 'main' });
    if (!site) return { cost: 0, zone: '' };

    const zones: any[] = Array.isArray(site.deliveryZones) ? site.deliveryZones.filter((z: any) => z.active !== false) : [];

    // Free delivery threshold wins over every zone rate.
    const freeAbove = Number(site.freeDeliveryAbove) || 0;
    if (freeAbove > 0 && subtotal >= freeAbove) return { cost: 0, zone: 'Free delivery' };

    if (zones.length) {
        const wanted = String(zoneName || '').trim().toLowerCase();
        let match = wanted ? zones.find((z: any) => String(z.name).toLowerCase() === wanted) : null;

        // No explicit zone sent — match the city name, else fall back to the
        // zone the admin marked as default (or simply the first one).
        if (!match) {
            const city = String(shippingAddress?.city || '').trim().toLowerCase();
            match = zones.find((z: any) => String(z.name).toLowerCase() === city)
                || zones.find((z: any) => z.isDefault)
                || zones[0];
        }
        if (match) return { cost: Number(match.charge) || 0, zone: match.name };
    }

    // Legacy fallback
    const dc = site.deliveryCharge || {};
    if (shippingAddress?.city === 'Dhaka') return { cost: dc.insideDhaka ?? 60, zone: 'Inside Dhaka' };
    if (shippingAddress?.city) return { cost: dc.outsideDhaka ?? 120, zone: 'Outside Dhaka' };
    return { cost: 0, zone: '' };
}

const OrderService = {
    async getAllOrders(query: Record<string, unknown>) {
        const filter: Record<string, unknown> = { isDeleted: { $ne: true } };

        if (query.status && query.status !== 'all') filter.status = query.status;
        if (query.salesChannel && query.salesChannel !== 'all') {
            // Orders placed before the channel field existed are website orders,
            // so "online" has to match a missing value too.
            filter.salesChannel = query.salesChannel === 'online'
                ? { $in: ['online', null] }
                : query.salesChannel;
        }
        if (query.paymentStatus && query.paymentStatus !== 'all') filter.paymentStatus = query.paymentStatus;
        if (query.paymentMethod && query.paymentMethod !== 'all') filter.paymentMethod = query.paymentMethod;
        if (query.orderSource && query.orderSource !== 'all') filter.orderSource = query.orderSource;

        // Date range on the order date
        if (query.from || query.to) {
            const range: Record<string, Date> = {};
            if (query.from) range.$gte = new Date(String(query.from));
            if (query.to) {
                const end = new Date(String(query.to));
                end.setHours(23, 59, 59, 999);
                range.$lte = end;
            }
            filter.createdAt = range;
        }

        // Free-text search across order id, invoice no, customer name / phone
        if (query.searchTerm) {
            const rx = { $regex: String(query.searchTerm).trim(), $options: 'i' };
            filter.$or = [
                { orderId: rx },
                { invoiceNo: rx },
                { 'shippingAddress.fullName': rx },
                { 'shippingAddress.phone': rx },
                { 'corporate.companyName': rx },
            ];
        }

        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const sort = String(query.sort || '-createdAt');

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .populate('user', 'firstName lastName email phone')
                .populate('items.product', 'name thumbnail slug')
                .sort(sort)
                .skip((page - 1) * limit)
                .limit(limit),
            Order.countDocuments(filter),
        ]);

        // Totals for the whole filtered set, not just the page on screen.
        const [agg] = await Order.aggregate([
            { $match: filter },
            { $group: { _id: null, revenue: { $sum: '$total' }, paid: { $sum: '$paidAmount' } } },
        ]);

        return {
            orders,
            summary: { revenue: agg?.revenue || 0, paid: agg?.paid || 0, count: total },
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    },

    async getMyOrders(userId: string, query: Record<string, unknown>) {
        const orderQuery = new QueryBuilder(
            Order.find({ user: userId, isDeleted: { $ne: true } }).populate('items.product', 'name thumbnail slug'),
            query
        ).sort().paginate();

        const orders = await orderQuery.modelQuery;
        const meta = await orderQuery.countTotal();
        return { orders, meta };
    },

    async getOrderById(id: string, userId?: string) {
        const filter: any = { _id: id };
        if (userId) filter.user = userId; // non-admin can only see their own

        const order = await Order.findOne(filter)
            .populate('user', 'firstName lastName email phone')
            .populate('items.product', 'name thumbnail slug price');
        if (!order) throw new AppError(404, 'Order not found');

        // Orders placed before invoicing existed get a number the first time
        // they are opened, stamped with their own date rather than today's.
        if (!order.invoiceNo) {
            const placed = (order as any).createdAt ? new Date((order as any).createdAt) : new Date();
            const channel = order.salesChannel || 'online';
            const prefix = { online: 'ONL', corporate: 'CRP', direct: 'DIR' }[channel] || 'ONL';
            const monthStart = new Date(placed.getFullYear(), placed.getMonth(), 1);
            const monthEnd = new Date(placed.getFullYear(), placed.getMonth() + 1, 1);
            const seq = await Order.countDocuments({
                createdAt: { $gte: monthStart, $lt: monthEnd, $lte: placed },
                $or: [{ salesChannel: channel }, ...(channel === 'online' ? [{ salesChannel: null }] : [])],
            });
            const stamp = `${String(placed.getFullYear()).slice(-2)}${String(placed.getMonth() + 1).padStart(2, '0')}`;
            order.invoiceNo = `NF-${prefix}-${stamp}-${String(seq).padStart(4, '0')}`;
            order.invoiceDate = order.invoiceDate || placed;
            order.salesChannel = channel;
            await order.save();
        }

        return order;
    },

    // Public order tracking — no login. The customer proves ownership with the
    // Order ID plus the phone number used at checkout (last 10 digits match).
    async trackOrder(orderId: string, phone: string) {
        const cleanId = String(orderId || '').trim().toUpperCase();
        const cleanPhone = String(phone || '').replace(/\D/g, '');
        if (!cleanId || !cleanPhone) {
            throw new AppError(400, 'Please enter both your Order ID and phone number');
        }

        const order = await Order.findOne({ orderId: cleanId, isDeleted: { $ne: true } })
            .select('orderId status timeline items subtotal shippingCost discount total couponCode createdAt trackingNumber carrier paymentMethod paymentStatus shippingAddress')
            .populate('items.product', 'name thumbnail slug');
        if (!order) {
            throw new AppError(404, 'No order found with that Order ID. Please check and try again.');
        }

        const orderPhone = String((order as any).shippingAddress?.phone || '').replace(/\D/g, '');
        if (!orderPhone || orderPhone.slice(-10) !== cleanPhone.slice(-10)) {
            throw new AppError(404, 'Order ID and phone number do not match.');
        }

        return order;
    },

    async createOrder(userId: string, payload: any) {
        const { items, shippingAddress, billingAddress, paymentMethod, paymentDetails, couponCode, note } = payload;

        // Get product details and calculate totals
        let subtotal = 0;
        const orderItems = [];

        for (const item of items) {
            const product: any = await Product.findOne({ _id: item.product, isDeleted: false, status: 'active' });
            if (!product) throw new AppError(404, `Product not found: ${item.product}`);

            // ── Resolve the unit price the SAME way the storefront shows it ──
            // 1) If a matching variant exists, use its (discounted) price + its stock.
            // 2) Otherwise use the product price with its %-offer applied.
            let variant: any = null;
            if ((item.color || item.size) && Array.isArray(product.variants) && product.variants.length > 0) {
                variant = product.variants.find((v: any) =>
                    (!item.color || v.color === item.color) && (!item.size || v.size === item.size)
                );
            }

            let unitPrice: number;
            let thumb = product.thumbnail;

            if (variant) {
                unitPrice = variant.price;
                if (variant.images?.[0]) thumb = variant.images[0];
            } else {
                unitPrice = product.price;
            }

            // Note: out-of-stock items are still allowed (sourcing model — the
            // shop sources on demand). Stock may go negative to signal backorder.

            const itemTotal = unitPrice * item.quantity;
            subtotal += itemTotal;

            orderItems.push({
                product: product._id,
                name: product.name,
                thumbnail: thumb,
                price: unitPrice,
                quantity: item.quantity,
                total: itemTotal,
                color: item.color || '',
                size: item.size || '',
                variantId: variant?._id || undefined,
            });
        }

        // Apply coupon
        let discount = 0;
        let appliedCoupon: any = null;
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
            if (coupon && coupon.expiresAt > new Date()) {
                const limitLeft = !coupon.usageLimit || coupon.usedCount < coupon.usageLimit;
                if (limitLeft && subtotal >= (coupon.minOrderAmount || 0)) {
                    if (coupon.discountType === 'percentage') {
                        discount = (subtotal * coupon.discountValue) / 100;
                        if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
                    } else {
                        discount = coupon.discountValue;
                    }
                    discount = Math.min(discount, subtotal);
                    appliedCoupon = coupon;
                }
            }
        }

        const { cost: shippingCost, zone: deliveryZone } = await resolveShippingCost(
            shippingAddress,
            payload.deliveryZone,
            subtotal - discount,
        );
        const total = subtotal - discount + shippingCost;

        // Create order
        const order = await Order.create({
            user: userId,
            items: orderItems,
            shippingAddress,
            // Billing defaults to a copy of shipping when not sent separately.
            billingAddress: billingAddress || shippingAddress,
            salesChannel: 'online',
            orderSource: 'website',
            subtotal,
            shippingCost,
            deliveryZone,
            discount,
            total,
            couponCode: appliedCoupon ? appliedCoupon.code : '',
            paymentMethod,
            paymentDetails: paymentDetails || {},
            transactionId: paymentDetails?.transactionId || '',
            note: note || '',
            timeline: [{ status: 'pending', note: 'Order placed successfully' }],
        });

        // Count the coupon only once the order actually exists.
        if (appliedCoupon) {
            await Coupon.findByIdAndUpdate(appliedCoupon._id, { $inc: { usedCount: 1 } });
        }

        // Update stock and product sold count (variant stock when applicable)
        for (const item of orderItems) {
            if ((item as any).variantId) {
                // Decrement the specific variant's stock + the product's sold count
                await Product.updateOne(
                    { _id: item.product, 'variants._id': (item as any).variantId },
                    { $inc: { 'variants.$.stock': -item.quantity, totalSold: item.quantity } },
                );
            } else {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { stock: -item.quantity, totalSold: item.quantity },
                });
            }
        }

        // Update user stats
        await User.findByIdAndUpdate(userId, { $inc: { totalOrders: 1, totalSpent: total } });

        // Send WhatsApp notification to admin (fire & forget)
        const user = await User.findById(userId);
        notifyOrderToWhatsApp({
            orderNumber: order.orderId || order._id.toString(),
            customerName: shippingAddress.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
            customerPhone: shippingAddress.phone || user?.phone || '',
            address: shippingAddress.address || '',
            items: orderItems.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, color: i.color, size: i.size })),
            total,
            note: note || '',
        }).catch(() => {}); // never block order flow

        return order;
    },

    // ── Guest checkout: auto-create user + place order ────────────────
    async createGuestOrder(payload: any) {
        const { shippingAddress, paymentMethod, items, couponCode, note, password } = payload;
        const { fullName, email, phone } = shippingAddress;

        if (!phone || !fullName) {
            throw new AppError(400, 'Full name and phone number are required for checkout');
        }

        // Auto-generate guest email from phone if not provided
        const guestEmail = email || `${phone.replace(/\s+/g, '')}@guest.freshfoodbazar.com`;

        // Check if user already exists
        let user = await User.findOne({ $or: [{ email: guestEmail.toLowerCase() }, { phone }] });
        let isNewUser = false;

        if (!user) {
            // Auto-create account: phone number as password
            const nameParts = fullName.trim().split(' ');
            const firstName = nameParts[0] || 'Customer';
            const lastName = nameParts.slice(1).join(' ') || '.';

            user = await User.create({
                email: guestEmail.toLowerCase(),
                password: password || guestEmail.toLowerCase(),   // email is both login ID and password
                firstName,
                lastName,
                phone,
                role: 'user',
                status: 'active',
                isEmailVerified: false,
            });
            isNewUser = true;
        }

        // Now create order using the existing createOrder method
        const order = await this.createOrder(user._id!.toString(), payload);

        // Generate token for auto-login
        const jwt = require('jsonwebtoken');
        const appConfig = require('../../config').default;
        const accessToken = jwt.sign(
            { userId: user._id!.toString(), email: user.email, role: user.role },
            appConfig.jwt.access_secret,
            { expiresIn: appConfig.jwt.access_expires_in }
        );

        return {
            order,
            user: {
                _id: user._id!.toString(),
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                phone: user.phone,
            },
            accessToken,
            isNewUser,
        };
    },

    async updateOrderStatus(id: string, status: string, note?: string) {
        const order = await Order.findById(id);
        if (!order) throw new AppError(404, 'Order not found');

        order.status = status as any;
        order.timeline.push({ status, note: note || '', createdAt: new Date() } as any);

        // Update payment status when delivered
        if (status === 'delivered' && order.paymentMethod === 'cod') {
            order.paymentStatus = 'paid';
        }

        await order.save();
        return order;
    },

    async cancelOrder(id: string, userId: string) {
        const order = await Order.findOne({ _id: id, user: userId });
        if (!order) throw new AppError(404, 'Order not found');
        if (!['pending', 'confirmed'].includes(order.status)) {
            throw new AppError(400, 'Order cannot be cancelled at this stage');
        }

        order.status = 'cancelled';
        order.timeline.push({ status: 'cancelled', note: 'Cancelled by user', createdAt: new Date() } as any);
        await order.save();

        // Restore stock (variant stock when applicable)
        for (const item of order.items as any[]) {
            if (item.variantId) {
                await Product.updateOne(
                    { _id: item.product, 'variants._id': item.variantId },
                    { $inc: { 'variants.$.stock': item.quantity } },
                );
            } else {
                await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
            }
        }

        return order;
    },

    async updatePaymentStatus(id: string, paymentStatus: string) {
        const order = await Order.findById(id);
        if (!order) throw new AppError(404, 'Order not found');

        order.paymentStatus = paymentStatus as any;
        if (paymentStatus === 'paid') {
            order.transactionId = order.transactionId || `PAY-${Date.now()}`;
        }
        order.timeline.push({ status: `payment_${paymentStatus}`, note: `Payment marked as ${paymentStatus}`, createdAt: new Date() } as any);
        await order.save();
        return order;
    },

    /**
     * Admin-raised order — the Corporate / Direct sales book, plus the phone
     * orders staff key in by hand. Prices can be overridden per line (corporate
     * rates), delivery and discount are entered directly, and an invoice number
     * is stamped with the channel prefix.
     */
    async createManualOrder(adminId: string, payload: any) {
        const {
            salesChannel = 'direct',
            shippingAddress,
            billingAddress,
            corporate,
            items,
            couponCode,
            manualDiscount = 0,
            vat = 0,
            shippingCost,
            deliveryZone,
            paymentMethod = 'cash',
            paymentStatus = 'pending',
            paidAmount = 0,
            transactionId = '',
            status = 'confirmed',
            note = '',
            invoiceDate,
            createAccount = false,
        } = payload;

        if (!Array.isArray(items) || items.length === 0) throw new AppError(400, 'Add at least one product');
        if (!shippingAddress?.fullName || !shippingAddress?.phone) {
            throw new AppError(400, 'Customer name and phone are required');
        }

        let subtotal = 0;
        const orderItems: any[] = [];

        for (const item of items) {
            const product: any = await Product.findOne({ _id: item.product, isDeleted: { $ne: true } });
            if (!product) throw new AppError(404, `Product not found: ${item.product}`);

            let variant: any = null;
            if ((item.color || item.size) && Array.isArray(product.variants) && product.variants.length > 0) {
                variant = product.variants.find((v: any) =>
                    (!item.color || v.color === item.color) && (!item.size || v.size === item.size)
                );
            }

            // Admin may set a negotiated unit price; otherwise use the live price.
            const unitPrice = item.price !== undefined && item.price !== null && item.price !== ''
                ? Number(item.price)
                : (variant ? variant.price : product.price);

            const quantity = Number(item.quantity) || 1;
            const itemTotal = unitPrice * quantity;
            subtotal += itemTotal;

            orderItems.push({
                product: product._id,
                name: product.name,
                thumbnail: variant?.images?.[0] || product.thumbnail,
                price: unitPrice,
                quantity,
                total: itemTotal,
                color: item.color || '',
                size: item.size || '',
                variantId: variant?._id || undefined,
            });
        }

        // Coupon (optional on manual orders)
        let discount = 0;
        let appliedCoupon: any = null;
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase(), isActive: true });
            if (!coupon) throw new AppError(400, 'Invalid coupon code');
            if (coupon.expiresAt < new Date()) throw new AppError(400, 'Coupon has expired');
            if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new AppError(400, 'Coupon usage limit reached');
            if (subtotal < (coupon.minOrderAmount || 0)) throw new AppError(400, `Minimum order amount is ${coupon.minOrderAmount}`);

            if (coupon.discountType === 'percentage') {
                discount = (subtotal * coupon.discountValue) / 100;
                if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
            } else {
                discount = coupon.discountValue;
            }
            discount = Math.min(discount, subtotal);
            appliedCoupon = coupon;
        }

        // Delivery: an explicit figure wins; otherwise fall back to the zone table.
        let shipping = Number(shippingCost);
        let zoneName = deliveryZone || '';
        if (!Number.isFinite(shipping)) {
            const resolved = await resolveShippingCost(shippingAddress, deliveryZone, subtotal - discount);
            shipping = resolved.cost;
            zoneName = resolved.zone;
        }

        const extraDiscount = Number(manualDiscount) || 0;
        const vatAmount = Number(vat) || 0;
        const total = Math.max(0, subtotal - discount - extraDiscount + shipping + vatAmount);

        // Optionally attach (or create) a customer account so the buyer shows up
        // under Customers and can track the order online.
        let user: any = null;
        const phone = String(shippingAddress.phone).trim();
        user = await User.findOne({ phone });
        if (!user && createAccount) {
            const parts = String(shippingAddress.fullName).trim().split(' ');
            user = await User.create({
                email: (shippingAddress.email || `${phone.replace(/\s+/g, '')}@guest.nandonfood.com`).toLowerCase(),
                password: phone,
                firstName: parts[0] || 'Customer',
                lastName: parts.slice(1).join(' ') || '.',
                phone,
                role: 'user',
                status: 'active',
            });
        }

        const order = await Order.create({
            user: user?._id || null,
            items: orderItems,
            shippingAddress,
            billingAddress: billingAddress || shippingAddress,
            salesChannel,
            orderSource: 'admin',
            corporate: salesChannel === 'corporate' ? (corporate || {}) : undefined,
            subtotal,
            shippingCost: shipping,
            deliveryZone: zoneName,
            discount,
            manualDiscount: extraDiscount,
            vat: vatAmount,
            total,
            paidAmount: Number(paidAmount) || 0,
            couponCode: appliedCoupon ? appliedCoupon.code : '',
            status,
            paymentMethod,
            paymentStatus,
            transactionId,
            invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
            note,
            timeline: [{ status, note: `Invoice created by admin (${salesChannel} sale)`, createdAt: new Date() }],
        });

        if (appliedCoupon) await Coupon.findByIdAndUpdate(appliedCoupon._id, { $inc: { usedCount: 1 } });

        // Move stock the same way a storefront order does.
        for (const item of orderItems) {
            if (item.variantId) {
                await Product.updateOne(
                    { _id: item.product, 'variants._id': item.variantId },
                    { $inc: { 'variants.$.stock': -item.quantity, totalSold: item.quantity } },
                );
            } else {
                await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity, totalSold: item.quantity } });
            }
        }

        if (user) await User.findByIdAndUpdate(user._id, { $inc: { totalOrders: 1, totalSpent: total } });

        return order;
    },

    /** Admin edit of invoice-level fields (channel, payment, corporate details). */
    async updateOrder(id: string, payload: any) {
        const order = await Order.findById(id);
        if (!order) throw new AppError(404, 'Order not found');

        const editable = [
            'salesChannel', 'corporate', 'shippingAddress', 'billingAddress',
            'shippingCost', 'manualDiscount', 'vat', 'paidAmount',
            'paymentMethod', 'paymentStatus', 'transactionId', 'note',
            'trackingNumber', 'carrier', 'deliveryZone', 'invoiceDate',
        ];
        for (const key of editable) {
            if (payload[key] !== undefined) (order as any)[key] = payload[key];
        }

        // Keep the total consistent with whatever was just edited.
        order.total = Math.max(
            0,
            (order.subtotal || 0) - (order.discount || 0) - ((order as any).manualDiscount || 0)
            + (order.shippingCost || 0) + ((order as any).vat || 0),
        );

        order.timeline.push({ status: 'updated', note: 'Invoice updated by admin', createdAt: new Date() } as any);
        await order.save();
        return order;
    },

    async addAdminNote(id: string, note: string) {
        const order = await Order.findById(id);
        if (!order) throw new AppError(404, 'Order not found');

        order.timeline.push({ status: 'admin_note', note, createdAt: new Date() } as any);
        await order.save();
        return order;
    },

    async getOrderStats() {
        const notDeleted = { isDeleted: { $ne: true } };
        const [total, pending, confirmed, processing, shipped, delivered, cancelled] = await Promise.all([
            Order.countDocuments({ ...notDeleted }),
            Order.countDocuments({ ...notDeleted, status: 'pending' }),
            Order.countDocuments({ ...notDeleted, status: 'confirmed' }),
            Order.countDocuments({ ...notDeleted, status: 'processing' }),
            Order.countDocuments({ ...notDeleted, status: 'shipped' }),
            Order.countDocuments({ ...notDeleted, status: 'delivered' }),
            Order.countDocuments({ ...notDeleted, status: 'cancelled' }),
        ]);

        const revenueData = await Order.aggregate([
            { $match: { status: 'delivered', isDeleted: { $ne: true } } },
            { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
        ]);

        // Split by sales channel — Online / Corporate / Direct.
        const channelAgg = await Order.aggregate([
            { $match: notDeleted },
            { $group: { _id: '$salesChannel', count: { $sum: 1 }, revenue: { $sum: '$total' } } },
        ]);
        const byChannel: Record<string, { count: number; revenue: number }> = {
            online: { count: 0, revenue: 0 },
            corporate: { count: 0, revenue: 0 },
            direct: { count: 0, revenue: 0 },
        };
        for (const c of channelAgg) {
            byChannel[c._id || 'online'] = { count: c.count, revenue: c.revenue };
        }

        const [dueAgg] = await Order.aggregate([
            { $match: { ...notDeleted, status: { $nin: ['cancelled', 'returned'] } } },
            { $group: { _id: null, total: { $sum: '$total' }, paid: { $sum: '$paidAmount' } } },
        ]);

        return {
            total, pending, confirmed, processing, shipped, delivered, cancelled,
            totalRevenue: revenueData[0]?.totalRevenue || 0,
            byChannel,
            totalDue: Math.max(0, (dueAgg?.total || 0) - (dueAgg?.paid || 0)),
        };
    },

    // ── Soft-delete an order (admin) — preserves the record, hides it from listings ──
    async deleteOrder(id: string) {
        const order = await Order.findById(id);
        if (!order) throw new AppError(404, 'Order not found');
        if ((order as any).isDeleted) throw new AppError(400, 'Order is already deleted');

        (order as any).isDeleted = true;
        order.timeline.push({ status: 'deleted', note: 'Order deleted by admin', createdAt: new Date() } as any);
        await order.save();
        return order;
    },
};

export default OrderService;
