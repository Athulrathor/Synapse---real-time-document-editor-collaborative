import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { PrismaTransaction } from '../../database/prisma.types.js';
import { AuthDto } from '../dto/auth.dto.js';
import { RedisService } from '../../common/redis/redis.service.js';

@Injectable()
export class AuthRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

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

  async findUnique<T>(key: string): Promise<T | null> {
    const raw = await this.redisService.get(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      throw new Error(`Failed to parse JSON string at key: ${key}`);
    }
  }

  async updatePasswordHash(userId: string, passwordHash: string) {
    return this.prisma.userAuth.update({
      where: { userId },
      data: {
        passwordHash,
        failedLoginCount: 0,
        lockedUntil: null,
      },
      select: {
        userId: true,
      },
    });
  }

  async getTokenVersion(userId: string): Promise<number> {
  const userAuth = await this.prisma.userAuth.findUnique({
    where: { userId },
    select: { tokenVersion: true },
  });

  if (!userAuth) {
    throw new Error('User authentication record not found.');
  }

  return userAuth.tokenVersion;
}

async incrementTokenVersion(userId: string): Promise<number> {
  return this.prisma.$transaction(async (tx) => {
    const auth = await tx.userAuth.update({
      where: { userId },
      data: {
        tokenVersion: { increment: 1 },
      },
      select: {
        tokenVersion: true,
      },
    });

    return auth.tokenVersion;
  });
}

  async resetPasswordAndIncrementTokenVersion(
    userId: string,
    passwordHash: string,
  ) {
    return this.prisma.userAuth.update({
      where: { userId },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
        failedLoginCount: 0,
        lockedUntil: null,
      },
      select: {
        userId: true,
        tokenVersion: true,
      },
    });
  }
}
