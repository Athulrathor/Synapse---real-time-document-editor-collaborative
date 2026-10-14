import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service.js';

@Injectable()
export class PasswordResetRepository {
  private readonly prefix = 'auth:password-reset:';
  private readonly authPrefix = 'auth:password-reset-authorization:';
  private readonly attemptsPrefix = 'auth:password-reset-attempts:';

  constructor(private readonly redisService: RedisService) {}

  private key(tokenHash: string): string {
    return `${this.prefix}${tokenHash}`;
  }

  private attemptsKey(tokenHash: string): string {
    return `${this.attemptsPrefix}${tokenHash}`;
  }

  private PassWordResetAuth(tokenHash: string): string {
    return `${this.authPrefix}${tokenHash}`;
  }

  async save(
    tokenHash: string,
    userId: string,
    ttlSeconds = 900,
  ): Promise<void> {
    await this.redisService.set(this.key(tokenHash), userId, ttlSeconds);
  }

  async saveResetToken(
    tokenHash: string,
    userId: string,
    ttlSeconds = 900,
  ): Promise<void> {
    await this.redisService.set(
      this.PassWordResetAuth(tokenHash),
      userId,
      ttlSeconds,
    );
  }

  async findUserId(tokenHash: string): Promise<string | null> {
    return this.redisService.get(this.key(tokenHash));
  }

  async findUserIdResetToken(tokenHash: string): Promise<string | null> {
    return this.redisService.get(this.PassWordResetAuth(tokenHash));
  }

  async consume(tokenHash: string): Promise<string | null> {
    // Must be implemented atomically in Redis (GET + DEL in Lua).
    return this.redisService.getAndDelete(this.key(tokenHash));
  }

  async incrementFailedAttempts(
    tokenHash: string,
    ttlSeconds = 300,
  ): Promise<number> {
    return this.redisService.incrementWithExpiry(
      this.attemptsKey(tokenHash),
      ttlSeconds,
    );
  }

  async getFailedAttempts(tokenHash: string): Promise<number> {
    const attempts = await this.redisService.get(this.attemptsKey(tokenHash));
    return Number(attempts);
  }

  async clearFailedAttempts(tokenHash: string): Promise<void> {
    await this.redisService.delete(this.attemptsKey(tokenHash));
  }
}
