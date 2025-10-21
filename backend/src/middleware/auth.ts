import type { Request, Response, NextFunction } from 'express';
import { supabaseServiceClient } from '../lib/supabase.js';

const extractToken = (authorizationHeader?: string | null) => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.trim().split(/\s+/);
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
};

const attachAuthUser = (
  req: Request,
  token: string,
  data: NonNullable<Awaited<ReturnType<typeof supabaseServiceClient.auth.getUser>>['data']>
) => {
  req.authUser = {
    id: data.user?.id ?? null,
    email: data.user?.email ?? null,
    token
  };

  if (data.user) {
    req.authUser.raw = data.user;
  }
};

export const requireSupabaseAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req.header('authorization'));
    if (!token) {
      res.status(401).json({ message: 'Authorization token missing' });
      return;
    }

    const { data, error } = await supabaseServiceClient.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({ message: 'Invalid or expired auth token' });
      return;
    }

    attachAuthUser(req, token, data);
    next();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auth verification failed', error);
    res.status(401).json({ message: 'Unable to verify auth token' });
  }
};

export const maybeSupabaseAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req.header('authorization'));
    if (!token) {
      next();
      return;
    }

    const { data, error } = await supabaseServiceClient.auth.getUser(token);
    if (error || !data.user) {
      next();
      return;
    }

    attachAuthUser(req, token, data);
    next();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Optional auth verification failed', error);
    next();
  }
};
