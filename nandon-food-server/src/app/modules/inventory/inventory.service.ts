import { Types } from 'mongoose';
import { InventoryItem, InventoryTransaction } from './inventory.model';
import AppError from '../../utils/AppError';

/** Aggregation `$match` doesn't auto-cast strings to ObjectId the way find() does,
 *  so turn an item id into an ObjectId (or return null when it isn't a valid id). */
function itemObjectId(id: unknown): Types.ObjectId | null {
    const s = String(id ?? '');
    return Types.ObjectId.isValid(s) ? new Types.ObjectId(s) : null;
}

/** Turn a `from`/`to` query pair into a Mongo date filter (inclusive). */
function dateRange(from?: unknown, to?: unknown) {
    const range: Record<string, Date> = {};
    if (from) range.$gte = new Date(String(from));
    if (to) {
        const end = new Date(String(to));
        end.setHours(23, 59, 59, 999);
        range.$lte = end;
    }
    return Object.keys(range).length ? range : undefined;
}

/**
 * Replay every transaction of an item to recompute its stock, average cost and
 * totals. Called after any create / update / delete so the numbers can never
 * drift away from the ledger.
 */
async function recalcItem(itemId: string) {
    const item = await InventoryItem.findById(itemId);
    if (!item) return null;

    const txns = await InventoryTransaction.find({ item: itemId }).sort({ date: 1, createdAt: 1 });

    let stock = item.openingStock || 0;
    let purchasedQty = 0, purchasedValue = 0, consumedQty = 0, consumedValue = 0, lastPurchasePrice = 0;

    const stamped: { id: unknown; stockAfter: number }[] = [];

    for (const t of txns) {
        const qty = t.quantity || 0;
        if (t.type === 'purchase') {
            stock += qty;
            purchasedQty += qty;
            purchasedValue += t.totalCost || 0;
            if (qty > 0) lastPurchasePrice = t.unitPrice || 0;
        } else if (t.type === 'consume') {
            stock -= qty;
            consumedQty += qty;
            consumedValue += t.totalCost || 0;
        } else {
            // adjust — the quantity *is* the new stock figure
            stock = qty;
        }
        stamped.push({ id: t._id, stockAfter: Math.round(stock * 1000) / 1000 });
    }

    if (stamped.length) {
        await InventoryTransaction.bulkWrite(
            stamped.map((s) => ({
                updateOne: { filter: { _id: s.id }, update: { $set: { stockAfter: s.stockAfter } } },
            }))
        );
    }

    // Average cost per unit: use the purchase average once anything has been
    // bought; before that, fall back to the opening-stock rate the admin set,
    // so opening stock carries a value instead of showing ৳0.
    const avgCost = purchasedQty > 0 ? purchasedValue / purchasedQty : (item.openingRate || 0);

    item.stock = Math.round(stock * 1000) / 1000;
    item.avgCost = Math.round(avgCost * 100) / 100;
    item.lastPurchasePrice = lastPurchasePrice;
    item.totalPurchasedQty = Math.round(purchasedQty * 1000) / 1000;
    item.totalPurchasedValue = Math.round(purchasedValue * 100) / 100;
    item.totalConsumedQty = Math.round(consumedQty * 1000) / 1000;
    item.totalConsumedValue = Math.round(consumedValue * 100) / 100;
    await item.save();

    return item;
}

const InventoryService = {
    // ── Items ─────────────────────────────────────────────────────
    async getItems(query: Record<string, unknown>) {
        const filter: Record<string, unknown> = { isDeleted: { $ne: true } };
        if (query.searchTerm) {
            const rx = { $regex: String(query.searchTerm), $options: 'i' };
            filter.$or = [{ name: rx }, { code: rx }, { supplier: rx }];
        }
        if (query.group && query.group !== 'all') filter.group = query.group;
        if (query.isActive === 'true' || query.isActive === 'false') filter.isActive = query.isActive === 'true';

        let items = await InventoryItem.find(filter).sort(String(query.sort || 'name'));

        if (query.lowStock === 'true') {
            items = items.filter((i) => (i.lowStockAlert || 0) > 0 && (i.stock || 0) <= (i.lowStockAlert || 0));
        }
        return items;
    },

    async getItemById(id: string) {
        const item = await InventoryItem.findById(id);
        if (!item || item.isDeleted) throw new AppError(404, 'Inventory item not found');
        return item;
    },

    async createItem(payload: Record<string, unknown>) {
        const item = await InventoryItem.create({ ...payload, stock: Number(payload.openingStock) || 0 });
        return await recalcItem(item._id.toString());
    },

    async updateItem(id: string, payload: Record<string, unknown>) {
        const item = await InventoryItem.findById(id);
        if (!item || item.isDeleted) throw new AppError(404, 'Inventory item not found');

        // Stock / cost totals are derived — never accept them from the client.
        ['stock', 'avgCost', 'totalPurchasedQty', 'totalPurchasedValue', 'totalConsumedQty', 'totalConsumedValue']
            .forEach((k) => delete payload[k]);

        Object.assign(item, payload);
        await item.save();
        return await recalcItem(id);
    },

    async deleteItem(id: string) {
        const item = await InventoryItem.findById(id);
        if (!item) throw new AppError(404, 'Inventory item not found');
        item.isDeleted = true;
        await item.save();
        return item;
    },

    // ── Transactions ──────────────────────────────────────────────
    async getTransactions(query: Record<string, unknown>) {
        const filter: Record<string, unknown> = {};
        if (query.item && query.item !== 'all') filter.item = itemObjectId(query.item) ?? query.item;
        if (query.type && query.type !== 'all') filter.type = query.type;
        const range = dateRange(query.from, query.to);
        if (range) filter.date = range;
        if (query.searchTerm) {
            const rx = { $regex: String(query.searchTerm), $options: 'i' };
            filter.$or = [{ itemName: rx }, { supplier: rx }, { invoiceNo: rx }, { purpose: rx }, { note: rx }];
        }

        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 25;

        const [rows, total] = await Promise.all([
            InventoryTransaction.find(filter)
                .populate('item', 'name unit group')
                .sort({ date: -1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            InventoryTransaction.countDocuments(filter),
        ]);

        // Totals for the whole filtered range, not just this page.
        const sums = await InventoryTransaction.aggregate([
            { $match: filter },
            { $group: { _id: '$type', qty: { $sum: '$quantity' }, value: { $sum: '$totalCost' }, count: { $sum: 1 } } },
        ]);
        const summary = { purchaseValue: 0, purchaseQty: 0, purchaseCount: 0, consumeValue: 0, consumeQty: 0, consumeCount: 0 };
        for (const s of sums) {
            if (s._id === 'purchase') { summary.purchaseValue = s.value; summary.purchaseQty = s.qty; summary.purchaseCount = s.count; }
            if (s._id === 'consume') { summary.consumeValue = s.value; summary.consumeQty = s.qty; summary.consumeCount = s.count; }
        }

        return { rows, summary, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    },

    async createTransaction(payload: Record<string, unknown>, adminId?: string) {
        const item = await InventoryItem.findById(payload.item as string);
        if (!item || item.isDeleted) throw new AppError(404, 'Inventory item not found');

        const type = String(payload.type);
        const quantity = Number(payload.quantity) || 0;
        if (quantity < 0) throw new AppError(400, 'Quantity cannot be negative');

        let unitPrice = Number(payload.unitPrice) || 0;
        let totalCost = Number(payload.totalCost) || 0;

        if (type === 'purchase') {
            // Either side can be entered — fill in whichever is missing.
            if (!totalCost && unitPrice) totalCost = unitPrice * quantity;
            if (!unitPrice && totalCost && quantity) unitPrice = totalCost / quantity;
        } else if (type === 'consume') {
            if (quantity > (item.stock || 0)) {
                throw new AppError(400, `Only ${item.stock} ${item.unit} of ${item.name} left in stock`);
            }
            // Consumption is valued at the running average purchase cost.
            unitPrice = item.avgCost || 0;
            totalCost = unitPrice * quantity;
        } else {
            unitPrice = 0;
            totalCost = 0;
        }

        const txn = await InventoryTransaction.create({
            item: item._id,
            itemName: item.name,
            unit: item.unit,
            type,
            quantity,
            unitPrice: Math.round(unitPrice * 100) / 100,
            totalCost: Math.round(totalCost * 100) / 100,
            supplier: payload.supplier || '',
            invoiceNo: payload.invoiceNo || '',
            purpose: payload.purpose || '',
            reference: payload.reference || '',
            date: payload.date ? new Date(String(payload.date)) : new Date(),
            note: payload.note || '',
            createdBy: adminId || null,
        });

        const updated = await recalcItem(item._id.toString());
        return { transaction: await InventoryTransaction.findById(txn._id), item: updated };
    },

    async updateTransaction(id: string, payload: Record<string, unknown>) {
        const txn = await InventoryTransaction.findById(id);
        if (!txn) throw new AppError(404, 'Transaction not found');

        ['quantity', 'unitPrice', 'totalCost', 'supplier', 'invoiceNo', 'purpose', 'reference', 'note'].forEach((f) => {
            if (payload[f] !== undefined) (txn as unknown as Record<string, unknown>)[f] = payload[f];
        });
        if (payload.date) txn.date = new Date(String(payload.date));

        if (txn.type === 'purchase') {
            if (!txn.totalCost && txn.unitPrice) txn.totalCost = txn.unitPrice * txn.quantity;
            else if (txn.quantity) txn.unitPrice = (txn.totalCost || 0) / txn.quantity;
        }

        await txn.save();
        const item = await recalcItem(txn.item.toString());
        return { transaction: txn, item };
    },

    async deleteTransaction(id: string) {
        const txn = await InventoryTransaction.findById(id);
        if (!txn) throw new AppError(404, 'Transaction not found');
        const itemId = txn.item.toString();
        await txn.deleteOne();
        const item = await recalcItem(itemId);
        return { item };
    },

    // ── Dashboard numbers ─────────────────────────────────────────
    async getStats(query: Record<string, unknown> = {}) {
        const range = dateRange(query.from, query.to);
        const match: Record<string, unknown> = range ? { date: range } : {};

        const [items, sums] = await Promise.all([
            InventoryItem.find({ isDeleted: { $ne: true } }),
            InventoryTransaction.aggregate([
                ...(Object.keys(match).length ? [{ $match: match }] : []),
                { $group: { _id: '$type', value: { $sum: '$totalCost' }, qty: { $sum: '$quantity' }, count: { $sum: 1 } } },
            ]),
        ]);

        const byType: Record<string, { value: number; qty: number; count: number }> = {};
        for (const s of sums) byType[s._id] = { value: s.value, qty: s.qty, count: s.count };

        const stockValue = items.reduce((n, i) => n + (i.stock || 0) * (i.avgCost || 0), 0);
        const lowStock = items.filter((i) => (i.lowStockAlert || 0) > 0 && (i.stock || 0) <= (i.lowStockAlert || 0));

        return {
            totalItems: items.length,
            activeItems: items.filter((i) => i.isActive).length,
            stockValue: Math.round(stockValue * 100) / 100,
            purchaseValue: Math.round((byType.purchase?.value || 0) * 100) / 100,
            purchaseCount: byType.purchase?.count || 0,
            consumeValue: Math.round((byType.consume?.value || 0) * 100) / 100,
            consumeCount: byType.consume?.count || 0,
            lowStockCount: lowStock.length,
            lowStockItems: lowStock.slice(0, 10).map((i) => ({
                _id: i._id, name: i.name, unit: i.unit, stock: i.stock, lowStockAlert: i.lowStockAlert,
            })),
        };
    },

    /**
     * Per-item purchase vs consumption over a date range — the "how much flour
     * did I buy, how much did I use, what is left" report.
     */
    async getReport(query: Record<string, unknown>) {
        const range = dateRange(query.from, query.to);
        const match: Record<string, unknown> = range ? { date: range } : {};
        if (query.item && query.item !== 'all') match.item = itemObjectId(query.item) ?? query.item;

        const grouped = await InventoryTransaction.aggregate([
            ...(Object.keys(match).length ? [{ $match: match }] : []),
            {
                $group: {
                    _id: { item: '$item', type: '$type' },
                    qty: { $sum: '$quantity' },
                    value: { $sum: '$totalCost' },
                },
            },
        ]);

        const items = await InventoryService.getItems({ searchTerm: query.searchTerm, group: query.group });

        const map = new Map<string, { purchaseQty: number; purchaseValue: number; consumeQty: number; consumeValue: number }>();
        for (const g of grouped) {
            const key = String(g._id.item);
            const row = map.get(key) || { purchaseQty: 0, purchaseValue: 0, consumeQty: 0, consumeValue: 0 };
            if (g._id.type === 'purchase') { row.purchaseQty = g.qty; row.purchaseValue = g.value; }
            if (g._id.type === 'consume') { row.consumeQty = g.qty; row.consumeValue = g.value; }
            map.set(key, row);
        }

        const rows = items
            .filter((i) => !query.item || query.item === 'all' || String(i._id) === query.item)
            .map((i) => {
                const r = map.get(String(i._id)) || { purchaseQty: 0, purchaseValue: 0, consumeQty: 0, consumeValue: 0 };
                return {
                    _id: i._id,
                    name: i.name,
                    unit: i.unit,
                    group: i.group,
                    stock: i.stock,
                    avgCost: i.avgCost,
                    stockValue: Math.round((i.stock || 0) * (i.avgCost || 0) * 100) / 100,
                    lowStockAlert: i.lowStockAlert,
                    ...r,
                };
            });

        const totals = rows.reduce(
            (t, r) => ({
                purchaseValue: t.purchaseValue + r.purchaseValue,
                consumeValue: t.consumeValue + r.consumeValue,
                stockValue: t.stockValue + r.stockValue,
            }),
            { purchaseValue: 0, consumeValue: 0, stockValue: 0 }
        );

        return { rows, totals };
    },
};

export default InventoryService;
