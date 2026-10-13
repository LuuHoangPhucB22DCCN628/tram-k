import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RoleName } from "@prisma/client";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

import { MediaService } from "./media.service";

describe("MediaService", () => {
  let directory: string;
  let service: MediaService;
  const admin = { id: "admin-1", role: RoleName.ADMIN, authVersion: 1 };

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "tram-k-media-"));
    service = new MediaService({
      get: (_key: string, fallback: string) => directory || fallback,
    } as ConfigService);
  });

  afterEach(async () => rm(directory, { recursive: true, force: true }));

  it("stores and loads an image using a generated safe file name", async () => {
    const buffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01,
    ]);

    const stored = await service.store(admin, "image", {
      buffer,
      mimetype: "image/png",
      originalname: "../../danger.png",
      size: buffer.length,
    });

    expect(stored.fileName).toMatch(/^[0-9a-f-]{36}\.png$/);
    await expect(service.load(stored.fileName)).resolves.toEqual({
      buffer,
      mimeType: "image/png",
    });
  });

  it("rejects a MIME type whose bytes do not match the file signature", async () => {
    await expect(
      service.store(admin, "image", {
        buffer: Buffer.from("not an image"),
        mimetype: "image/png",
        originalname: "fake.png",
        size: 12,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("allows only administrators to upload editorial media", async () => {
    await expect(
      service.store(
        { id: "patient-1", role: RoleName.PATIENT, authVersion: 1 },
        "audio",
        {
          buffer: Buffer.from("ID3podcast"),
          mimetype: "audio/mpeg",
          originalname: "podcast.mp3",
          size: 10,
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("does not resolve traversal or arbitrary file names", async () => {
    await expect(service.load("../secret.txt")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
