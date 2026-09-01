import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import ApplicationService from './application.service';

const ApplicationController = {
    // POST /api/applications — public (from the career "Apply now" form)
    create: catchAsync(async (req: Request, res: Response) => {
        const app = await ApplicationService.create(req.body);
        sendResponse(res, { statusCode: 201, success: true, message: 'Application submitted successfully', data: app });
    }),

    // GET /api/applications — admin (list + status summary)
    getAll: catchAsync(async (req: Request, res: Response) => {
        const { rows, meta, summary } = await ApplicationService.getAll(req.query as Record<string, unknown>);
        sendResponse(res, { statusCode: 200, success: true, message: 'Applications fetched', data: { rows, summary }, meta });
    }),

    // GET /api/applications/:id — admin (details)
    getOne: catchAsync(async (req: Request, res: Response) => {
        const app = await ApplicationService.getOne(req.params.id);
        if (!app) return sendResponse(res, { statusCode: 404, success: false, message: 'Application not found' });
        sendResponse(res, { statusCode: 200, success: true, message: 'Application fetched', data: app });
    }),

    // PATCH /api/applications/:id/status — admin
    updateStatus: catchAsync(async (req: Request, res: Response) => {
        const app = await ApplicationService.updateStatus(req.params.id, req.body.status);
        sendResponse(res, { statusCode: 200, success: true, message: 'Application updated', data: app });
    }),

    // DELETE /api/applications/:id — admin
    delete: catchAsync(async (req: Request, res: Response) => {
        await ApplicationService.delete(req.params.id);
        sendResponse(res, { statusCode: 200, success: true, message: 'Application deleted' });
    }),
};

export default ApplicationController;
