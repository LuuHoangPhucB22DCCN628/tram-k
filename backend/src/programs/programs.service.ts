import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PartnerStatus, ProgramStatus, RoleName, UserStatus } from "@prisma/client";
import { randomUUID } from "crypto";
import { AuthenticatedUser } from "../auth/auth-user.interface";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProgramDto } from "./dto/create-program.dto";
import { ReviewDecision, ReviewProgramDto } from "./dto/review-program.dto";

@Injectable()
export class ProgramsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(actor: AuthenticatedUser, dto: CreateProgramDto) {
        const user = await this.activePartner(actor);
        this.validateTimeline(dto);

        return this.prisma.$transaction(async (transaction) => {
            const program = await transaction.program.create({
                data: {
                    ownerPartnerId: user.partnerMembership!.id,
                    title: dto.title,
                    description: dto.description,
                    address: dto.address,
                    latitude: dto.latitude,
                    longitude: dto.longitude,
                    conditions: dto.conditions,
                    registrationOpenAt: new Date(dto.registrationOpenAt),
                    registrationCloseAt: new Date(dto.registrationCloseAt),
                    startAt: new Date(dto.startAt),
                    endAt: new Date(dto.endAt),
                    capacity: dto.capacity,
                    status: ProgramStatus.DRAFT,
                },
            });

            await transaction.programStatusHistory.create({
                data: {
                    programId: program.id,
                    toStatus: ProgramStatus.DRAFT,
                    reason: "Tạo mới",
                    actorId: actor.id,
                },
            });

            return program;
        });
    }

    async submit(actor: AuthenticatedUser, programId: string) {
        const user = await this.activePartner(actor);
        const program = await this.prisma.program.findUnique({ where: { id: programId } });

        if (!program) throw new NotFoundException("Không tìm thấy chương trình.");
        if (program.ownerPartnerId !== user.partnerMembership!.id) throw new ForbiddenException("Không có quyền.");
        if (program.status !== ProgramStatus.DRAFT && program.status !== ProgramStatus.REJECTED) {
            throw new BadRequestException("Chỉ được gửi duyệt từ DRAFT hoặc REJECTED.");
        }

        return this.prisma.$transaction(async (transaction) => {
            // Chống Race Condition bằng updateMany
            const claim = await transaction.program.updateMany({
                where: { id: programId, status: program.status },
                data: { status: ProgramStatus.PENDING, version: { increment: 1 } },
            });

            if (claim.count === 0) {
                throw new BadRequestException("Trạng thái đã thay đổi bởi giao dịch khác. Vui lòng tải lại trang.");
            }

            const updated = await transaction.program.findUnique({ where: { id: programId } });

            await transaction.programStatusHistory.create({
                data: { programId, fromStatus: program.status, toStatus: ProgramStatus.PENDING, reason: "Gửi duyệt", actorId: actor.id },
            });

            await transaction.auditLog.create({
                data: { actorType: "USER", actorId: actor.id, action: "SUBMIT_PROGRAM", entityType: "PROGRAM", entityId: programId, before: { status: program.status }, after: { status: ProgramStatus.PENDING }, correlationId: randomUUID() },
            });

            await transaction.outboxEvent.create({
                data: {
                    eventId: randomUUID(),
                    type: "PROGRAM_SUBMITTED",
                    aggregateType: "Program",
                    aggregateId: programId,
                    payload: {
                        programTitle: program.title,
                        ownerPartnerId: program.ownerPartnerId,
                    },
                },
            });

            return updated;
        });
    }

    async review(actor: AuthenticatedUser, programId: string, dto: ReviewProgramDto) {
        const admin = await this.prisma.user.findUnique({ where: { id: actor.id }, include: { role: true } });
        if (!admin || admin.role.name !== RoleName.ADMIN) throw new ForbiddenException("Chỉ Admin được duyệt.");

        const program = await this.prisma.program.findUnique({ where: { id: programId } });
        if (!program) throw new NotFoundException("Không tìm thấy chương trình.");
        if (program.status !== ProgramStatus.PENDING) throw new BadRequestException("Chương trình không ở trạng thái chờ duyệt.");

        const isApproved = dto.decision === ReviewDecision.APPROVE;
        if (!isApproved && (!dto.reason || dto.reason.length < 10)) {
            throw new BadRequestException("Lý do từ chối phải từ 10 ký tự.");
        }

        return this.prisma.$transaction(async (transaction) => {
            const claim = await transaction.program.updateMany({
                where: { id: programId, status: ProgramStatus.PENDING },
                data: {
                    status: isApproved ? ProgramStatus.PUBLISHED : ProgramStatus.REJECTED,
                    publishedAt: isApproved ? new Date() : null,
                    version: { increment: 1 },
                },
            });

            if (claim.count === 0) {
                throw new BadRequestException("Trạng thái đã thay đổi bởi giao dịch khác. Vui lòng tải lại trang.");
            }

            const updated = await transaction.program.findUnique({ where: { id: programId } });

            await transaction.programStatusHistory.create({
                data: {
                    programId,
                    fromStatus: ProgramStatus.PENDING,
                    toStatus: updated!.status,
                    reason: isApproved ? "Phê duyệt" : dto.reason!,
                    actorId: actor.id,
                },
            });

            await transaction.auditLog.create({
                data: {
                    actorType: "USER", actorId: actor.id, action: isApproved ? "APPROVE_PROGRAM" : "REJECT_PROGRAM",
                    entityType: "PROGRAM", entityId: programId, before: { status: program.status }, after: { status: updated!.status },
                    reason: dto.reason, correlationId: randomUUID(),
                },
            });

            await transaction.outboxEvent.create({
                data: {
                    eventId: randomUUID(),
                    type: isApproved ? "PROGRAM_PUBLISHED" : "PROGRAM_REJECTED",
                    aggregateType: "Program",
                    aggregateId: programId,
                    payload: {
                        recipientId: program.ownerPartnerId,
                        programTitle: program.title,
                        status: updated!.status,
                        reason: dto.reason,
                    },
                },
            });

            return updated;
        });
    }

    private validateTimeline(dto: CreateProgramDto) {
        const regOpen = new Date(dto.registrationOpenAt).getTime();
        const regClose = new Date(dto.registrationCloseAt).getTime();
        const start = new Date(dto.startAt).getTime();
        const end = new Date(dto.endAt).getTime();

        if (!(regOpen < regClose && regClose <= start && start < end)) {
            throw new BadRequestException("Thời gian không hợp lệ. Cần: Mở ĐK < Đóng ĐK <= Bắt đầu < Kết thúc.");
        }
    }

    private async activePartner(actor: AuthenticatedUser) {
        const user = await this.prisma.user.findUnique({
            where: { id: actor.id },
            include: { role: true, partnerMembership: true },
        });
        if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
            throw new ForbiddenException("Tài khoản không hoạt động.");
        }
        if (!user.partnerMembership || user.partnerMembership.status !== PartnerStatus.ACTIVE) {
            throw new ForbiddenException("Chỉ Đối tác ACTIVE mới được tạo chương trình.");
        }
        return user;
    }
}