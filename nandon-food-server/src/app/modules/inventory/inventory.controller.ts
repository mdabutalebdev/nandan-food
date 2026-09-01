import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import InventoryService from './inventory.service';

const InventoryController = {
    // ── Items ─────────────────────────────────────────────────────
    getItems: catchAsync(async (req: Request, res: Response) => {
        const data = await InventoryService.getItems(req.query as Record<string, unknown>);
        sendResponse(res, { statusCode: 200, success: true, message: 'Inventory items fetched', data });
    }),

    getItem: catchAsync(async (req: Request, res: Response) => {
        const data = await InventoryService.getItemById(req.params.id);
        sendResponse(res, { statusCode: 200, success: true, message: 'Inventory item fetched', data });
    }),

    createItem: catchAsync(async (req: Request, res: Response) => {
        const data = await InventoryService.createItem(req.body);
        sendResponse(res, { statusCode: 201, success: true, message: 'Inventory item created', data });
    }),

    updateItem: catchAsync(async (req: Request, res: Response) => {
        const data = await InventoryService.updateItem(req.params.id, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Inventory item updated', data });
    }),

    deleteItem: catchAsync(async (req: Request, res: Response) => {
        const data = await InventoryService.deleteItem(req.params.id);
        sendResponse(res, { statusCode: 200, success: true, message: 'Inventory item deleted', data });
    }),

    // ── Transactions ──────────────────────────────────────────────
    getTransactions: catchAsync(async (req: Request, res: Response) => {
        const { rows, summary, meta } = await InventoryService.getTransactions(req.query as Record<string, unknown>);
        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: 'Inventory transactions fetched',
            meta,
            data: { rows, summary },
        });
    }),

    createTransaction: catchAsync(async (req: Request, res: Response) => {
        const data = await InventoryService.createTransaction(req.body, req.user?.userId);
        sendResponse(res, { statusCode: 201, success: true, message: 'Entry recorded', data });
    }),

    updateTransaction: catchAsync(async (req: Request, res: Response) => {
        const data = await InventoryService.updateTransaction(req.params.id, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Entry updated', data });
    }),

    deleteTransaction: catchAsync(async (req: Request, res: Response) => {
        const data = await InventoryService.deleteTransaction(req.params.id);
        sendResponse(res, { statusCode: 200, success: true, message: 'Entry deleted', data });
    }),

    // ── Reporting ─────────────────────────────────────────────────
    getStats: catchAsync(async (req: Request, res: Response) => {
        const data = await InventoryService.getStats(req.query as Record<string, unknown>);
        sendResponse(res, { statusCode: 200, success: true, message: 'Inventory stats fetched', data });
    }),

    getReport: catchAsync(async (req: Request, res: Response) => {
        const data = await InventoryService.getReport(req.query as Record<string, unknown>);
        sendResponse(res, { statusCode: 200, success: true, message: 'Inventory report fetched', data });
    }),
};

export default InventoryController;
