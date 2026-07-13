import type { PrismaClient } from '@prisma/client';

export async function resetDb(prisma: PrismaClient): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE '_prisma%'
  `;

  if (tables.length === 0) {
    throw new Error(
      'resetDb: no tables found in the "public" schema.\n' +
        'Migrations likely did not run against this database, or DATABASE_URL ' +
        'points at a different one.\n' +
        `DATABASE_URL=${process.env.DATABASE_URL ?? '(unset)'}`,
    );
  }

  const names = tables.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
}

export async function seedRoles(prisma: PrismaClient): Promise<void> {
  const userRole = await prisma.role.create({
    data: { name: 'user', description: 'Standard user', isSystem: true },
  });

  const readSelf = await prisma.permission.create({
    data: { name: 'users:read', resource: 'users', action: 'read' },
  });

  await prisma.rolePermission.create({
    data: { roleId: userRole.id, permissionId: readSelf.id },
  });
}
