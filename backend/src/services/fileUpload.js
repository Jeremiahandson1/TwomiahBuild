/**
 * File Upload Service
 *
 * Supports two storage backends:
 *   STORAGE_BACKEND=s3   → Cloudflare R2 or AWS S3 (production)
 *   STORAGE_BACKEND=local → Filesystem (dev only — wiped on Render redeploys)
 *
 * R2:  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
 * S3:  AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME, S3_PUBLIC_URL
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { S3Client, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import logger from './logger.js';

// ── Backend detection ────────────────────────────────────────────────────────
const STORAGE_BACKEND = process.env.STORAGE_BACKEND || 'local';
export const USE_S3 = STORAGE_BACKEND === 's3';
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;

export const ALLOWED_MIMES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  spreadsheet: ['application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
  all: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
};

// ── S3/R2 client ─────────────────────────────────────────────────────────────
let s3Client = null;
let S3_BUCKET = null;
let S3_PUBLIC_URL = null;

if (USE_S3) {
  const isR2 = !!process.env.R2_ACCOUNT_ID;
  if (isR2) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
    });
    S3_BUCKET = process.env.R2_BUCKET_NAME;
    S3_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
    logger.info('File storage: Cloudflare R2', { bucket: S3_BUCKET });
  } else {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY },
    });
    S3_BUCKET = process.env.S3_BUCKET_NAME;
    S3_PUBLIC_URL = (process.env.S3_PUBLIC_URL ||
      `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`).replace(/\/$/, '');
    logger.info('File storage: AWS S3', { bucket: S3_BUCKET });
  }
} else {
  logger.warn('File storage: LOCAL DISK. Set STORAGE_BACKEND=s3 for production — local uploads are lost on Render redeploy.');
}

// ── Path safety ───────────────────────────────────────────────────────────────
function sanitizeFilename(filename) {
  return path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function assertSafePath(base, ...parts) {
  const resolved = path.resolve(base, ...parts);
  if (!resolved.startsWith(path.resolve(base) + path.sep) && resolved !== path.resolve(base)) {
    throw new Error(`Path traversal blocked: ${parts.join('/')}`);
  }
  return resolved;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Storage engines ───────────────────────────────────────────────────────────
let s3Storage = null;
if (USE_S3) {
  // Dynamic import to avoid requiring multer-s3 when not used
  const multerS3Module = await import('multer-s3').catch(() => null);
  if (multerS3Module) {
    const multerS3 = multerS3Module.default;
    s3Storage = multerS3({
      s3: s3Client,
      bucket: S3_BUCKET,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key(req, file, cb) {
        const ext = path.extname(sanitizeFilename(file.originalname)).toLowerCase();
        const companyId = sanitizeFilename(req.user?.companyId || 'temp');
        const subdir = sanitizeFilename(req.uploadSubdir || 'general');
        cb(null, `${companyId}/${subdir}/${uuidv4()}${ext}`);
      },
    });
  }
}

const diskStorage = multer.diskStorage({
  destination(req, file, cb) {
    const companyId = sanitizeFilename(req.user?.companyId || 'temp');
    const subdir = sanitizeFilename(req.uploadSubdir || 'general');
    try {
      const uploadPath = assertSafePath(UPLOAD_DIR, companyId, subdir);
      ensureDir(uploadPath);
      cb(null, uploadPath);
    } catch (err) { cb(err); }
  },
  filename(req, file, cb) {
    const ext = path.extname(sanitizeFilename(file.originalname)).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (allowedTypes) => (req, file, cb) => {
  const mimes = ALLOWED_MIMES[allowedTypes] || ALLOWED_MIMES.all;
  mimes.includes(file.mimetype) ? cb(null, true) : cb(new Error(`Invalid file type. Allowed: ${allowedTypes}`), false);
};

function makeMulter(allowedTypes) {
  return multer({
    storage: (USE_S3 && s3Storage) ? s3Storage : diskStorage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: fileFilter(allowedTypes),
  });
}

export const upload = {
  single: (fieldName, allowedTypes = 'all') => makeMulter(allowedTypes).single(fieldName),
  multiple: (fieldName, maxCount = 10, allowedTypes = 'all') => makeMulter(allowedTypes).array(fieldName, maxCount),
  fields: (fields, allowedTypes = 'all') => makeMulter(allowedTypes).fields(fields),
};

// ── URL helpers ───────────────────────────────────────────────────────────────
export function getFileUrl(filePathOrKey) {
  if (USE_S3) return `${S3_PUBLIC_URL}/${filePathOrKey}`;
  const relative = filePathOrKey.replace(UPLOAD_DIR, '').replace(/\\/g, '/');
  return `/uploads${relative}`;
}

export async function getSignedFileUrl(key, expiresIn = 3600) {
  if (!USE_S3 || !s3Client) return getFileUrl(key);
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn });
}

// ── File operations ───────────────────────────────────────────────────────────
export async function deleteFile(filePathOrKey) {
  try {
    if (USE_S3) {
      await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: filePathOrKey }));
      logger.info('S3 object deleted', { key: filePathOrKey });
    } else {
      const rel = filePathOrKey.replace(/^\/uploads\//, '');
      const safePath = assertSafePath(UPLOAD_DIR, rel);
      if (fs.existsSync(safePath)) { fs.unlinkSync(safePath); logger.info('Local file deleted', { path: safePath }); }
    }
    return true;
  } catch (err) {
    logger.error('File delete failed', { filePathOrKey, error: err.message });
    throw err;
  }
}

// ── Image processing ──────────────────────────────────────────────────────────
export async function processImage(filePath, options = {}) {
  const { width = 1200, height = 1200, quality = 80, format = 'jpeg', fit = 'inside' } = options;
  const ext = path.extname(filePath);
  const outputPath = filePath.replace(ext, `.processed.${format}`);
  try {
    await sharp(filePath).resize(width, height, { fit, withoutEnlargement: true }).toFormat(format, { quality }).toFile(outputPath);
    fs.unlinkSync(filePath);
    const finalPath = filePath.replace(ext, `.${format}`);
    fs.renameSync(outputPath, finalPath);
    return finalPath;
  } catch (err) { logger.error('Image processing failed', { filePath, error: err.message }); throw err; }
}

export async function generateThumbnail(filePath, size = 200) {
  const ext = path.extname(filePath);
  const thumbPath = path.join(path.dirname(filePath), `${path.basename(filePath, ext)}_thumb${ext}`);
  try {
    await sharp(filePath).resize(size, size, { fit: 'cover' }).toFile(thumbPath);
    return thumbPath;
  } catch (err) { logger.error('Thumbnail failed', { filePath, error: err.message }); throw err; }
}

export function getFileInfo(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return { name: path.basename(filePath), path: filePath, size: stats.size, created: stats.birthtime, modified: stats.mtime, extension: path.extname(filePath).toLowerCase() };
  } catch { return null; }
}

export function setUploadSubdir(subdir) {
  return (req, res, next) => { req.uploadSubdir = subdir; next(); };
}

export function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large', maxSize: `${MAX_FILE_SIZE / 1024 / 1024}MB` });
    return res.status(400).json({ error: err.message });
  }
  if (err) return res.status(400).json({ error: err.message });
  next();
}

export function validateStorageConfig() {
  if (!USE_S3) return true;
  const isR2 = !!process.env.R2_ACCOUNT_ID;
  const required = isR2
    ? ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME']
    : ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'S3_BUCKET_NAME'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) { logger.error(`S3 storage missing env vars: ${missing.join(', ')}`); return false; }
  return true;
}

export default { upload, processImage, generateThumbnail, deleteFile, getFileUrl, getSignedFileUrl, getFileInfo, setUploadSubdir, handleUploadError, validateStorageConfig, UPLOAD_DIR, MAX_FILE_SIZE, ALLOWED_MIMES, USE_S3 };
