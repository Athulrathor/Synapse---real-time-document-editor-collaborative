import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly redis: Redis;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis(this.configService.getOrThrow<string>('redis.url'), {
      maxRetriesPerRequest: null, // 👈 Fixes the MaxRetriesPerRequestError crash
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay; // Keeps reconnecting seamlessly during network drops
      },
    });

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
    await this.redis.expire(key, ttlSeconds + 60);
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

  -- Validate session when validation arguments are provided.
  if ARGV[5] == '1' then
    -- Verify user ID.
    if data.userId ~= ARGV[6] then
      return 0
    end

    -- Verify session ID.
    if data.id ~= ARGV[7] then
      return 0
    end

    -- Reject revoked sessions.
    if data.revokedAt ~= cjson.null then
      return 0
    end

    -- Validate expiration field.
    local expiresAt = data.expiresAt

    if type(expiresAt) ~= 'string' and type(expiresAt) ~= 'number' then
      return -1
    end

    local expiryMs = nil

    if type(expiresAt) == 'string' then
      -- Accept UTC ISO-8601 timestamps, with optional milliseconds.
      local year, month, day, hour, minute, second, millis, zone =
        string.match(
          expiresAt,
          '^(%d%d%d%d)%-(%d%d)%-(%d%d)T(%d%d):(%d%d):(%d%d)%.?(%d*)(.*)$'
        )

      if not year then
        return -1
      end

      -- Only accept UTC timestamps or timestamps without a suffix.
      if zone ~= 'Z' and zone ~= '' then
        return -1
      end

      local y = tonumber(year)
      local m = tonumber(month)
      local d = tonumber(day)
      local h = tonumber(hour)
      local min = tonumber(minute)
      local sec = tonumber(second)

      -- Basic range validation.
      if m < 1 or m > 12 or d < 1 or d > 31 then
        return -1
      end

      if h < 0 or h > 23 or min < 0 or min > 59 or sec < 0 or sec > 59 then
        return -1
      end

      -- Convert calendar date to days since Unix epoch.
      -- This avoids os.time(), which is unavailable in Redis Lua.
      if m <= 2 then
        y = y - 1
      end

      local era = math.floor(y / 400)
      local yoe = y - era * 400
      local adjustedMonth = m + (m > 2 and -3 or 9)
      local doy = math.floor((153 * adjustedMonth + 2) / 5) + d - 1

      local doe =
        yoe * 365
        + math.floor(yoe / 4)
        - math.floor(yoe / 100)
        + doy

      local days = era * 146097 + doe - 719468

      local milliseconds =
        tonumber(string.sub((millis or '') .. '000', 1, 3))

      expiryMs =
        (
          days * 86400
          + h * 3600
          + min * 60
          + sec
        ) * 1000
        + milliseconds
    else
      -- Numeric timestamps are expected to be Unix milliseconds.
      expiryMs = tonumber(expiresAt)
    end

    -- Reject invalid or expired sessions.
    if not expiryMs or expiryMs <= tonumber(ARGV[8]) then
      return 0
    end
  end

  -- Compare the stored refresh-token hash.
  if data[ARGV[1]] ~= ARGV[2] then
    return 0
  end

  -- Rotate the refresh-token hash.
  data[ARGV[1]] = ARGV[3]

  -- Save the updated session and reset its TTL atomically.
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

  async getCache<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);

    if (value === null) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      // Remove corrupted JSON so it doesn't cause repeated failures.
      await this.redis.del(key);
      return null;
    }
  }

  async setCache<T>(key: string, value: T, ttlSeconds = 60): Promise<void> {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error('TTL must be a positive integer.');
    }

    let serializedValue: string | undefined;

    try {
      serializedValue = JSON.stringify(value);
    } catch {
      throw new Error('Cache value could not be serialized to JSON.');
    }

    if (serializedValue === undefined) {
      throw new Error('Cache value could not be serialized to JSON.');
    }

    await this.redis.set(key, serializedValue, 'EX', ttlSeconds);
  }

  async deleteCache(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async remember<T>(
    key: string,
    ttlSeconds: number,
    fetchData: () => Promise<T>,
    trackingKey?: string,
  ): Promise<T> {
    const cachedValue = await this.getCache<T>(key);

    if (cachedValue !== null) {
      return cachedValue;
    }

    const freshValue = await fetchData();

    if (freshValue !== null && freshValue !== undefined) {
      if (trackingKey) {
        await this.trackCacheKey(trackingKey, key, ttlSeconds);
      }

      await this.setCache(key, freshValue, ttlSeconds);
    }

    return freshValue;
  }

  async trackCacheKey(
    trackingKey: string,
    cacheKey: string,
    ttlSeconds = 60,
  ): Promise<void> {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error('TTL must be a positive integer.');
    }

    await this.redis.sadd(trackingKey, cacheKey);
    await this.redis.expire(trackingKey, ttlSeconds + 60);
  }

  async invalidateTrackedCache(trackingKey: string): Promise<void> {
    const cacheKeys = await this.redis.smembers(trackingKey);

    const pipeline = this.redis.pipeline();

    for (const cacheKey of cacheKeys) {
      pipeline.del(cacheKey);
    }

    pipeline.del(trackingKey);

    await pipeline.exec();
  }

  async updateJsonAtomically<T>(
    key: string,
    script: string,
    args: string[],
  ): Promise<T | null> {
    const result = await this.redis.eval(script, 1, key, ...args);

    if (result === null || result === undefined) {
      return null;
    }

    if (typeof result === 'string') {
      try {
        return JSON.parse(result) as T;
      } catch {
        throw new Error('Redis returned invalid JSON.');
      }
    }

    throw new Error('Redis script returned an unexpected result.');
  }

  // async incrementCacheVersion(key: string): Promise<number> {
  //   return this.redis.incr(key);
  // }

  async createGoogleOAuthState(
    state: string,
    ttlSeconds = 300,
  ): Promise<boolean> {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error('TTL must be a positive integer.');
    }

    const result = await this.redis.set(
      `auth:google-oauth-state:${state}`,
      '1',
      'EX',
      ttlSeconds,
      'NX',
    );

    return result === 'OK';
  }

  async consumeGoogleOAuthState(state: string): Promise<boolean> {
    const result = await this.redis.eval(
      `
      local value = redis.call('GET', KEYS[1])

      if not value then
        return 0
      end

      redis.call('DEL', KEYS[1])
      return 1
    `,
      1,
      `auth:google-oauth-state:${state}`,
    );

    return result === 1;
  }
}
