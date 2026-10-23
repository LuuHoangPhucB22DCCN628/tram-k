import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash } from "crypto";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class IdempotencyService {
    constructor(private readonly prisma: PrismaService) { }

    hashPayload(payload: unknown): string {
        return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    }

    async findRecord(actorScope: string, operation: string, key: string) {
        return this.prisma.idempotencyRecord.findUnique({
            where: {
                actorScope_operation_key: { actorScope, operation, key },
            },
        });
    }

    async saveRecord(
        actorScope: string,
        operation: string,
        key: string,
        payloadHash: string,
        responseStatus: number,
        responseBody: Prisma.InputJsonValue,
    ) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 giờ
        return this.prisma.idempotencyRecord.create({
            data: {
                actorScope,
                operation,
                key,
                payloadHash,
                responseStatus,
                responseBody,
                expiresAt,
            },
        });
    }


    async validateOrThrow(
        actorScope: string,
        operation: string,
        key: string,
        payloadHash: string,
    ) {
        const existing = await this.findRecord(
            actorScope,
            operation,
            key,
        );

        if (!existing) return null;

        if (existing.expiresAt <= new Date()) {
            await this.prisma.idempotencyRecord.delete({
                where: {
                    actorScope_operation_key: {
                        actorScope,
                        operation,
                        key,
                    },
                },
            });

            return null;
        }

        if (existing.payloadHash !== payloadHash) {
            throw new ConflictException(
                "Idempotency-Key đã được sử dụng với nội dung khác.",
            );
        }

        return existing;


    }
}