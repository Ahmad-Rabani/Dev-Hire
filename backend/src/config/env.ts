import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const WEAK_SECRET_PATTERN = /change-me|dev-access-secret|dev-refresh-secret/i;

/**
 * Load and validate environment variables once at startup.
 * Failing fast here prevents the server from running with a half-broken config.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    FRONTEND_ORIGIN: z.string().url().default('http://localhost:3001'),
    /** Public origin of this API (used for absolute upload URLs in emails/avatars). */
    PUBLIC_API_URL: z.string().url().default('http://localhost:5000'),
    JWT_ACCESS_SECRET: z.string().min(16).default('dev-access-secret-change-me'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_SECRET: z.string().min(16).default('dev-refresh-secret-change-me'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    COOKIE_SECURE: z
      .string()
      .optional()
      .transform((value) => value === 'true'),
    SMTP_HOST: z.string().optional().default(''),
    SMTP_PORT: z.coerce.number().optional().default(587),
    SMTP_SECURE: z
      .string()
      .optional()
      .transform((value) => value === 'true'),
    SMTP_USER: z.string().optional().default(''),
    SMTP_PASS: z.string().optional().default(''),
    EMAIL_FROM: z.string().optional().default('DevHire <noreply@devhire.local>'),
    /**
     * Email worker mode:
     * - inline: process outbox inside the API process (default for single-instance)
     * - external: only the CLI worker (`npm run worker:email`) should poll
     * - off: disable polling (tests / manual control)
     */
    EMAIL_WORKER_MODE: z.enum(['inline', 'external', 'off']).default('inline'),
    UPLOAD_DIR: z.string().default('uploads'),
    MAX_FILE_SIZE_MB: z.coerce.number().positive().default(5),
    /** local = filesystem (dev); s3 = S3-compatible object storage (production). */
    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    S3_BUCKET: z.string().optional().default(''),
    S3_REGION: z.string().optional().default('us-east-1'),
    S3_ENDPOINT: z.string().optional().default(''),
    S3_ACCESS_KEY_ID: z.string().optional().default(''),
    S3_SECRET_ACCESS_KEY: z.string().optional().default(''),
    S3_FORCE_PATH_STYLE: z
      .string()
      .optional()
      .transform((value) => value === 'true'),
    /** Optional Redis URL for multi-instance Socket.IO (not required for single-instance). */
    REDIS_URL: z.string().optional().default(''),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== 'production') return;

    if (data.JWT_ACCESS_SECRET.length < 32 || WEAK_SECRET_PATTERN.test(data.JWT_ACCESS_SECRET)) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_ACCESS_SECRET'],
        message:
          'Production requires JWT_ACCESS_SECRET ≥32 characters and not a known development default',
      });
    }
    if (data.JWT_REFRESH_SECRET.length < 32 || WEAK_SECRET_PATTERN.test(data.JWT_REFRESH_SECRET)) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_SECRET'],
        message:
          'Production requires JWT_REFRESH_SECRET ≥32 characters and not a known development default',
      });
    }
    if (data.STORAGE_DRIVER === 's3') {
      if (!data.S3_BUCKET || !data.S3_ACCESS_KEY_ID || !data.S3_SECRET_ACCESS_KEY) {
        ctx.addIssue({
          code: 'custom',
          path: ['STORAGE_DRIVER'],
          message:
            'STORAGE_DRIVER=s3 requires S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY',
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${details}`);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
