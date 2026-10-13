import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RoleName, UserStatus } from "@prisma/client";
import { randomUUID } from "crypto";
import { mkdir, readFile, stat, unlink, writeFile } from "fs/promises";
import { resolve } from "path";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { UploadedMediaFile } from "../media/media.types";
import { PrismaService } from "../prisma/prisma.service";

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const DOCUMENT_CONFIG = {
  "application/pdf": {
    extension: ".pdf",
    signature: (bytes: Buffer) => bytes.toString("ascii", 0, 5) === "%PDF-",
  },
  "image/jpeg": {
    extension: ".jpg",
    signature: (bytes: Buffer) =>
      bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  "image/png": {
    extension: ".png",
    signature: (bytes: Buffer) =>
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
} as const;

type DocumentMimeType = keyof typeof DOCUMENT_CONFIG;

@Injectable()
export class PartnerApplicationDocumentsService {
  private readonly storagePath: string;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.storagePath = resolve(
      config.get<string>(
        "PARTNER_DOCUMENT_STORAGE_PATH",
        "E:/TramK/partner-documents",
      ),
    );
  }

  async store(
    actor: AuthenticatedUser,
    files: readonly UploadedMediaFile[] | undefined,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: actor.id },
      include: { role: true, partnerMembership: true },
    });
    if (
      !user ||
      user.deletedAt ||
      user.status !== UserStatus.ACTIVE ||
      user.role.name === RoleName.ADMIN ||
      user.partnerMembership
    ) {
      throw new ForbiddenException(
        "Tài khoản không đủ điều kiện nộp hồ sơ đối tác.",
      );
    }
    if (!files?.length || files.length > 10) {
      throw new BadRequestException(
        "Vui lòng chọn từ 1 đến 10 tệp minh chứng.",
      );
    }

    await mkdir(this.storagePath, { recursive: true });
    const stored = [];
    for (const file of files) stored.push(await this.storeOne(actor.id, file));
    return stored;
  }

  async load(actor: AuthenticatedUser, storageKey: string) {
    const document = await this.prisma.partnerApplicationDocument.findUnique({
      where: { storageKey },
    });
    if (!document)
      throw new NotFoundException("Không tìm thấy tệp minh chứng.");
    if (actor.role !== RoleName.ADMIN && document.ownerId !== actor.id) {
      throw new ForbiddenException(
        "Bạn không có quyền xem tệp minh chứng này.",
      );
    }
    try {
      const path = this.resolveFile(storageKey);
      const details = await stat(path);
      if (!details.isFile()) throw new Error("Not a file");
      return { document, buffer: await readFile(path) };
    } catch {
      throw new NotFoundException("Không tìm thấy tệp minh chứng.");
    }
  }

  private async storeOne(ownerId: string, file: UploadedMediaFile) {
    const config = DOCUMENT_CONFIG[file.mimetype as DocumentMimeType];
    if (
      !file.buffer?.length ||
      !config ||
      !config.signature(file.buffer) ||
      file.size > MAX_DOCUMENT_BYTES ||
      file.buffer.length > MAX_DOCUMENT_BYTES
    ) {
      throw new BadRequestException(
        "Chỉ hỗ trợ PDF, JPG hoặc PNG hợp lệ, tối đa 5 MB mỗi tệp.",
      );
    }
    const storageKey = `${randomUUID()}${config.extension}`;
    const path = this.resolveFile(storageKey);
    await writeFile(path, file.buffer, { flag: "wx" });
    try {
      return await this.prisma.partnerApplicationDocument.create({
        data: {
          ownerId,
          storageKey,
          originalName: file.originalname.slice(0, 255),
          mimeType: file.mimetype,
          size: file.buffer.length,
        },
      });
    } catch (error) {
      await unlink(path).catch(() => undefined);
      throw error;
    }
  }

  private resolveFile(storageKey: string): string {
    if (!/^[0-9a-f-]{36}\.(pdf|jpg|png)$/.test(storageKey)) {
      throw new NotFoundException("Không tìm thấy tệp minh chứng.");
    }
    const path = resolve(this.storagePath, storageKey);
    if (!path.startsWith(`${this.storagePath}\\`)) {
      throw new NotFoundException("Không tìm thấy tệp minh chứng.");
    }
    return path;
  }
}
