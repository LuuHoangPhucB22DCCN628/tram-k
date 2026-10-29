import { ConflictException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { IdempotencyStatus, Prisma } from "@prisma/client";
import { createHash } from "crypto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class IdempotencyService {
    constructor(private readonly prisma: PrismaService) { }

    hashPayload(payload: unknown): string {
        return createHash("sha256").update(JSON.stringify(payload || {})).digest("hex");
    }

    async claim(actorScope: string, operation: string, key: string, payloadHash: string) {
        const existing = await this.prisma.idempotencyRecord.findUnique({
            where: { actorScope_operation_key: { actorScope, operation, key } },
        });

        const now = new Date();

        if (existing) {
            if (existing.expiresAt < now) {
                // Bản ghi đã hết hạn -> Xóa đi để claim lại
                await this.prisma.idempotencyRecord.delete({ where: { id: existing.id } });
            } else if (existing.payloadHash !== payloadHash) {
                throw new ConflictException("Idempotency-Key đã được sử dụng với nội dung khác.");
            } else if (existing.status === IdempotencyStatus.PROCESSING) {
                // Nếu bị kẹt quá 1 phút, cho phép claim lại (tránh treo vĩnh viễn)
                const staleTime = new Date(existing.createdAt.getTime() + 5 * 60 * 1000);
                if (now < staleTime) {
                    throw new ConflictException("Yêu cầu đang được xử lý. Vui lòng thử lại sau giây lát.");
                }

                const claimed = await this.prisma.idempotencyRecord.updateMany({
                    where: {
                        id: existing.id,
                        status: IdempotencyStatus.PROCESSING,
                        createdAt: { lt: staleTime },
                    },
                    data: { createdAt: now },
                });

                if (claimed.count === 0) {
                    throw new ConflictException("Yêu cầu đang được xử lý đồng thời. Vui lòng thử lại sau giây lát.");
                }
                return existing; // CLAIMED
            } else {
                return existing; // COMPLETED
            }
        }

        try {
            return await this.prisma.idempotencyRecord.create({
                data: {
                    actorScope,
                    operation,
                    key,
                    payloadHash,
                    responseStatus: 0,
                    responseBody: {},
                    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
                    status: IdempotencyStatus.PROCESSING,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException("Yêu cầu đang được xử lý đồng thời. Vui lòng thử lại sau.");
            }
            throw error;
        }
    }

    async complete(actorScope: string, operation: string, key: string, responseStatus: number, responseBody: Prisma.InputJsonValue) {
        await this.prisma.idempotencyRecord.update({
            where: { actorScope_operation_key: { actorScope, operation, key } },
            data: { status: IdempotencyStatus.COMPLETED, responseStatus, responseBody },
        });
    }

    // Xóa bản ghi nếu nghiệp vụ thất bại (để user có thể retry)
    async remove(actorScope: string, operation: string, key: string) {
        await this.prisma.idempotencyRecord.delete({
            where: { actorScope_operation_key: { actorScope, operation, key } },
        }).catch(() => undefined);
    }
}