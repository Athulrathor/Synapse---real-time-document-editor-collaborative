import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';

@Injectable()
export class ActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findGlobalActivity(userId: string, limit: number, cursor?: string) {
    const where: Prisma.ActivityWhereInput = {
      workspace: {
        members: {
          some: { userId },
        },
      },
    };

    if (cursor) {
      const cursorActivity = await this.prisma.activity.findFirst({
        where: {
          id: cursor,
          ...where,
        },
        select: { id: true },
      });

      if (!cursorActivity) {
        throw new AppException({
          code: 'INVALID_ACTIVITY_CURSOR',
          message: 'Activity cursor was not found or is not accessible.',
          status: HttpStatus.BAD_REQUEST,
        });
      }
    }

    const activities = await this.prisma.activity.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            avatar: {
                select: {
                    id: true,
                    name: true,
                    path: true
                }
            },
          },
        },
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor
        ? {
            skip: 1,
            cursor: { id: cursor },
          }
        : {}),
    });

    const hasMore = activities.length > limit;
    const items = hasMore ? activities.slice(0, limit) : activities;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
      hasMore,
    };
  }
}
