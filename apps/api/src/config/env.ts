import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3001'),
  GOOGLE_CLIENT_ID: z.string().transform((s) => s.trim()).optional(),
  GOOGLE_CLIENT_SECRET: z.string().transform((s) => s.trim()).optional(),
  // Full URL where Google sends users after consent — MUST go through the frontend proxy
  // Dev:  http://localhost:3000/api/auth/google/callback  (Vite proxies to API)
  // Prod: https://<your-vercel-domain>/api/auth/google/callback  (Vercel proxies to Render)
  GOOGLE_CALLBACK_URL: z.string().transform((s) => s.trim()).pipe(z.string().url()).optional(),
  // The public URL of the frontend — used for post-OAuth redirects
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.coerce.number().default(5242880),
  OPENAI_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();
