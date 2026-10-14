import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly redis: Redis;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis(this.configService.getOrThrow<string>('redis.url'));

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

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.set(key, value, 'EX', ttlSeconds);
      return;
    }

    await this.redis.set(key, value);
  }

  async setIfAbsentPersistent(key: string, value: string): Promise<boolean> {
    const result = await this.redis.set(key, value, 'NX');
    return result === 'OK';
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

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.redis.expire(key, ttlSeconds);
  }

  async getTtl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  async compareAndSetJsonField(
    key: string,
    field: string,
    expectedValue: string,
    newValue: string,
    ttlSeconds: number,
    validation?: {
      userId: string;
      sessionId: string;
      now: number;
    },
  ): Promise<boolean> {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error('TTL must be a positive integer.');
    }

    const script = `
    local raw = redis.call('GET', KEYS[1])

    if not raw then
      return 0
    end

    local ok, data = pcall(cjson.decode, raw)

    if not ok or type(data) ~= 'table' then
      return -1
    end

    if ARGV[5] == '1' then
      if data.userId ~= ARGV[6] then
        return 0
      end

      if data.id ~= ARGV[7] then
        return 0
      end

      if data.revokedAt ~= cjson.null then
        return 0
      end

      local expiresAt = data.expiresAt

      if type(expiresAt) ~= 'string' and type(expiresAt) ~= 'number' then
        return -1
      end

      if type(expiresAt) == 'string' then
        -- Session timestamps are stored as ISO strings.
        -- Convert the ISO timestamp to milliseconds for comparison.
        local year, month, day, hour, minute, second, millis =
          string.match(
            expiresAt,
            '^(%d%d%d%d)%-(%d%d)%-(%d%d)T(%d%d):(%d%d):(%d%d)%.?(%d*)'
          )

        if not year then
          return -1
        end

        local timestamp = os.time({
          year = tonumber(year),
          month = tonumber(month),
          day = tonumber(day),
          hour = tonumber(hour),
          min = tonumber(minute),
          sec = tonumber(second)
        }) * 1000 + tonumber(string.sub((millis or '') .. '000', 1, 3))

        if timestamp <= tonumber(ARGV[8]) then
          return 0
        end
      else
        if tonumber(expiresAt) <= tonumber(ARGV[8]) then
          return 0
        end
      end
    end

    if data[ARGV[1]] ~= ARGV[2] then
      return 0
    end

    data[ARGV[1]] = ARGV[3]

    redis.call('SET', KEYS[1], cjson.encode(data), 'EX', ARGV[4])

    return 1
  `;

    const result = await this.redis.eval(
      script,
      1,
      key,
      field,
      expectedValue,
      newValue,
      String(ttlSeconds),
      validation ? '1' : '0',
      validation?.userId ?? '',
      validation?.sessionId ?? '',
      String(validation?.now ?? Date.now()),
    );

    if (result === -1) {
      throw new Error(`Invalid session data stored at key: ${key}`);
    }

    return result === 1;
  }

  async getAndDelete(key: string): Promise<string | null> {
    const result = await this.redis.eval(
      `local value = redis.call('GET', KEYS[1])
       if value then redis.call('DEL', KEYS[1]) end
       return value`,
      1,
      key,
    );

    return typeof result === 'string' ? result : null;
  }

  async incrementWithExpiry(key: string, ttlSeconds: number): Promise<number> {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error('TTL must be a positive integer.');
    }

    const script = `
local count = redis.call('INCR', KEYS[1])

if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end

return count


`;

    const result = await this.redis.eval(script, 1, key, String(ttlSeconds));

    return Number(result);
  }

  async verifyAndConsumeOtp(
    key: string,
    expectedUserId: string,
    submittedOtpHash: string,
  ): Promise<'VERIFIED' | 'INVALID' | 'EXPIRED' | 'LOCKED'> {
    const script = `
    local raw = redis.call('GET', KEYS[1])

    if not raw then
      return 'EXPIRED'
    end

    local ok, challenge = pcall(cjson.decode, raw)

    if not ok or type(challenge) ~= 'table' then
      redis.call('DEL', KEYS[1])
      return 'INVALID'
    end

    if challenge.userId ~= ARGV[1] then
      return 'INVALID'
    end

    if tonumber(challenge.attempts) >= tonumber(challenge.maxAttempts) then
      redis.call('DEL', KEYS[1])
      return 'LOCKED'
    end

    if challenge.otpHash ~= ARGV[2] then
      challenge.attempts = tonumber(challenge.attempts) + 1

      if challenge.attempts >= tonumber(challenge.maxAttempts) then
        redis.call('DEL', KEYS[1])
        return 'LOCKED'
      end

      redis.call(
        'SET',
        KEYS[1],
        cjson.encode(challenge),
        'KEEPTTL'
      )

      return 'INVALID'
    end

    redis.call('DEL', KEYS[1])

    return 'VERIFIED'
  `;

    const result = await this.redis.eval(
      script,
      1,
      key,
      expectedUserId,
      submittedOtpHash,
    );

    if (
      result !== 'VERIFIED' &&
      result !== 'INVALID' &&
      result !== 'EXPIRED' &&
      result !== 'LOCKED'
    ) {
      throw new Error('Unexpected Redis OTP verification result.');
    }

    return result;
  }

  async createOtpChallenge(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error('TTL must be a positive integer.');
    }

    const result = await this.redis.set(key, value, 'EX', ttlSeconds, 'NX');

    return result === 'OK';
  }

  async setOtpCooldown(key: string, ttlSeconds: number): Promise<boolean> {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error('TTL must be a positive integer.');
    }

    const result = await this.redis.set(key, '1', 'EX', ttlSeconds, 'NX');

    return result === 'OK';
  }

  async createEmailVerification(
    tokenHash: string,
    userId: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error('TTL must be a positive integer.');
    }

    const key = `auth:email-verification:${tokenHash}`;
    const value = JSON.stringify({
      userId,
      createdAt: Date.now(),
    });

    const result = await this.redis.set(key, value, 'EX', ttlSeconds, 'NX');

    return result === 'OK';
  }

  async consumeEmailVerification(
    tokenHash: string,
  ): Promise<{ userId: string } | null> {
    const key = `auth:email-verification:${tokenHash}`;

    const raw = await this.redis.eval(
      `
      local value = redis.call('GET', KEYS[1])

      if not value then
        return nil
      end

      redis.call('DEL', KEYS[1])
      return value
    `,
      1,
      key,
    );

    if (typeof raw !== 'string') {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(raw);

      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !('userId' in parsed) ||
        typeof parsed.userId !== 'string'
      ) {
        return null;
      }

      return { userId: parsed.userId };
    } catch {
      return null;
    }
  }

  async deleteEmailVerification(tokenHash: string): Promise<void> {
    await this.delete(`auth:email-verification:${tokenHash}`);
  }
}
