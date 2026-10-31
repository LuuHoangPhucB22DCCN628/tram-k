import { Test } from "@nestjs/testing";
import { HairRegistrationMode, RoleName } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateHairRegistrationDto } from "./dto/create-hair-registration.dto";
import { HairRegistrationsService } from "./hair-registrations.service";

describe("HairRegistrationsService", () => {
  const create = jest.fn();
  const notify = jest.fn();
  const actor = { id: "user-1", role: RoleName.PATIENT, authVersion: 1 };
  let service: HairRegistrationsService;

  beforeEach(async () => {
    create.mockReset();
    notify.mockReset();
    const module = await Test.createTestingModule({
      providers: [
        HairRegistrationsService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: (callback: (tx: unknown) => Promise<unknown>) =>
              callback({ hairRegistration: { create } }),
          },
        },
        { provide: NotificationsService, useValue: { create: notify } },
      ],
    }).compile();
    service = module.get(HairRegistrationsService);
  });

  it("stores a receive-hair request and only returns a public receipt", async () => {
    create.mockResolvedValue({
      id: "hair-1",
      reference: "TK-20260926-ABCD1234",
      createdAt: new Date("2026-09-26T10:00:00.000Z"),
    });
    const dto = {
      mode: "receive",
      fullName: "Nguyễn Văn An",
      phone: "0912345678",
      province: "Hà Nội",
      district: "Ba Đình",
      address: "12 Phố Huế",
      gender: "male",
      relativePhone: "0987654321",
      relativeName: "Nguyễn Thị Mai",
      duration: "3 tháng",
      hospital: "Bệnh viện K",
      diagnosis: "Ung thư tuyến giáp",
      borrowDate: "2099-01-01",
      transparency: "Tôi cam kết thông tin đã điền là đúng.",
    } as CreateHairRegistrationDto;

    await expect(service.create(dto, actor)).resolves.toEqual({
      id: "TK-20260926-ABCD1234",
      status: "PENDING",
      submittedAt: "2026-09-26T10:00:00.000Z",
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mode: HairRegistrationMode.RECEIVE,
          userId: actor.id,
          diagnosis: "Ung thư tuyến giáp",
        }),
      }),
    );
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: actor.id,
        kind: "HAIR_REGISTRATION_SENT",
        link: "/tra-cuu-ma?ma=TK-20260926-ABCD1234",
      }),
      expect.anything(),
    );
  });

  it("links an authenticated request and confirms it in the user's notifications", async () => {
    create.mockResolvedValue({
      id: "hair-2",
      reference: "TK-20261016-ABCDEF12",
      createdAt: new Date("2026-10-16T10:00:00.000Z"),
    });
    const dto = {
      mode: "donate",
      fullName: "Nguyễn Văn An",
      phone: "0912345678",
    } as CreateHairRegistrationDto;

    await expect(service.create(dto, actor)).resolves.toMatchObject({
      id: "TK-20261016-ABCDEF12",
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "user-1" }) }),
    );
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "user-1",
        kind: "HAIR_REGISTRATION_SENT",
        link: "/tra-cuu-ma?ma=TK-20261016-ABCDEF12",
        dedupeKey: "hair-registration:hair-2:sent",
      }),
      expect.anything(),
    );
  });
});
