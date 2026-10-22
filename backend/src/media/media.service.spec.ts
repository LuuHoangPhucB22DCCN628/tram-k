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
const sharp = require("sharp") as typeof import("sharp").default;

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
    const buffer = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 3,
        background: { r: 20, g: 80, b: 140 },
      },
    })
      .png()
      .toBuffer();

    const stored = await service.store(admin, "avatar", {
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

  it("removes EXIF metadata before storing an image", async () => {
    const imageWithExif = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 3,
        background: { r: 120, g: 40, b: 20 },
      },
    })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Copyright: "private-exif-marker" } } })
      .toBuffer();

    const stored = await service.store(admin, "avatar", {
      buffer: imageWithExif,
      mimetype: "image/jpeg",
      originalname: "photo.jpg",
      size: imageWithExif.length,
    });
    const loaded = await service.load(stored.fileName);
    const metadata = await sharp(loaded.buffer).metadata();

    expect(metadata.exif).toBeUndefined();
    expect(loaded.buffer.includes(Buffer.from("private-exif-marker"))).toBe(false);
  });

  it("rejects a MIME type whose bytes do not match the file signature", async () => {
    await expect(
      service.store(admin, "avatar", {
        buffer: Buffer.from("not an image"),
        mimetype: "image/png",
        originalname: "fake.png",
        size: 12,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a post image larger than the SRS per-image limit", async () => {
    const buffer = Buffer.alloc(5 * 1024 * 1024 + 1);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);

    await expect(
      service.store(admin, "post_image", {
        buffer,
        mimetype: "image/png",
        originalname: "large.png",
        size: buffer.length,
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
    for (const fileName of [
      "../secret.txt",
      "..\\secret.txt",
      "C:\\secret.jpg",
      "%2e%2e%2fsecret.jpg",
    ]) {
      await expect(service.load(fileName)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    }
  });
});
