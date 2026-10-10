import { Injectable } from '@nestjs/common';
import {
  HealthCheckService,
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { PrismaService } from '../database/prisma.service.js';
import {Redis} from 'ioredis';

@Injectable()
export class HealthService {
    private readonly redis: Redis;
    constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
    private readonly prismaIndicator: HealthIndicatorService,
  ) {
    this.redis = new Redis(process.env.REDIS_URL!);
  }

  async check() {
    return this.health.check([
      () => this.checkDatabase(),
      () => this.checkRedis(),
    ]);
  }

  private async checkDatabase() {
  const indicator = this.prismaIndicator.check('database');

  try {
    await this.prisma.$queryRaw`SELECT 1`;

    return indicator.up();
  } catch (error) {
    console.error('DATABASE HEALTH CHECK FAILED:', error);
    return indicator.down();
  }
}

 private async checkRedis() {
    const indicator = this.prismaIndicator.check('redis');

    try {
      await this.redis.ping();
      return indicator.up();
    } catch {
      return indicator.down();
    }
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
