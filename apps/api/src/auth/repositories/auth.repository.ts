
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { PrismaTransaction } from '../../database/prisma.types.js';
import { AuthDto } from '../dto/auth.dto.js';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: AuthDto, tx: PrismaTransaction) {
    return tx.userAuth.create({
      data: {
        userId: dto.userId,
        passwordHash: dto.passwordHash,
      },
    });
  }

  async recordFailedLogin(
    userId: string,
    maxAttempts = 5,
    lockDurationMs = 15 * 60 * 1000,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const auth = await tx.userAuth.update({
        where: { userId },
        data: {
          failedLoginCount: { increment: 1 },
        },
        select: {
          failedLoginCount: true,
          lockedUntil: true,
        },
      });

      if (auth.failedLoginCount >= maxAttempts) {
        return tx.userAuth.update({
          where: { userId },
          data: {
            lockedUntil: new Date(Date.now() + lockDurationMs),
          },
          select: {
            failedLoginCount: true,
            lockedUntil: true,
          },
        });
      }

      return auth;
    });
  }

  async resetFailedLogins(userId: string) {
    return this.prisma.userAuth.update({
      where: { userId },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
  }
}