import { Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto.js';
import { PrismaService } from '../database/prisma.service.js';
import { NotificationCacheRepository } from './repository/notification-cache.repository.js';
import { NotificationRepository } from './repository/notification.repository.js';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationCacheRepository: NotificationCacheRepository,
  ) {}

  async create(createNotificationDto: CreateNotificationDto) {
    const notification = await this.notificationRepository.create({
      recipientId: createNotificationDto.recipientId,
      actorId: createNotificationDto.actorId,
      type: createNotificationDto.type,
      title: createNotificationDto.title,
      message: createNotificationDto.message,
      dedupeKey: createNotificationDto.dedupeKey,
      resourceType: createNotificationDto.resourceType,
      resourceId: createNotificationDto.resourceId,
    });

    await this.notificationCacheRepository.invalidateRecipientCache(
      createNotificationDto.recipientId,
    );

    return notification;
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    const cachedCount =
      await this.notificationCacheRepository.getUnreadCount(recipientId);

    if (cachedCount !== null) {
      return cachedCount;
    }

    const count = await this.notificationRepository.countByRecipient(
      recipientId,
      true,
    );

    await this.notificationCacheRepository.setUnreadCount(recipientId, count);

    return count;
  }

  async getNotifications(
    recipientId: string,
    page = 1,
    limit = 20,
    unreadOnly = false,
  ) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));

    const [notifications, total] = await Promise.all([
      this.notificationRepository.findByRecipient(recipientId, {
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        unreadOnly,
      }),
      this.notificationRepository.countByRecipient(recipientId, unreadOnly),
    ]);

    return {
      data: notifications,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async markAsRead(
    notificationId: string,
    recipientId: string,
  ): Promise<boolean> {
    const result = await this.notificationRepository.markAsRead(
      notificationId,
      recipientId,
    );

    if (result.count > 0) {
      await this.notificationCacheRepository.invalidateRecipientCache(
        recipientId,
      );
    }

    return result.count > 0;
  }

  async markAllAsRead(recipientId: string): Promise<number> {
    const result = await this.notificationRepository.markAllAsRead(recipientId);

    if (result.count > 0) {
      await this.notificationCacheRepository.invalidateRecipientCache(
        recipientId,
      );
    }

    return result.count;
  }

  async deleteNotification(
    notificationId: string,
    recipientId: string,
  ): Promise<boolean> {
    const result = await this.notificationRepository.deleteById(
      notificationId,
      recipientId,
    );

    if (result.count > 0) {
      await this.notificationCacheRepository.invalidateRecipientCache(
        recipientId,
      );
    }

    return result.count > 0;
  }
}
