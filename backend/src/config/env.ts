import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(4000),
    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SUPABASE_STORAGE_BUCKET_UPLOADS: z.string().min(1),
    SUPABASE_STORAGE_BUCKET_CONVERTED: z.string().min(1),
    FREECAD_CMD: z.string().optional(),
    CADQUERY_DOCKER_IMAGE: z.string().optional(),
    CAD_CONVERSION_TIMEOUT_MS: z.coerce.number().default(2 * 60 * 1000)
  })
  .transform((values) => ({
    ...values,
    isDev: values.NODE_ENV === 'development'
  }));

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
