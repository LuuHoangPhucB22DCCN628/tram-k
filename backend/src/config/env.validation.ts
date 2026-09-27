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
  SEED_ADMIN_EMAIL: Joi.string().email().default("admin@tramk.vn"),
  SEED_ADMIN_PASSWORD: Joi.string().min(8).optional(),
}).unknown(true);

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const result = environmentSchema.validate(config, { abortEarly: false });
  if (result.error)
    throw new Error(`Environment validation failed: ${result.error.message}`);
  return result.value as Record<string, unknown>;
}
