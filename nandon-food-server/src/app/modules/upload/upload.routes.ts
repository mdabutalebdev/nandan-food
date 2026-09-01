import express from 'express';
import { upload, uploadVideo, uploadReviewImage, uploadCv } from '../../utils/cloudinary';
import { uploadController } from './upload.controller';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth';

const router = express.Router();

// POST /api/upload/image  — single image (admin only)
router.post(
    '/image',
    authMiddleware,
    authorizeRoles('admin'),
    upload.single('image'),
    uploadController.uploadSingle,
);

// POST /api/upload/avatar — single image, any signed-in user (own profile picture)
router.post(
    '/avatar',
    authMiddleware,
    upload.single('image'),
    uploadController.uploadSingle,
);

// POST /api/upload/video  — single video (admin only)
router.post(
    '/video',
    authMiddleware,
    authorizeRoles('admin'),
    uploadVideo.single('video'),
    uploadController.uploadVideo,
);

// POST /api/upload/images — multiple up to 10 (admin only)
router.post(
    '/images',
    authMiddleware,
    authorizeRoles('admin'),
    upload.array('images', 10),
    uploadController.uploadMultiple,
);

// POST /api/upload/cv — public, single CV (pdf/doc/docx) for career applications.
router.post(
    '/cv',
    uploadCv.single('cv'),
    uploadController.uploadDocument,
);

// POST /api/upload/review-images — public, for photos attached to a product review.
// Deliberately narrower than the admin route: 3 files, 3MB each, jpg/png/webp only.
router.post(
    '/review-images',
    uploadReviewImage.array('images', 3),
    uploadController.uploadMultiple,
);

export const UploadRoutes = router;
