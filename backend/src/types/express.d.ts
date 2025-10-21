import type { User } from '@supabase/supabase-js';

declare module 'express-serve-static-core' {
  interface Request {
    authUser?: {
      id: string | null;
      email?: string | null;
      token: string;
      raw?: User;
    };
  }
}
