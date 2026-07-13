import type { PrismaClient } from '@prisma/client';

export async function resetDb(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "user_roles",
      "role_permissions",
      "refresh_tokens",
      "verification_tokens",
      "users",
      "roles",
      "permissions"
    RESTART IDENTITY CASCADE
  `);
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
