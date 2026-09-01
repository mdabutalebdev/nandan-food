import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';

// POST /api/upload/image   — single image
// POST /api/upload/images  — multiple images (max 10)

// Cloudinary puts the secure URL in `path`; disk storage puts a filesystem path
// there instead, so turn that into a URL this server actually serves.
const toPublicUrl = (req: Request, file: Express.Multer.File): string => {
    const p = (file as unknown as { path: string }).path;
    if (/^https?:\/\//i.test(p)) return p;
    return `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
};

export const uploadController = {
    // ── Single image ──────────────────────────────────────────
    uploadSingle: catchAsync(async (req: Request, res: Response) => {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        const url = toPublicUrl(req, req.file);
        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: 'Image uploaded successfully',
            data: { url },
        });
    }),

    // ── Single video ──────────────────────────────────────────
    uploadVideo: catchAsync(async (req: Request, res: Response) => {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No video uploaded' });
        }
        const url = toPublicUrl(req, req.file);
        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: 'Video uploaded successfully',
            data: { url },
        });
    }),

    // ── Single document (CV / pdf / doc) ──────────────────────
    uploadDocument: catchAsync(async (req: Request, res: Response) => {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        const url = toPublicUrl(req, req.file);
        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: 'File uploaded successfully',
            data: { url, name: req.file.originalname },
        });
    }),

    // ── Multiple images (up to 10) ────────────────────────────
    uploadMultiple: catchAsync(async (req: Request, res: Response) => {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }
        const urls = files.map((f) => toPublicUrl(req, f));
        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: `${urls.length} image(s) uploaded successfully`,
            data: { urls },
        });
    }),
};
