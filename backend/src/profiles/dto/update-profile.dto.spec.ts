import { validate } from "class-validator";

import { UpdateProfileDto } from "./update-profile.dto";

describe("UpdateProfileDto", () => {
  const validProfile = {
    expectedVersion: 1,
    displayName: "Nguyễn An",
    phone: "0912345678",
    city: "Hà Nội",
    birthYear: 1994,
    bio: "Thành viên Trạm K",
    avatarUrl: null,
    visibility: "MEMBERS",
    showEmail: false,
    allowComments: true,
  };

  it("accepts a valid HTTPS avatar URL", async () => {
    const dto = Object.assign(new UpdateProfileDto(), {
      ...validProfile,
      avatarUrl: "https://cdn.example.com/avatar.jpg",
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("rejects malformed avatar URLs", async () => {
    const dto = Object.assign(new UpdateProfileDto(), {
      ...validProfile,
      avatarUrl: "not-a-url",
    });

    const errors = await validate(dto);

    expect(errors.map(({ property }) => property)).toContain("avatarUrl");
  });

  it("allows a missing or null avatar URL", async () => {
    const withoutAvatar = Object.assign(new UpdateProfileDto(), {
      ...validProfile,
      avatarUrl: undefined,
    });
    const withNullAvatar = Object.assign(new UpdateProfileDto(), validProfile);

    await expect(validate(withoutAvatar)).resolves.toHaveLength(0);
    await expect(validate(withNullAvatar)).resolves.toHaveLength(0);
  });
});
