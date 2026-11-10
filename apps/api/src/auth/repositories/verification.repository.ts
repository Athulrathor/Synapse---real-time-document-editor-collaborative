import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaTransaction } from '../../database/prisma.types.js';
import { PrismaService } from '../../database/prisma.service.js';

import { VerificationDto } from '../dto/verification.dto.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';

@Injectable()
export class VerificationRepository {
  constructor(private readonly redisService: RedisService) {}

  async createVerification(
    tokenHash: string,
    userId: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    return await this.redisService.createEmailVerification(
      tokenHash,
      userId,
      ttlSeconds,
    );
  }

  async consumeRedisVerification(
    tokenHash: string,
  ): Promise<{ userId: string } | null> {
    return await this.redisService.consumeEmailVerification(tokenHash);
  }

  async deleteRedisVerification(tokenHash: string): Promise<void> {
    await this.redisService.deleteEmailVerification(tokenHash);
  }

  async createGoogleOAuthState(
    state: string,
    ttlSeconds = 300,
  ): Promise<boolean> {
    return this.redisService.createGoogleOAuthState(state, ttlSeconds);
  }

  async consumeGoogleOAuthState(state: string): Promise<boolean> {
    return this.redisService.consumeGoogleOAuthState(state);
  }
}
