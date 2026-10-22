import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RoleName, UserStatus } from "@prisma/client";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { UploadedMediaFile } from "../media/media.types";
import { PrismaService } from "../prisma/prisma.service";
import { PartnerApplicationDocumentsService } from "./partner-application-documents.service";

describe("PartnerApplicationDocumentsService", () => {
  let directory: string;
  let service: PartnerApplicationDocumentsService;
  const actor: AuthenticatedUser = {
    id: "user-1",
    role: RoleName.PATIENT,
    authVersion: 1,
  };
  const userFindUnique = jest.fn();
  const documentFindUnique = jest.fn();
  const documentCreate = jest.fn();
  const prisma = {
    user: { findUnique: userFindUnique },
    partnerApplicationDocument: {
      findUnique: documentFindUnique,
      create: documentCreate,
    },
  } as unknown as PrismaService;

  const pdf = (overrides: Partial<UploadedMediaFile> = {}): UploadedMediaFile => {
    const buffer = Buffer.from("%PDF-1.7 test");
    return {
      buffer,
      mimetype: "application/pdf",
      originalname: "proof.pdf",
      size: buffer.length,
      ...overrides,
    };
  };

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "tram-k-partner-documents-"));
    service = new PartnerApplicationDocumentsService(
      {
        get: (_key: string, fallback: string) => directory || fallback,
      } as ConfigService,
      prisma,
    );
    jest.clearAllMocks();
    userFindUnique.mockResolvedValue({
      id: actor.id,
      deletedAt: null,
      status: UserStatus.ACTIVE,
      role: { name: RoleName.PATIENT },
      partnerMembership: null,
    });
    documentCreate.mockImplementation(({ data }) =>
      Promise.resolve({ id: "document-1", ...data }),
    );
  });

  afterEach(async () => rm(directory, { recursive: true, force: true }));

  it("stores a valid PDF with a generated storage key and allows its owner to load it", async () => {
    const file = pdf();
    const [document] = await service.store(actor, [file]);

    expect(document.storageKey).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(document).toEqual(
      expect.objectContaining({
        ownerId: actor.id,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.buffer.length,
      }),
    );
    documentFindUnique.mockResolvedValue(document);
    await expect(service.load(actor, document.storageKey)).resolves.toEqual({
      document,
      buffer: file.buffer,
    });
  });

  it("rejects a file whose declared MIME type does not match its magic bytes", async () => {
    await expect(
      service.store(actor, [
        pdf({
          buffer: Buffer.from("not a PDF"),
          mimetype: "application/pdf",
          size: 9,
        }),
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(documentCreate).not.toHaveBeenCalled();
  });

  it("enforces the 10 MB per-file limit and 30 MB total limit", async () => {
    await expect(
      service.store(actor, [pdf({ size: 10 * 1024 * 1024 + 1 })]),
    ).rejects.toBeInstanceOf(BadRequestException);

    const oversizedTotal = Array.from({ length: 4 }, () =>
      pdf({ size: 8 * 1024 * 1024 }),
    );
    await expect(
      service.store(actor, oversizedTotal),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(documentCreate).not.toHaveBeenCalled();
  });

  it("accepts at most five files", async () => {
    await expect(
      service.store(actor, Array.from({ length: 6 }, () => pdf())),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(documentCreate).not.toHaveBeenCalled();
  });

  it("prevents non-owners from loading documents and rejects traversal keys", async () => {
    documentFindUnique.mockResolvedValue({
      storageKey: "00000000-0000-4000-8000-000000000000.pdf",
      ownerId: "other-user",
    });

    await expect(
      service.load(actor, "00000000-0000-4000-8000-000000000000.pdf"),
    ).rejects.toBeInstanceOf(ForbiddenException);

    documentFindUnique.mockResolvedValue({
      storageKey: "..\\outside.pdf",
      ownerId: actor.id,
    });
    await expect(service.load(actor, "..\\outside.pdf")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
