import { PrismaClient, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const roles = await Promise.all(
    Object.values(RoleName).map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  const adminRole = roles.find((role) => role.name === RoleName.ADMIN);
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@tramk.vn';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminRole) {
    throw new Error('Khong tao duoc vai tro ADMIN.');
  }

  if (!adminPassword) {
    throw new Error('Can khai bao SEED_ADMIN_PASSWORD truoc khi chay seed.');
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      roleId: adminRole.id,
      isActive: true,
    },
    create: {
      email: adminEmail,
      passwordHash,
      fullName: 'Quan tri vien Tram K',
      roleId: adminRole.id,
    },
  });

  console.log(`Da seed 3 vai tro va tai khoan admin: ${adminEmail}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
