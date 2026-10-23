import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ProgramStatus, SupportProgramRegistrationStatus } from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProgramsScheduler {
    private readonly logger = new Logger(ProgramsScheduler.name);

    constructor(private readonly prisma: PrismaService) { }

    @Cron(CronExpression.EVERY_MINUTE)
    async handleProgramCompletion() {
        if (process.env.JOBS_ENABLED === 'false') return;
        const now = new Date();

        const expiredPrograms = await this.prisma.program.findMany({
            where: {
                status: { in: [ProgramStatus.PUBLISHED, ProgramStatus.HIDDEN] },
                endAt: { lte: now },
                deletedAt: null,
            },
            select: { id: true },
        });

        if (expiredPrograms.length === 0) return;

        for (const p of expiredPrograms) {
            try {
                await this.prisma.$transaction(async (transaction) => {
                    const program = await transaction.program.update({
                        where: { id: p.id },
                        data: { status: ProgramStatus.COMPLETED },
                    });

                    await transaction.programStatusHistory.create({
                        data: {
                            programId: p.id,
                            fromStatus: ProgramStatus.PUBLISHED,
                            toStatus: ProgramStatus.COMPLETED,
                            reason: "Scheduler tự động hoàn thành",
                            actorId: null,
                        },
                    });

                    const registrations = await transaction.supportProgramRegistration.findMany({
                        where: { programId: p.id, status: SupportProgramRegistrationStatus.CONFIRMED },
                    });

                    if (registrations.length > 0) {
                        await transaction.supportProgramRegistration.updateMany({
                            where: { programId: p.id, status: SupportProgramRegistrationStatus.CONFIRMED },
                            data: { status: SupportProgramRegistrationStatus.NO_SHOW, version: { increment: 1 } },
                        });

                        await transaction.registrationStatusHistory.createMany({
                            data: registrations.map((reg) => ({
                                registrationId: reg.id,
                                fromStatus: SupportProgramRegistrationStatus.CONFIRMED,
                                toStatus: SupportProgramRegistrationStatus.NO_SHOW,
                                reason: "Scheduler tự động chuyển vắng mặt khi kết thúc",
                                actorId: null,
                            })),
                        });
                    }

                    await transaction.auditLog.create({
                        data: {
                            actorType: "SYSTEM",
                            action: "COMPLETE_PROGRAM",
                            entityType: "PROGRAM",
                            entityId: p.id,
                            after: { status: ProgramStatus.COMPLETED, noShows: registrations.length },
                            reason: "Scheduler auto-complete",
                            correlationId: randomUUID(),
                        },
                    });
                });
                this.logger.log(`Đã hoàn thành tự động chương trình ${p.id}`);
            } catch (error) {
                this.logger.error(`Lỗi khi hoàn thành chương trình ${p.id}`, error);
            }
        }
    }
}