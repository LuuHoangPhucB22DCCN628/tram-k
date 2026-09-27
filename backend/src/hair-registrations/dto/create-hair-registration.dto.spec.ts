import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { CreateHairRegistrationDto } from "./create-hair-registration.dto";

describe("CreateHairRegistrationDto", () => {
  const validReceiveRequest = {
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
  };

  it("accepts a complete receive-hair request", async () => {
    const dto = plainToInstance(CreateHairRegistrationDto, validReceiveRequest);

    expect(await validate(dto)).toHaveLength(0);
  });

  it("rejects an invalid phone and a district containing only numbers", async () => {
    const dto = plainToInstance(CreateHairRegistrationDto, {
      ...validReceiveRequest,
      phone: "64456654",
      district: "2212",
    });
    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["phone", "district"]),
    );
  });

  it("requires all donate-only fields when mode is donate", async () => {
    const dto = plainToInstance(CreateHairRegistrationDto, {
      ...validReceiveRequest,
      mode: "donate",
      relativePhone: undefined,
      relativeName: undefined,
      duration: undefined,
      hospital: undefined,
      diagnosis: undefined,
      borrowDate: undefined,
    });
    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        "donationLocation",
        "donatedLength",
        "acceptedCommitments",
      ]),
    );
  });
});
