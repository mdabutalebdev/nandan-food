import { z } from 'zod';
import { INVENTORY_UNITS, INVENTORY_TXN_TYPES } from './inventory.model';

export const createItemValidation = z.object({
    body: z.object({
        name: z.string().min(1, 'Item name is required').max(150),
        code: z.string().max(40).optional(),
        unit: z.enum(INVENTORY_UNITS as unknown as [string, ...string[]]).optional(),
        group: z.string().max(60).optional(),
        openingStock: z.number().min(0).optional(),
        lowStockAlert: z.number().min(0).optional(),
        supplier: z.string().max(120).optional(),
        note: z.string().optional(),
        isActive: z.boolean().optional(),
    }),
});

export const updateItemValidation = z.object({
    body: createItemValidation.shape.body.partial(),
});

export const createTransactionValidation = z.object({
    body: z.object({
        item: z.string().min(1, 'Item is required'),
        type: z.enum(INVENTORY_TXN_TYPES as unknown as [string, ...string[]]),
        quantity: z.number().min(0, 'Quantity must be 0 or more'),
        unitPrice: z.number().min(0).optional(),
        totalCost: z.number().min(0).optional(),
        supplier: z.string().max(120).optional(),
        invoiceNo: z.string().max(60).optional(),
        purpose: z.string().max(160).optional(),
        reference: z.string().max(120).optional(),
        date: z.string().or(z.date()).optional(),
        note: z.string().optional(),
    }),
});
