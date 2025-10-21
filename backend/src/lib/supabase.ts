import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

// TODO: Replace `any` with generated Supabase types when available.
type Database = any;

export const supabaseServiceClient = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export const supabasePublicClient = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
