import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z
  .object({
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    GITHUB_APP_ID: z.string().min(1),
    GITHUB_PRIVATE_KEY: z.string().min(1),
    GITHUB_WEBHOOK_SECRET: z.string().min(1),
    LLM_PROVIDER: z.enum(['openai', 'anthropic']).default('openai'),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().default('gpt-4o-mini'),
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_MODEL: z.string().default('claude-3-5-haiku-20241022'),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    DASHBOARD_API_KEY: z.string().min(8).default('dev-dashboard-key'),
  })
  .superRefine((data, ctx) => {
    if (data.LLM_PROVIDER === 'openai' && !data.OPENAI_API_KEY?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OPENAI_API_KEY is required when LLM_PROVIDER=openai',
        path: ['OPENAI_API_KEY'],
      });
    }
    if (data.LLM_PROVIDER === 'anthropic' && !data.ANTHROPIC_API_KEY?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic',
        path: ['ANTHROPIC_API_KEY'],
      });
    }
  });

function loadConfig() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${missing}`);
  }
  return parsed.data;
}

/** Lazy-loaded so tests can set env before import side effects. */
let cached: ReturnType<typeof loadConfig> | null = null;

export function getConfig() {
  if (!cached) {
    cached = loadConfig();
  }
  return cached;
}

export function resetConfigForTests() {
  cached = null;
}
