import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const envSchema = z.object({
  PORT:                z.string().default('4001'),
  NODE_ENV:            z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL:        z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET:   z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  JWT_REFRESH_SECRET:  z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
  JWT_ACCESS_EXPIRY:   z.string().default('15m'),
  JWT_REFRESH_EXPIRY:  z.string().default('7d'),
  SMTP_HOST:           z.string().optional(),
  SMTP_PORT:           z.string().optional(),
  SMTP_USER:           z.string().optional(),
  SMTP_PASS:           z.string().optional(),
  EMAIL_FROM:          z.string().default('JobBoard <noreply@jobboard.dev>'),
  CLIENT_URL:          z.string().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
