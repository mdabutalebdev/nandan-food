import { Schema, model } from 'mongoose';

/**
 * Purchase inventory — the raw-material ledger.
 *
 * An `InventoryItem` is a thing the business buys (flour, oil, packaging…).
 * Every movement of that thing is one `InventoryTransaction`:
 *   purchase → stock goes up   (with a cost)
 *   consume  → stock goes down (valued at the running average cost)
 *   adjust   → stock is set to an absolute figure (stock count / correction)
 *
 * Item totals are never edited by hand — they are replayed from the
 * transactions, so deleting or editing a movement always leaves the stock right.
 */

export const INVENTORY_UNITS = [
    'kg', 'gram', 'litre', 'ml', 'pcs', 'packet', 'dozen', 'bag', 'carton', 'box', 'bundle', 'feet', 'meter', 'other',
] as const;

export const INVENTORY_TXN_TYPES = ['purchase', 'consume', 'adjust'] as const;

// ── Item ──────────────────────────────────────────────────────────
const inventoryItemSchema = new Schema(
    {
        name:  { type: String, required: [true, 'Item name is required'], trim: true, maxlength: 150 },
        code:  { type: String, default: '', trim: true, uppercase: true },
        unit:  { type: String, enum: INVENTORY_UNITS, default: 'kg' },
        group: { type: String, default: 'Raw Material', trim: true }, // Raw Material / Packaging / Others

        openingStock:  { type: Number, default: 0 },
        openingRate:   { type: Number, default: 0 },   // cost per unit of the opening stock (optional)
        stock:         { type: Number, default: 0 },   // replayed: opening + purchases − consumption
        avgCost:       { type: Number, default: 0 },   // weighted average purchase cost per unit
        lastPurchasePrice: { type: Number, default: 0 },
        lowStockAlert: { type: Number, default: 0 },

        supplier: { type: String, default: '', trim: true },
        note:     { type: String, default: '' },

        isActive:  { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },

        // Denormalised totals — replayed alongside `stock`
        totalPurchasedQty:   { type: Number, default: 0 },
        totalPurchasedValue: { type: Number, default: 0 },
        totalConsumedQty:    { type: Number, default: 0 },
        totalConsumedValue:  { type: Number, default: 0 },
    },
    { timestamps: true, toJSON: { virtuals: true } }
);

inventoryItemSchema.virtual('stockValue').get(function () {
    return Math.round((this.stock || 0) * (this.avgCost || 0) * 100) / 100;
});

inventoryItemSchema.virtual('isLow').get(function () {
    return (this.lowStockAlert || 0) > 0 && (this.stock || 0) <= (this.lowStockAlert || 0);
});

inventoryItemSchema.index({ name: 1 });
inventoryItemSchema.index({ isDeleted: 1, isActive: 1 });

export const InventoryItem = model('InventoryItem', inventoryItemSchema);

// ── Transaction (one purchase / one consumption) ──────────────────
const inventoryTxnSchema = new Schema(
    {
        item:     { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
        itemName: { type: String, default: '' },   // snapshot, so the ledger reads fine after a rename
        unit:     { type: String, default: '' },

        type:      { type: String, enum: INVENTORY_TXN_TYPES, required: true },
        quantity:  { type: Number, required: true, min: 0 },
        unitPrice: { type: Number, default: 0 },
        totalCost: { type: Number, default: 0 },

        supplier:  { type: String, default: '', trim: true },  // purchase
        invoiceNo: { type: String, default: '', trim: true },  // purchase — supplier's bill no
        purpose:   { type: String, default: '', trim: true },  // consume — what it went into
        reference: { type: String, default: '', trim: true },

        date: { type: Date, default: Date.now },
        note: { type: String, default: '' },

        stockAfter: { type: Number, default: 0 },
        createdBy:  { type: Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true }
);

inventoryTxnSchema.index({ item: 1, date: -1 });
inventoryTxnSchema.index({ type: 1, date: -1 });

export const InventoryTransaction = model('InventoryTransaction', inventoryTxnSchema);
