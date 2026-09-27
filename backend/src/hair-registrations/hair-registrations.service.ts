import { randomBytes } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { HairRegistrationMode } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { CreateHairRegistrationDto } from "./dto/create-hair-registration.dto";

export interface HairRegistrationReceipt {
  readonly id: string;
  readonly status: "PENDING";
  readonly submittedAt: string;
}

@Injectable()
export class HairRegistrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateHairRegistrationDto,
  ): Promise<HairRegistrationReceipt> {
    const registration = await this.prisma.hairRegistration.create({
      data: {
        reference: this.createReference(),
        mode:
          dto.mode === "receive"
            ? HairRegistrationMode.RECEIVE
            : HairRegistrationMode.DONATE,
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email,
        province: dto.province,
        district: dto.district,
        address: dto.address,
        gender: dto.gender,
        relativePhone: dto.relativePhone,
        relativeName: dto.relativeName,
        duration: dto.duration,
        hospital: dto.hospital,
        diagnosis: dto.diagnosis,
        borrowDate: dto.borrowDate
          ? new Date(`${dto.borrowDate}T00:00:00.000Z`)
          : undefined,
        desiredLength: dto.desiredLength,
        transparency: dto.transparency,
        donationLocation: dto.donationLocation,
        donatedLength: dto.donatedLength,
        acceptedCommitments: dto.acceptedCommitments ?? [],
      },
      select: { reference: true, createdAt: true },
    });

    return {
      id: registration.reference,
      status: "PENDING",
      submittedAt: registration.createdAt.toISOString(),
    };
  }

  private createReference(): string {
    const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    const suffix = randomBytes(4).toString("hex").toUpperCase();
    return `TK-${date}-${suffix}`;
  }
}
