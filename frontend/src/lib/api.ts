import type { Showcase } from '../types/showcase';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:4000';

const jsonHeaders = {
  Accept: 'application/json'
};

const buildUrl = (path: string) => `${API_BASE_URL.replace(/\/$/, '')}${path}`;

export type CreateShowcasePayload = {
  title: string;
  description?: string;
  file: File;
  visibility?: 'public' | 'private';
};

export type CreateShowcaseResponse = Showcase & {
  conversionSkipped?: boolean;
};

export const createShowcase = async ({
  title,
  description,
  file,
  visibility
}: CreateShowcasePayload, token?: string): Promise<CreateShowcaseResponse> => {
  const formData = new FormData();
  formData.append('title', title);
  if (description) {
    formData.append('description', description);
  }
  if (visibility) {
    formData.append('visibility', visibility);
  }
  formData.append('file', file);

  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl('/api/showcases'), {
    method: 'POST',
    body: formData,
    headers
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = typeof errorBody.message === 'string' ? errorBody.message : 'Upload failed';
    throw new Error(message);
  }

  const data = (await response.json()) as CreateShowcaseResponse;
  return data;
};

export const fetchShowcase = async (slug: string, token?: string): Promise<Showcase> => {
  const headers: HeadersInit = { ...jsonHeaders };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(`/api/showcases/${slug}`), {
    headers
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = typeof errorBody.message === 'string' ? errorBody.message : 'Failed to load showcase';
    throw new Error(message);
  }

  const data = (await response.json()) as Showcase;
  return data;
};
