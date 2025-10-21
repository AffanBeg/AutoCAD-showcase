import multer from 'multer';
import path from 'node:path';
import type { Request } from 'express';
import { ALLOWED_CAD_EXTENSIONS, MAX_UPLOAD_SIZE_BYTES } from '../config/constants.js';

const storage = multer.memoryStorage();

const fileFilter: multer.Options['fileFilter'] = (
  _req: Request,
  file,
  cb
) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_CAD_EXTENSIONS.includes(ext)) {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', `Unsupported file type: ${ext}`));
    return;
  }

  cb(null, true);
};

export const uploadSingleCad = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_UPLOAD_SIZE_BYTES }
}).single('file');
