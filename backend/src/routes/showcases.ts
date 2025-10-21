import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { supabaseServiceClient } from '../lib/supabase.js';
import { requireSupabaseAuth, maybeSupabaseAuth } from '../middleware/auth.js';
import { uploadSingleCad } from '../middleware/upload.js';
import {
  uploadOriginalFile,
  convertToStl,
  uploadConvertedFile,
  saveShowcaseRecord,
  ConversionConfigurationError,
  ConversionFailedError
} from '../services/showcaseService.js';
import { createSlugFromTitle, ensureUniqueSlug } from '../utils/slug.js';

const router = Router();

const createShowcaseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().max(2000).optional(),
  visibility: z.enum(['public', 'private']).optional()
});

const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  uploadSingleCad(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        res.status(400).json({ message: err.message });
        return;
      }

      next(err);
      return;
    }

    next();
  });
};

router.post('/', requireSupabaseAuth, handleUpload, async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ message: 'A CAD file is required' });
    return;
  }

  const parsed = createShowcaseSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      message: 'Invalid input',
      errors: parsed.error.flatten().fieldErrors
    });
    return;
  }

  try {
    const { title, description, visibility } = parsed.data;
    const descriptionValue = description ?? null;
    const visibilityValue = visibility ?? 'public';
    const baseSlug = createSlugFromTitle(title);
    const slug = await ensureUniqueSlug(baseSlug);

    const originalPath = await uploadOriginalFile(slug, req.file);

    let conversionResult;
    try {
      conversionResult = await convertToStl(slug, req.file);
    } catch (error) {
      if (error instanceof ConversionConfigurationError) {
        res.status(503).json({
          message: error.message,
          code: 'conversion_not_configured'
        });
        return;
      }

      if (error instanceof ConversionFailedError) {
        res.status(500).json({
          message: 'CAD conversion failed',
          details: error.causes.map((cause) => cause.message)
        });
        return;
      }

      throw error;
    }

    const stlPath = await uploadConvertedFile(slug, conversionResult);

    const record = await saveShowcaseRecord({
      slug,
      title,
      description: descriptionValue,
      originalPath,
      stlPath,
      owner: req.authUser?.id ?? null,
      visibility: visibilityValue
    });

    res.status(201).json({
      slug,
      title,
      description: descriptionValue,
      originalPath,
      stlPath,
      visibility: visibilityValue,
      createdAt: (record as { created_at?: string }).created_at,
      conversionSkipped: conversionResult.skipped
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to create showcase', error);
    res.status(500).json({
      message: 'Failed to create showcase',
      details: (error as Error).message
    });
  }
});

router.get('/:slug', maybeSupabaseAuth, async (req: Request, res: Response) => {
  const { slug } = req.params;

  const { data, error } = await supabaseServiceClient
    .from('showcases')
    .select('slug,title,description,original_path,stl_path,visibility,created_at,owner')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    res.status(500).json({ message: 'Failed to fetch showcase', details: error.message });
    return;
  }

  if (!data) {
    res.status(404).json({ message: `Showcase ${slug} not found` });
    return;
  }

  if (data.visibility !== 'public') {
    const requesterId = req.authUser?.id;
    if (!requesterId || requesterId !== data.owner) {
      res.status(403).json({ message: 'Showcase is not publicly accessible' });
      return;
    }
  }

  res.json({
    slug: data.slug,
    title: data.title,
    description: data.description,
    originalPath: data.original_path,
    stlPath: data.stl_path,
    visibility: data.visibility,
    ownerId: data.owner,
    createdAt: data.created_at
  });
});

export { router as showcasesRouter };
