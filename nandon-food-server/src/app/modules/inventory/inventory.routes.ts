import express from 'express';
import InventoryController from './inventory.controller';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { createItemValidation, updateItemValidation, createTransactionValidation } from './inventory.validation';

const router = express.Router();

// Purchase inventory is admin-only end to end.
router.use(authMiddleware, authorizeRoles('admin'));

// Reporting
router.get('/stats', InventoryController.getStats);
router.get('/report', InventoryController.getReport);

// Transactions (purchase / consume / adjust)
router.get('/transactions', InventoryController.getTransactions);
router.post('/transactions', validateRequest(createTransactionValidation), InventoryController.createTransaction);
router.patch('/transactions/:id', InventoryController.updateTransaction);
router.delete('/transactions/:id', InventoryController.deleteTransaction);

// Items
router.get('/items', InventoryController.getItems);
router.post('/items', validateRequest(createItemValidation), InventoryController.createItem);
router.get('/items/:id', InventoryController.getItem);
router.patch('/items/:id', validateRequest(updateItemValidation), InventoryController.updateItem);
router.delete('/items/:id', InventoryController.deleteItem);

export const InventoryRoutes = router;
