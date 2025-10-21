export type ShowcaseVisibility = 'public' | 'private';

export type Showcase = {
  slug: string;
  title: string;
  description: string | null;
  originalPath: string;
  stlPath: string;
  visibility?: ShowcaseVisibility;
  ownerId?: string | null;
  createdAt?: string;
};
