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

  it("accepts an avatar data URL for service-level validation", async () => {
    const dto = Object.assign(new UpdateProfileDto(), {
      ...validProfile,
      avatarUrl: "data:image/png;base64,YWJj",
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
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
