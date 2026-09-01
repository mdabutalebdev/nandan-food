import { Schema, model } from 'mongoose';

const orderItemSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, default: null }, // which variant was ordered (if any)
    name: { type: String, required: true },
    thumbnail: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    total: { type: Number, required: true },
    color: { type: String, default: '' },
    size: { type: String, default: '' },
}, { _id: true });

const timelineSchema = new Schema({
    status: { type: String },
    note: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });

const shippingAddressSchema = new Schema({
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: '' },
    address: { type: String, required: true },
    area: { type: String, default: '' },
    city: { type: String, default: '' },
    postalCode: { type: String, default: '' },
}, { _id: false });

// Corporate buyer details — only filled in for `salesChannel: 'corporate'`.
const corporateSchema = new Schema({
    companyName: { type: String, default: '' },
    contactPerson: { type: String, default: '' },
    designation: { type: String, default: '' },
    binNo: { type: String, default: '' },
    tinNo: { type: String, default: '' },
    poNumber: { type: String, default: '' },
}, { _id: false });

const orderSchema = new Schema(
    {
        orderId: { type: String, unique: true },
        // Optional: an order raised by the admin for a walk-in / corporate buyer
        // has no website account behind it.
        user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        items: { type: [orderItemSchema], required: true },

        // ── Sales channel — which book this sale belongs to ──────
        salesChannel: {
            type: String,
            enum: ['online', 'corporate', 'direct'],
            default: 'online',
        },
        // Where the order came from: the storefront, or hand-entered by an admin.
        orderSource: { type: String, enum: ['website', 'admin'], default: 'website' },
        corporate: { type: corporateSchema, default: undefined },

        // ── Invoice ──────────────────────────────────────────────
        invoiceNo: { type: String, default: '', index: true },
        invoiceDate: { type: Date, default: null },
        shippingAddress: { type: shippingAddressSchema, required: true },
        // Billing address — falls back to a copy of the shipping address when the
        // customer leaves "Same as shipping" ticked.
        billingAddress: { type: shippingAddressSchema, default: undefined },

        // Pricing
        subtotal: { type: Number, required: true },
        shippingCost: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        // Extra hand-entered discount on a manual/corporate invoice (taka).
        manualDiscount: { type: Number, default: 0 },
        vat: { type: Number, default: 0 },
        total: { type: Number, required: true },
        // How much of the invoice has actually been collected (corporate credit sales).
        paidAmount: { type: Number, default: 0 },
        couponCode: { type: String, default: '' },
        // Which delivery zone (from Settings) was charged.
        deliveryZone: { type: String, default: '' },

        // Status
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
            default: 'pending',
        },
        paymentMethod: {
            type: String,
            // `cash` / `bank` / `cheque` / `credit` only appear on manual
            // (corporate & direct) invoices raised from the admin panel.
            enum: ['cod', 'bkash', 'rocket', 'nagad', 'cash', 'bank', 'cheque', 'credit'],
            default: 'bkash',
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'pending',
        },
        transactionId: { type: String, default: '' },
        paymentDetails: {
            senderNumber: { type: String, default: '' },
            transactionId: { type: String, default: '' },
            paymentTime: { type: String, default: '' },
        },
        trackingNumber: { type: String, default: '' },
        carrier: { type: String, default: '' },

        note: { type: String, default: '' },
        timeline: { type: [timelineSchema], default: [] },

        // Soft delete — hidden from listings but record is preserved
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true, toJSON: { virtuals: true } }
);

// Channel prefix, so an invoice number says at a glance which book it came from.
const CHANNEL_PREFIX: Record<string, string> = {
    online: 'ONL',
    corporate: 'CRP',
    direct: 'DIR',
};

// Auto-generate order ID + invoice number
orderSchema.pre('save', async function (next) {
    const Model = this.constructor as any;

    if (!this.orderId) {
        const count = await Model.countDocuments();
        this.orderId = `DOM-${String(count + 1).padStart(4, '0')}`;
    }

    // Every order gets an invoice number the moment it is created, carrying the
    // sales channel it belongs to: NF-CRP-2508-0007
    if (!this.invoiceNo) {
        const channel = this.salesChannel || 'online';
        const prefix = CHANNEL_PREFIX[channel] || 'ONL';
        const now = new Date();
        const stamp = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        // Orders saved before the channel field existed have no `salesChannel`;
        // they were all website orders, so the online series must count them too
        // — otherwise a new number could collide with one backfilled later.
        const seq = await Model.countDocuments({
            createdAt: { $gte: monthStart },
            ...(channel === 'online'
                ? { $or: [{ salesChannel: 'online' }, { salesChannel: null }] }
                : { salesChannel: channel }),
        });
        this.invoiceNo = `NF-${prefix}-${stamp}-${String(seq + 1).padStart(4, '0')}`;
        this.invoiceDate = this.invoiceDate || now;
    }

    next();
});

// Amount still owed on the invoice.
orderSchema.virtual('dueAmount').get(function () {
    return Math.max(0, (this.total || 0) - (this.paidAmount || 0));
});

orderSchema.index({ user: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ salesChannel: 1, createdAt: -1 });

export const Order = model('Order', orderSchema);
