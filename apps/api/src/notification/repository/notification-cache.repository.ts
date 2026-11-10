import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service.js';

@Injectable()
export class NotificationCacheRepository {
  private readonly CACHE_TTL = 60;

  constructor(private readonly redis: RedisService) {}

  private getUnreadCountKey(recipientId: string): string {
    return `notifications:${recipientId}:unread-count`;
  }

  private getNotificationListKey(recipientId: string): string {
    return `notifications:${recipientId}:list`;
  }

  async getUnreadCount(recipientId: string): Promise<number | null> {
    const key = this.getUnreadCountKey(recipientId);

    const cached = await this.redis.getCache<number>(key);

    return cached ?? null;
  }

  async setUnreadCount(recipientId: string, count: number): Promise<void> {
    const key = this.getUnreadCountKey(recipientId);

    await this.redis.setCache(key, count, this.CACHE_TTL);
  }

  async invalidateUnreadCount(recipientId: string): Promise<void> {
    await this.redis.deleteCache(this.getUnreadCountKey(recipientId));
  }

  async getNotificationList<T>(recipientId: string): Promise<T | null> {
    const key = this.getNotificationListKey(recipientId);

    const cached = await this.redis.getCache<T>(key);

    return cached ?? null;
  }

  async setNotificationList<T>(
    recipientId: string,
    notifications: T,
  ): Promise<void> {
    const key = this.getNotificationListKey(recipientId);

    await this.redis.setCache(key, notifications, this.CACHE_TTL);
  }

  async invalidateNotificationList(recipientId: string): Promise<void> {
    await this.redis.deleteCache(this.getNotificationListKey(recipientId));
  }

  async invalidateRecipientCache(recipientId: string): Promise<void> {
    await Promise.all([
      this.invalidateUnreadCount(recipientId),
      this.invalidateNotificationList(recipientId),
    ]);
  }
}
