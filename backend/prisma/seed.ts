/// <reference types="node" />
import { PrismaClient, RoleName, UserStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { promisify } from 'util';

const prisma = new PrismaClient();
const scrypt = promisify(crypto.scrypt);

async function hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16);
    const hash = (await scrypt(password, salt, 32)) as Buffer;
    return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

async function main() {
    const email = process.env.ADMIN_EMAIL || 'admin@tramk.local';
    const password = process.env.ADMIN_PASSWORD || 'Admin@1234567890';

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        console.log('Tài khoản Admin đã tồn tại.');
        return;
    }

    const role = await prisma.role.upsert({
        where: { name: RoleName.ADMIN },
        update: {},
        create: { name: RoleName.ADMIN },
    });

    await prisma.user.create({
        data: {
            email,
            fullName: 'Quản trị viên',
            passwordHash: await hashPassword(password),
            roleId: role.id,
            status: UserStatus.ACTIVE,
            emailVerifiedAt: new Date(),
        },
    });

    console.log(`Đã tạo Admin: ${email} / Mật khẩu: ${password}`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });