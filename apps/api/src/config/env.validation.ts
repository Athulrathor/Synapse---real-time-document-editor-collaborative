import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),

  PORT: Joi.number().port().default(4000),

  DATABASE_URL: Joi.string().uri().required(),

  REDIS_URL: Joi.string().uri().required(),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),

  JWT_REFRESH_SECRET: Joi.string().min(32).required(),

  EMAIL_HOST: Joi.string().required(),

  EMAIL_PORT: Joi.number().port().default(587),

  EMAIL_SECURE: Joi.boolean().default(false),

  EMAIL_USER: Joi.string().email().required(),

  EMAIL_PASSWORD: Joi.string().required(),

  EMAIL_FROM: Joi.string().required(),

  ENCRYPTION_KEY: Joi.string().required(),
});
