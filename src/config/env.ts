/**
 * Centralised, validated environment configuration.
 *
 * Read this module once, anywhere in the backend, instead of touching
 * `process.env` directly. Required vars are validated at startup so the
 * server fails fast with a clear message when a deploy is misconfigured.
 *
 * Adding a new variable:
 *   1. Add it to envSchema below with a sensible default or `.optional()`.
 *   2. Add it to .env.example with a comment describing what it does.
 *   3. Read it as `env.NEW_VAR` — never `process.env.NEW_VAR`.
 *
 * The module is intentionally NOT a class — keep it a frozen object
 * import. No mutability, no dependency injection ceremony.
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env once at module init; routes that import `env` get the parsed
// shape, not the raw process.env.
dotenv.config();

const envSchema = z.object({
  // Runtime
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),

  // Database — Prisma reads this directly; we validate its presence here too
  // so misconfigured deploys fail at module load instead of on first query.
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // CORS / frontend
  CORS_ORIGIN: z.string().default('*'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Auth
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),

  // Google OAuth — all three required for the OAuth flow to work; if any
  // is missing the /api/auth/google endpoints will fail when invoked.
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url(),

  // AI providers — required, no graceful degradation
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),

  // Optional integrations
  YOUTUBE_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // Print a focused, copy-pasteable list of what's wrong before crashing.
  console.error('❌ Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('See .env.example for the expected shape.');
  process.exit(1);
}

export const env = Object.freeze(parsed.data);

export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
