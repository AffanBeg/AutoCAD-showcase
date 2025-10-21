import path from 'node:path';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { supabaseServiceClient } from '../lib/supabase.js';
import { safeFilenameSegment, toSlug } from '../utils/slug.js';
import {
  convertCadFileToStl,
  ConversionConfigurationError,
  ConversionFailedError,
  type ConversionResult
} from './conversionService.js';

const sanitizeFilename = (filename: string): { basename: string; ext: string } => {
  const ext = path.extname(filename).toLowerCase();
  const baseName = path.basename(filename, ext);
  const safeBase = safeFilenameSegment(baseName) || 'upload';

  return {
    basename: safeBase,
    ext
  };
};

export const uploadOriginalFile = async (
  slug: string,
  file: Express.Multer.File
): Promise<string> => {
  const { basename, ext } = sanitizeFilename(file.originalname);
  const objectPath = path.posix.join('uploads', slug, `${basename}${ext}`);

  const { error } = await supabaseServiceClient.storage
    .from(env.SUPABASE_STORAGE_BUCKET_UPLOADS)
    .upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    throw new Error(`Failed to upload original file: ${error.message}`);
  }

  return objectPath;
};

export const convertToStl = async (
  slug: string,
  file: Express.Multer.File
): Promise<ConversionResult> => {
  const ext = path.extname(file.originalname).toLowerCase();
  const baseName = safeFilenameSegment(path.basename(file.originalname, ext)) || toSlug(slug);

  if (ext === '.stl') {
    return {
      buffer: file.buffer,
      filename: `${baseName}.stl`,
      contentType: 'model/stl',
      skipped: true
    };
  }

  return convertCadFileToStl({
    file,
    outputBaseName: baseName
  });
};

export const uploadConvertedFile = async (
  slug: string,
  conversion: ConversionResult
): Promise<string> => {
  const objectPath = path.posix.join('converted', slug, conversion.filename);

  const { error } = await supabaseServiceClient.storage
    .from(env.SUPABASE_STORAGE_BUCKET_CONVERTED)
    .upload(objectPath, conversion.buffer, {
      contentType: conversion.contentType,
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    throw new Error(`Failed to upload converted STL: ${error.message}`);
  }

  return objectPath;
};

type ShowcaseInsertPayload = {
  slug: string;
  title: string;
  description: string | null;
  originalPath: string;
  stlPath: string;
  owner: string | null;
  visibility: 'public' | 'private';
};

export const saveShowcaseRecord = async ({
  slug,
  title,
  description,
  originalPath,
  stlPath,
  owner,
  visibility
}: ShowcaseInsertPayload) => {
  const { data, error }: PostgrestSingleResponse<unknown> = await supabaseServiceClient
    .from('showcases')
    .insert({
      slug,
      title,
      description,
      original_path: originalPath,
      stl_path: stlPath,
      owner,
      visibility
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save showcase record: ${error.message}`);
  }

  return data;
};

export { ConversionConfigurationError, ConversionFailedError };
