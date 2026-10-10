import { Injectable } from '@nestjs/common';
import { PrismaTransaction } from '../../database/prisma.types.js';
import { PrismaService } from '../../database/prisma.service.js';

import { VerificationDto } from '../dto/verification.dto.js';

@Injectable()
export class VerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: VerificationDto,
    tx: PrismaTransaction,
  ) {
    return tx.emailVerification.create({
      data: {
        userId: data.userId,
        tokenHash: data.token,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findByTokenHash(tokenHash: string) {
     const result = await this.prisma.emailVerification.findFirst({
      where: {
        tokenHash,
        verifiedAt: null,
      },
      include: {
        user: true,
      },
    });

    return result ?? null;
  }
}