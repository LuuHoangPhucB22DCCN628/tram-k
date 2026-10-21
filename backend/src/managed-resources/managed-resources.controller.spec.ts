
import { SearchDocumentType } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth-user.interface";
import { ManagedResourcesController } from "./managed-resources.controller";
import { ManagedResourcesService } from "./managed-resources.service";

describe("ManagedResourcesController", () => {
    let controller: ManagedResourcesController;
    let resources: {
        remove: jest.Mock;
    };

    beforeEach(() => {
        resources = {
            remove: jest.fn().mockResolvedValue(undefined),
        };

        controller = new ManagedResourcesController(
            resources as unknown as ManagedResourcesService,
        );
    });

    describe("remove", () => {
        it("deletes the resource and returns the success envelope", async () => {
            const actor = {
                id: "user-123",
            } as AuthenticatedUser;
            const type = SearchDocumentType.SUPPORT_PROGRAM;
            const sourceId = "program-123";

            const result = await controller.remove(actor, type, sourceId);

            expect(resources.remove).toHaveBeenCalledWith(
                actor,
                type,
                sourceId,
            );
            expect(result).toEqual({
                success: true,
                data: null,
            });
        });

        it("propagates the service error when deletion fails", async () => {
            const actor = {
                id: "user-123",
            } as AuthenticatedUser;
            const type = SearchDocumentType.SUPPORT_PROGRAM;
            const sourceId = "program-123";
            const error = new Error("Deletion failed");

            resources.remove.mockRejectedValueOnce(error);

            await expect(
                controller.remove(actor, type, sourceId),
            ).rejects.toBe(error);

            expect(resources.remove).toHaveBeenCalledWith(
                actor,
                type,
                sourceId,
            );
        });
    });
});
