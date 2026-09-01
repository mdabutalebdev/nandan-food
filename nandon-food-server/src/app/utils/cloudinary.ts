import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import config from '../config';

// ── Configure Cloudinary ───────────────────────────────────
cloudinary.config({
    cloud_name: config.cloudinary.cloud_name,
    api_key:    config.cloudinary.api_key,
    api_secret: config.cloudinary.api_secret,
});

// Cloudinary credentials are optional. Without them every upload would fail, so
// we fall back to writing files under ./uploads, which app.ts serves statically.
export const isCloudinaryConfigured = Boolean(
    config.cloudinary.cloud_name && config.cloudinary.api_key && config.cloudinary.api_secret
);

export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

if (!isCloudinaryConfigured) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log('📁 Cloudinary not configured — uploads will be saved to ./uploads');
}

const diskStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.png';
        cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
});

// ── Cloudinary storage (stores uploads directly to cloud) ─
const storage = new CloudinaryStorage({
    cloudinary,
    params: async (_req: any, file: any) => ({
        folder:         'freshfoodbazar/products',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'],
        transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto:good' }],
        public_id:      `product_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    }),
});

// ── Multer upload — up to 10 files, 10MB each ─────────────
export const upload = multer({
    storage: isCloudinaryConfigured ? storage : diskStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (jpg, png, webp, gif, avif)'));
        }
    },
});

// ── Public review photos — unauthenticated, so keep it tight ──
// Max 3 files per request (enforced on the route), 3MB each, images only.
export const uploadReviewImage = multer({
    storage: isCloudinaryConfigured ? storage : diskStorage,
    limits: { fileSize: 3 * 1024 * 1024, files: 3 },
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only jpg, png or webp images are allowed'));
        }
    },
});

// ── Cloudinary storage for VIDEOS (resource_type: video) ──
const videoStorage = new CloudinaryStorage({
    cloudinary,
    params: async (_req: any, _file: any) => ({
        folder:        'freshfoodbazar/videos',
        resource_type: 'video',
        public_id:     `video_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    }),
});

// ── Multer upload for VIDEOS — single file, 100MB max ─────
export const uploadVideo = multer({
    storage: isCloudinaryConfigured ? videoStorage : diskStorage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter: (_req, file, cb) => {
        const allowed = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only video files are allowed (mp4, webm, ogg, mov, mkv)'));
        }
    },
});

// ── Cloudinary storage for CV / documents (resource_type: raw) ──
const rawStorage = new CloudinaryStorage({
    cloudinary,
    params: async (_req: any, _file: any) => ({
        folder:        'freshfoodbazar/cv',
        resource_type: 'raw',
        public_id:     `cv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    }),
});

// ── Public CV upload — unauthenticated (career applicants). Kept tight:
// a single pdf/doc/docx, 8MB max.
export const uploadCv = multer({
    storage: isCloudinaryConfigured ? rawStorage : diskStorage,
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
        const allowed = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF or Word (doc/docx) files are allowed'));
        }
    },
});

export { cloudinary };
