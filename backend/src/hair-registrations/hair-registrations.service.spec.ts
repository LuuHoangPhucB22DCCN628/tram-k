import { Test } from "@nestjs/testing";
import { HairRegistrationMode } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { CreateHairRegistrationDto } from "./dto/create-hair-registration.dto";
import { HairRegistrationsService } from "./hair-registrations.service";

describe("HairRegistrationsService", () => {
  const create = jest.fn();
  let service: HairRegistrationsService;

  beforeEach(async () => {
    create.mockReset();
    const module = await Test.createTestingModule({
      providers: [
        HairRegistrationsService,
        { provide: PrismaService, useValue: { hairRegistration: { create } } },
      ],
    }).compile();
    service = module.get(HairRegistrationsService);
  });

  it("stores a receive-hair request and only returns a public receipt", async () => {
    create.mockResolvedValue({
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

    await expect(service.create(dto)).resolves.toEqual({
      id: "TK-20260926-ABCD1234",
      status: "PENDING",
      submittedAt: "2026-09-26T10:00:00.000Z",
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mode: HairRegistrationMode.RECEIVE,
          diagnosis: "Ung thư tuyến giáp",
        }),
      }),
    );
  });
});
