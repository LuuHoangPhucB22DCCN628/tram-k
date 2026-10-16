import * as Joi from "joi";

const environmentSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "test", "production")
    .default("development"),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ["postgresql", "postgres"] })
    .required(),
  CORS_ORIGINS: Joi.string().default(
    "http://localhost:4200,http://localhost:4201",
  ),
  JWT_SECRET: Joi.string()
    .min(32)
    .when("NODE_ENV", {
      is: "production",
      then: Joi.required(),
      otherwise: Joi.string().default("tram-k-development-secret-change-me"),
    }),
  OUTBOX_ENCRYPTION_KEY: Joi.string()
    .min(32)
    .when("NODE_ENV", {
      is: "production",
      then: Joi.required(),
      otherwise: Joi.string().default(
        "tram-k-outbox-development-key-change-me",
      ),
    }),
  IP_HASH_SECRET: Joi.string()
    .min(32)
    .when("NODE_ENV", {
      is: "production",
      then: Joi.required(),
      otherwise: Joi.string().default(
        "tram-k-ip-hash-development-key-change-me",
      ),
    }),
  TERMS_VERSION: Joi.string().default("2026-10-03"),
  PRIVACY_VERSION: Joi.string().default("2026-10-03"),
  PUBLIC_WEB_URL: Joi.string().uri().default("http://localhost:4201"),
  AUTH_JOBS_ENABLED: Joi.boolean().truthy("true").falsy("false").default(true),
  OUTBOX_POLL_INTERVAL_MS: Joi.number().integer().min(1000).default(5000),
  ACCOUNT_CLEANUP_INTERVAL_MS: Joi.number()
    .integer()
    .min(60000)
    .default(3600000),
  EMAIL_DELIVERY_MODE: Joi.string().valid("log", "webhook", "smtp").default("log"),
  EMAIL_WEBHOOK_URL: Joi.string().uri().when("EMAIL_DELIVERY_MODE", {
    is: "webhook",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  EMAIL_WEBHOOK_TOKEN: Joi.string().min(16).when("EMAIL_DELIVERY_MODE", {
    is: "webhook",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  SMTP_HOST: Joi.string().hostname().when("EMAIL_DELIVERY_MODE", {
    is: "smtp",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  SMTP_PORT: Joi.number().port().when("EMAIL_DELIVERY_MODE", {
    is: "smtp",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  SMTP_SECURE: Joi.boolean().truthy("true").falsy("false").default(true),
  SMTP_USER: Joi.string().email().when("EMAIL_DELIVERY_MODE", {
    is: "smtp",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  SMTP_PASS: Joi.string().min(1).when("EMAIL_DELIVERY_MODE", {
    is: "smtp",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  EMAIL_FROM: Joi.string().default("Trạm K <no-reply@tramk.local>"),
  SEED_ADMIN_EMAIL: Joi.string().email().default("admin@tramk.vn"),
  SEED_ADMIN_PASSWORD: Joi.string().min(8).optional(),
  AI_PROVIDER: Joi.string().valid("local", "openai").default("local"),
  OPENAI_API_KEY: Joi.string().min(20).optional(),
  OPENAI_MODEL: Joi.string().default("gpt-6-luna"),
  AI_RATE_LIMIT_PER_MINUTE: Joi.number().integer().min(1).max(60).default(12),
  MEDIA_STORAGE_PATH: Joi.string().default("E:/TramK/media"),
}).unknown(true);

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const result = environmentSchema.validate(config, { abortEarly: false });
  if (result.error)
    throw new Error(`Environment validation failed: ${result.error.message}`);
  return result.value as Record<string, unknown>;
}
