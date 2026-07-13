import { execSync } from 'node:child_process';

export default function globalSetup(): void {
  const databaseUrl =
    process.env.TEST_DATABASE_URL ??
    'postgresql://postgres:admin@localhost:5432/test_db?schema=public';

  console.log('\n[e2e] Applying migrations to the test database...');

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  console.log('[e2e] Migrations applied.\n');
}
