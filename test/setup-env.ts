process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'local';

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgresql://postgres:admin@localhost:5432/test_db?schema=public';

process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379/1';

process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-test-access-secret-32';
process.env.JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '15m';
process.env.JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? '7d';

process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS ?? 'http://localhost:3000';

process.env.CSRF_ENABLED = 'false';
process.env.SWAGGER_ENABLED = 'false';
process.env.NEW_RELIC_ENABLED = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';

process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'silent';

process.env.MAIL_FROM = process.env.MAIL_FROM ?? 'no-reply@test.local';
process.env.SMTP_HOST = process.env.SMTP_HOST ?? 'smtp.test.local';
process.env.SMTP_PORT = process.env.SMTP_PORT ?? '587';
process.env.SMTP_USER = process.env.SMTP_USER ?? 'test';
process.env.SMTP_PASSWORD = process.env.SMTP_PASSWORD ?? 'test';
process.env.NEW_RELIC_APP_NAME = process.env.NEW_RELIC_APP_NAME ?? 'test-app';
process.env.NEW_RELIC_LICENSE_KEY =
  process.env.NEW_RELIC_LICENSE_KEY ?? '0000000000000000000000000000000000000000';
process.env.AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID ?? 'test-key';
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY ?? 'test-secret';
process.env.AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME ?? 'test-bucket';
