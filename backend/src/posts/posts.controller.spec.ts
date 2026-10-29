import { RoleName } from "@prisma/client";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { ReviewDecision } from "./dto/review-post.dto";
import { PostsController } from "./posts.controller";
import { PostsService } from "./posts.service";

describe("PostsController", () => {
  const posts = {
    create: jest.fn(),
    submitForReview: jest.fn(),
    review: jest.fn(),
  };
  const controller = new PostsController(posts as unknown as PostsService);
  const user: AuthenticatedUser = {
    id: "user-1",
    role: RoleName.PATIENT,
    authVersion: 1,
  };
  const admin: AuthenticatedUser = {
    id: "admin-1",
    role: RoleName.ADMIN,
    authVersion: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a post inside the success envelope", async () => {
    const dto = { title: "Bai viet", body: "Noi dung", idempotencyKey: "k1" };
    posts.create.mockResolvedValue({ id: "post-1" });

    await expect(controller.create(user, dto as never)).resolves.toEqual({
      success: true,
      data: { id: "post-1" },
    });
    expect(posts.create).toHaveBeenCalledWith(user.id, dto);
  });

  it("submits a post for review inside the success envelope", async () => {
    posts.submitForReview.mockResolvedValue({ id: "post-1", status: "PENDING" });

    await expect(controller.submit(user, "post-1")).resolves.toEqual({
      success: true,
      data: { id: "post-1", status: "PENDING" },
    });
    expect(posts.submitForReview).toHaveBeenCalledWith(user.id, "post-1");
  });

  it("reviews a post inside the success envelope", async () => {
    const dto = { decision: ReviewDecision.APPROVE };
    posts.review.mockResolvedValue({ id: "post-1", status: "PUBLISHED" });

    await expect(controller.review(admin, "post-1", dto)).resolves.toEqual({
      success: true,
      data: { id: "post-1", status: "PUBLISHED" },
    });
    expect(posts.review).toHaveBeenCalledWith(admin.id, "post-1", dto);
  });
});
