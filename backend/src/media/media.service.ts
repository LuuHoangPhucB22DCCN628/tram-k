import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RoleName } from "@prisma/client";
import { randomUUID } from "crypto";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "path";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { MediaKind, StoredMedia, UploadedMediaFile } from "./media.types";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_AUDIO_BYTES = 30 * 1024 * 1024;

const MIME_CONFIG = {
  "image/jpeg": { extension: ".jpg", kind: "image" },
  "image/png": { extension: ".png", kind: "image" },
  "image/webp": { extension: ".webp", kind: "image" },
  "audio/mpeg": { extension: ".mp3", kind: "audio" },
  "audio/mp4": { extension: ".m4a", kind: "audio" },
  "audio/m4a": { extension: ".m4a", kind: "audio" },
  "audio/x-m4a": { extension: ".m4a", kind: "audio" },
  "audio/aac": { extension: ".aac", kind: "audio" },
  "audio/ogg": { extension: ".ogg", kind: "audio" },
  "audio/wav": { extension: ".wav", kind: "audio" },
  "audio/x-wav": { extension: ".wav", kind: "audio" },
  "audio/webm": { extension: ".webm", kind: "audio" },
} as const;

type SupportedMimeType = keyof typeof MIME_CONFIG;

@Injectable()
export class MediaService {
  private readonly storagePath: string;

  constructor(config: ConfigService) {
    this.storagePath = resolve(
      config.get<string>("MEDIA_STORAGE_PATH", "E:/TramK/media"),
    );
  }

  async store(
    actor: AuthenticatedUser,
    kind: MediaKind,
    file?: UploadedMediaFile,
  ): Promise<StoredMedia> {
    if (actor.role !== RoleName.ADMIN) {
      throw new ForbiddenException(
        "Chỉ quản trị viên được tải tệp nội dung lên hệ thống.",
      );
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException("Vui lòng chọn tệp cần tải lên.");
    }

    const config = MIME_CONFIG[file.mimetype as SupportedMimeType];
    if (!config || config.kind !== kind || !this.hasValidSignature(file)) {
      throw new BadRequestException(
        kind === "image"
          ? "Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP hợp lệ."
          : "Chỉ hỗ trợ âm thanh MP3, M4A, OGG, WAV hoặc WebM hợp lệ.",
      );
    }

    const maximumBytes = kind === "image" ? MAX_IMAGE_BYTES : MAX_AUDIO_BYTES;
    if (file.size > maximumBytes || file.buffer.length > maximumBytes) {
      throw new BadRequestException(
        kind === "image"
          ? "Ảnh tải lên tối đa 2 MB."
          : "Tệp âm thanh tải lên tối đa 30 MB.",
      );
    }

    await mkdir(this.storagePath, { recursive: true });
    const fileName = `${randomUUID()}${config.extension}`;
    await writeFile(this.resolveFile(fileName), file.buffer, { flag: "wx" });
    return {
      fileName,
      mimeType: file.mimetype,
      size: file.buffer.length,
    };
  }

  async load(fileName: string): Promise<{
    readonly buffer: Buffer;
    readonly mimeType: string;
  }> {
    if (
      !/^[0-9a-f-]{36}\.(jpg|png|webp|mp3|m4a|aac|ogg|wav|webm)$/.test(fileName)
    ) {
      throw new NotFoundException("Không tìm thấy tệp phương tiện.");
    }

    const path = this.resolveFile(fileName);
    try {
      const details = await stat(path);
      if (!details.isFile()) throw new Error("Not a file");
      return {
        buffer: await readFile(path),
        mimeType: this.mimeTypeForExtension(extname(fileName)),
      };
    } catch {
      throw new NotFoundException("Không tìm thấy tệp phương tiện.");
    }
  }

  private resolveFile(fileName: string): string {
    const filePath = resolve(this.storagePath, fileName);
    const relativePath = relative(this.storagePath, filePath);
    if (
      !relativePath ||
      relativePath === ".." ||
      relativePath.startsWith(`..${sep}`) ||
      isAbsolute(relativePath)
    ) {
      throw new NotFoundException("Không tìm thấy tệp phương tiện.");
    }
    return filePath;
  }

  private hasValidSignature(file: UploadedMediaFile): boolean {
    const bytes = file.buffer;
    switch (file.mimetype) {
      case "image/jpeg":
        return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      case "image/png":
        return bytes
          .subarray(0, 8)
          .equals(
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          );
      case "image/webp":
        return (
          bytes.toString("ascii", 0, 4) === "RIFF" &&
          bytes.toString("ascii", 8, 12) === "WEBP"
        );
      case "audio/mpeg":
        return (
          bytes.toString("ascii", 0, 3) === "ID3" ||
          (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
        );
      case "audio/mp4":
      case "audio/m4a":
      case "audio/x-m4a":
        return bytes.toString("ascii", 4, 8) === "ftyp";
      case "audio/aac":
        return bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0;
      case "audio/ogg":
        return bytes.toString("ascii", 0, 4) === "OggS";
      case "audio/wav":
      case "audio/x-wav":
        return (
          bytes.toString("ascii", 0, 4) === "RIFF" &&
          bytes.toString("ascii", 8, 12) === "WAVE"
        );
      case "audio/webm":
        return bytes
          .subarray(0, 4)
          .equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
      default:
        return false;
    }
  }

  private mimeTypeForExtension(extension: string): string {
    return (
      {
        ".jpg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".mp3": "audio/mpeg",
        ".m4a": "audio/mp4",
        ".aac": "audio/aac",
        ".ogg": "audio/ogg",
        ".wav": "audio/wav",
        ".webm": "audio/webm",
      }[extension] ?? "application/octet-stream"
    );
  }
}
