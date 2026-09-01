import express from 'express';
import ApplicationController from './application.controller';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth';

const router = express.Router();

// Public — submit an application from the career page
router.post('/', ApplicationController.create);

// Admin — manage received applications
router.get('/', authMiddleware, authorizeRoles('admin'), ApplicationController.getAll);
router.get('/:id', authMiddleware, authorizeRoles('admin'), ApplicationController.getOne);
router.patch('/:id/status', authMiddleware, authorizeRoles('admin'), ApplicationController.updateStatus);
router.delete('/:id', authMiddleware, authorizeRoles('admin'), ApplicationController.delete);

export const ApplicationRoutes = router;
