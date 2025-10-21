import { customAlphabet, nanoid } from 'nanoid';
import { supabaseServiceClient } from '../lib/supabase.js';

const nanoidLower = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 4);

const normalize = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const collapseWhitespace = (value: string): string => value.replace(/[^a-z0-9]+/g, '-');

const trimDelimiters = (value: string): string => value.replace(/^-+|-+$/g, '');

export const toSlug = (input: string): string => {
  const normalized = trimDelimiters(collapseWhitespace(normalize(input)));
  return normalized || nanoid(8);
};

export const safeFilenameSegment = (input: string): string =>
  trimDelimiters(
    collapseWhitespace(
      normalize(input).replace(/[^a-z0-9.-]/g, '-')
    )
  ) || nanoidLower();

export const createSlugFromTitle = (title: string): string => toSlug(title);

export const ensureUniqueSlug = async (slug: string): Promise<string> => {
  let candidate = slug;

  while (true) {
    const { data, error } = await supabaseServiceClient
      .from('showcases')
      .select('slug')
      .eq('slug', candidate)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to check slug availability: ${error.message}`);
    }

    if (!data) {
      return candidate;
    }

    candidate = `${slug}-${nanoidLower()}`;
  }
};
