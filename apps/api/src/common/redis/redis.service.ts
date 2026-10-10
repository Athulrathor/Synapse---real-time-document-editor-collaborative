import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly redis: Redis;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.redis = new Redis(
      this.configService.getOrThrow<string>('redis.url'),
    );

    this.redis.on('error', (err: Error) => {
      console.error('Redis connection error:', err);
    });
  }

  async onModuleInit(): Promise<void> {
    await this.redis.ping();
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  async set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<void> {
    if (ttlSeconds) {
      await this.redis.set(
        key,
        value,
        'EX',
        ttlSeconds,
      );
      return;
    }

    await this.redis.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }

  async increment(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  async expire(
    key: string,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.expire(key, ttlSeconds);
  }

  async getTtl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }
}