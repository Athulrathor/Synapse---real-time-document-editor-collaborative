import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import {
  NotificationResourceType,
  NotificationType,
  Prisma,
} from '@prisma/client';

export interface CreateNotificationData {
  recipientId: string;
  actorId?: string;
  type: NotificationType;
  title: string;
  message: string;
  resourceType?: NotificationResourceType;
  resourceId?: string;
  dedupeKey?: string;
}

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateNotificationData) {
    if (data.dedupeKey) {
      return await this.prisma.notification.upsert({
        where: {
          dedupeKey: data.dedupeKey,
        },
        update: {},
        create: {
          recipientId: data.recipientId,
          actorId: data.actorId,
          type: data.type,
          title: data.title,
          message: data.message,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          dedupeKey: data.dedupeKey,
        },
      });
    }

    return await this.prisma.notification.create({
      data: {
        recipientId: data.recipientId,
        actorId: data.actorId,
        type: data.type,
        title: data.title,
        message: data.message,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.notification.findUnique({
      where: { id },
    });
  }

  async findByRecipient(
    recipientId: string,
    options: {
      skip: number;
      take: number;
      unreadOnly?: boolean;
    },
  ) {
    const where: Prisma.NotificationWhereInput = {
      recipientId,
      ...(options.unreadOnly ? { isRead: false } : {}),
    };

    return this.prisma.notification.findMany({
      where,
      skip: options.skip,
      take: options.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async countByRecipient(
    recipientId: string,
    unreadOnly = false,
  ): Promise<number> {
    return this.prisma.notification.count({
      where: {
        recipientId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
    });
  }

  async markAsRead(id: string, recipientId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id,
        recipientId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(recipientId: string) {
    return this.prisma.notification.updateMany({
      where: {
        recipientId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async deleteById(id: string, recipientId: string) {
    return this.prisma.notification.deleteMany({
      where: {
        id,
        recipientId,
      },
    });
  }

  async resolveWorkspaceInvitation(
    tx: Prisma.TransactionClient,
    invitationId: string,
    recipientId: string,
  ) {
    return tx.notification.updateMany({
      where: {
        recipientId,
        resourceType: NotificationResourceType.WORKSPACE,
        resourceId: invitationId,
        resolvedAt: null,
      },
      data: {
        resolvedAt: new Date(),
      },
    });
  }
}
