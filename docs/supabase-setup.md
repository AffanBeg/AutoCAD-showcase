# Supabase Setup Guide

This project relies on Supabase for authentication, Postgres, and file storage. Complete the steps below before running the backend service.

## 1. Create a Supabase Project

1. Visit [https://app.supabase.com](https://app.supabase.com) and create a new project (free tier is fine).
2. In **Project Settings ? API**, note the following values:
   - Project URL
   - Public anon key
   - Service role key (keep this secret; backend only)
3. We will place these values in .env files during the backend scaffolding step.

## 2. Configure Storage Buckets

In the Supabase dashboard:

1. Go to **Storage ? Buckets**.
2. Create two **public** buckets:
   - cad-uploads for original CAD files.
   - cad-converted for generated STL files.

Public buckets simplify initial sharing; we can refine policies later if needed.

## 3. Apply Database Schema

Open the **SQL Editor** and run the migration below to create the showcases table and policies:

`sql
-- === Showcases table ===
create table if not exists public.showcases (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  original_path text not null,
  stl_path text not null,
  owner uuid,
  visibility text default 'public',
  created_at timestamptz default now()
);

create index if not exists showcases_slug_idx on public.showcases (slug);
create index if not exists showcases_created_idx on public.showcases (created_at desc);

-- === Enable Row Level Security ===
alter table public.showcases enable row level security;

-- === Policies ===
-- 1. Anyone can view 'public' showcases
create policy "Read public showcases"
on public.showcases
for select
using (visibility = 'public');

-- 2. Authenticated users can create showcases
create policy "Insert own showcases"
on public.showcases
for insert
with check (auth.uid() = owner or owner is null);

-- 3. Owners can modify their showcases
create policy "Owners can update/delete"
on public.showcases
for all
using (auth.uid() = owner)
with check (auth.uid() = owner);
`

Confirm the table exists by checking **Table Editor** after the migration succeeds.

## 4. Service Role Access (Local Development)

When we scaffold the backend, you'll need to populate the following variables:

- SUPABASE_URL
- SUPABASE_ANON_KEY (used by the frontend)
- SUPABASE_SERVICE_ROLE_KEY (used by the backend server)
- SUPABASE_STORAGE_BUCKET_UPLOADS=cad-uploads
- SUPABASE_STORAGE_BUCKET_CONVERTED=cad-converted

Keep the service role key private and do not expose it to the frontend.

## 5. Enable Google OAuth

1. Navigate to **Authentication ? Providers ? Google** in Supabase.
2. Provide a Google OAuth client ID/secret (create one in Google Cloud Console if needed).
3. Add redirect URLs:
   - http://localhost:5173
   - Your production frontend domain (e.g., https://cad-showcase.vercel.app)
4. Save the provider configuration and ensure it is enabled.

Update VITE_SUPABASE_REDIRECT_URL (frontend .env) to the redirect you want the Supabase-auth flow to return to.

## Next Step

Once the Supabase project is ready, we will scaffold the backend service (ackend/) with Express, Supabase client initialization, and file upload plumbing.
