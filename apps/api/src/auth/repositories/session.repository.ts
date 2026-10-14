
import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service.js';
import { AuthRepository } from './auth.repository.js';

export interface RedisSession {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  deviceName?: string;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class SessionRepository {
  private readonly sessionPrefix = 'auth:session:';
  private readonly userSessionsPrefix = 'auth:user-sessions:';

  constructor(
    private readonly redisService: RedisService,
    private readonly authRepository: AuthRepository
  ) {}

  private sessionKey(sessionId: string): string {
    return `${this.sessionPrefix}${sessionId}`;
  }

  private userSessionsKey(userId: string): string {
    return `${this.userSessionsPrefix}${userId}`;
  }

  private deserializeSession(raw: string): RedisSession {
  const parsed = JSON.parse(raw) as Omit<
    RedisSession,
    'expiresAt' | 'revokedAt'
  > & {
    expiresAt: string | number | Date;
    revokedAt: string | number | Date | null;
  };

  const expiresAt = new Date(parsed.expiresAt);
  const revokedAt =
    parsed.revokedAt === null ? null : new Date(parsed.revokedAt);

  if (
    !Number.isFinite(expiresAt.getTime()) ||
    (revokedAt !== null && !Number.isFinite(revokedAt.getTime()))
  ) {
    throw new Error('Invalid session date in Redis.');
  }

  return {
    ...parsed,
    expiresAt,
    revokedAt,
  };
}

  async create(data: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    deviceName?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<void> {
    const ttlSeconds = Math.floor(
      (data.expiresAt.getTime() - Date.now()) / 1000,
    );

    if (ttlSeconds <= 0) {
      throw new Error('Cannot create an already-expired session.');
    }

    const session: RedisSession = {
      ...data,
      expiresAt: data.expiresAt,
      revokedAt: null,
    };

    const created = await this.redisService.setIfAbsentPersistent(
      this.sessionKey(data.id),
      JSON.stringify(session),
    );

    if (!created) {
      throw new Error('Session ID already exists.');
    }

    const indexKey = this.userSessionsKey(data.userId);
    const rawIndex = await this.redisService.get(indexKey);

    const sessionIds: string[] = rawIndex
      ? (JSON.parse(rawIndex) as string[])
      : [];

    if (!sessionIds.includes(data.id)) {
      sessionIds.push(data.id);
    }

    await this.redisService.set(indexKey, JSON.stringify(sessionIds));
  }

  async findByIdAndUserId(
    sessionId: string,
    userId: string,
  ): Promise<RedisSession | null> {
    const raw = await this.redisService.get(this.sessionKey(sessionId));

    if (!raw) return null;

    const session = this.deserializeSession(raw);

    if (
      session.id !== sessionId ||
      session.userId !== userId ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      return null;
    }

    return session;
  }

  async findActiveSession(
    sessionId: string,
    userId: string,
  ): Promise<{ id: string } | null> {
    const session = await this.findByIdAndUserId(sessionId, userId);

    return session ? { id: session.id } : null;
  }

  async rotateRefreshToken(
    sessionId: string,
    userId: string,
    currentTokenHash: string,
    newTokenHash: string,
    expiresAt: Date,
  ): Promise<{ count: number }> {
    const ttlSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

    if (ttlSeconds <= 0) return { count: 0 };

    const updated = await this.redisService.compareAndSetJsonField(
      this.sessionKey(sessionId),
      'refreshTokenHash',
      currentTokenHash,
      newTokenHash,
      ttlSeconds,
    );

    if (updated !== true) return { count: 0 };

    const raw = await this.redisService.get(this.sessionKey(sessionId));

    if (!raw) return { count: 0 };

    const session = this.deserializeSession(raw);

    if (
      session.userId !== userId ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      return { count: 0 };
    }

    return { count: 1 };
  }

  async revokeSessionForUser(
    sessionId: string,
    userId: string,
  ): Promise<boolean> {
    const session = await this.findByIdAndUserId(sessionId, userId);

    if (!session) return false;

    await this.redisService.delete(this.sessionKey(sessionId));

    const key = this.userSessionsKey(userId);
    const raw = await this.redisService.get(key);

    if (raw) {
      const ids = JSON.parse(raw) as string[];
      await this.redisService.set(
        key,
        JSON.stringify(ids.filter((id) => id !== sessionId)),
      );
    }

    return true;
  }

  // async incrementTokenVersion(userId: string): Promise<number> {
  //   const key = this.tokenVersionKey(userId);

  //   // Ensure the key exists before incrementing.
  //   await this.redisService.setIfAbsentPersistent(key, '0');

  //   return this.redisService.increment(key);
  // }

  async revokeSession(sessionId: string): Promise<void> {
    await this.redisService.delete(this.sessionKey(sessionId));
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const key = this.userSessionsKey(userId);
    const raw = await this.redisService.get(key);

    if (!raw) return;

    const sessionIds = JSON.parse(raw) as string[];

    await Promise.all(
      sessionIds.map((sessionId) =>
        this.redisService.delete(this.sessionKey(sessionId)),
      ),
    );

    await this.redisService.delete(key);
  }
}


