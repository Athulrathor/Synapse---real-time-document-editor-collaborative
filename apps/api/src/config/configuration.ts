export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT) || 4000,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
  },

  email: {
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM,
  },

  bullmq: {
    emailQueue: process.env.BULLMQ_EMAIL_QUEUE,
    emailConcurrency: Number(process.env.BULLMQ_EMAIL_CONCURRENCY),
    emailAttempts: Number(process.env.BULLMQ_EMAIL_ATTEMPTS),
    emailBackoffMs: Number(process.env.BULLMQ_EMAIL_BACKOFF_MS),
  },

  crypto: {
    encryptionKey: process.env.ENCRYPTION_KEY
  }
});
