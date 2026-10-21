import { Test, TestingModule } from "@nestjs/testing";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CommunityEngagementController } from "./community-engagement.controller";
import { CommunityEngagementService } from "./community-engagement.service";

describe("CommunityEngagementController", () => {
    let controller: CommunityEngagementController;
    let engagement: {
        listReplies: jest.Mock;
    };

    beforeEach(async () => {
        engagement = {
            listReplies: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [CommunityEngagementController],
            providers: [
                {
                    provide: CommunityEngagementService,
                    useValue: engagement,
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<CommunityEngagementController>(
            CommunityEngagementController,
        );
    });

    it("returns replies in a success envelope", async () => {
        const sourceKey = "story-1";
        const commentId = "comment-1";
        const query = { page: 2, limit: 10 };
        const replies = {
            items: [{ id: "reply-1" }],
            total: 1,
            page: 2,
            limit: 10,
        };
        engagement.listReplies.mockResolvedValue(replies);

        await expect(
            controller.listReplies({ sourceKey }, commentId, query),
        ).resolves.toEqual({
            success: true,
            data: replies,
        });
        expect(engagement.listReplies).toHaveBeenCalledWith(
            sourceKey,
            commentId,
            query.page,
            query.limit,
        );
    });

    it("propagates service errors", async () => {
        const error = new Error("Failed to load replies");
        engagement.listReplies.mockRejectedValue(error);

        await expect(
            controller.listReplies(
                { sourceKey: "story-1" },
                "comment-1",
                { page: 1, limit: 20 },
            ),
        ).rejects.toBe(error);
    });
});