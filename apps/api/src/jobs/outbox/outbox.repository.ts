import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

export interface CreateOutboxEventInput {
  eventType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  availableAt?: Date;
}

@Injectable()
export class OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: CreateOutboxEventInput,
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
  ) {
    return tx.outboxEvent.create({
      data: {
        eventType: input.eventType,
        aggregateId: input.aggregateId,
        payload: input.payload as Prisma.InputJsonValue,
        availableAt: input.availableAt,
      },
    });
  }

  async findPending(limit = 100) {
    return this.prisma.outboxEvent.findMany({
      where: {
        status: 'PENDING',
        availableAt: { lte: new Date() },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async findFailed(limit = 50) {
    return this.prisma.outboxEvent.findMany({
      where: {
        status: 'FAILED',
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: Math.min(Math.max(limit, 1), 100),
      select: {
        id: true,
        eventType: true,
        aggregateId: true,
        status: true,
        attempts: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async claimPending(limit = 100) {
    return this.prisma.$transaction(async (tx) => {
      const events = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "OutboxEvent"
      WHERE status = 'PENDING'::"OutboxEventStatus"
        AND "availableAt" <= NOW()
      ORDER BY "createdAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    `;

      if (events.length === 0) {
        return [];
      }

      const ids = events.map((event) => event.id);

      await tx.outboxEvent.updateMany({
        where: {
          id: { in: ids },
          status: 'PENDING',
        },
        data: {
          status: 'PROCESSING',
          attempts: { increment: 1 },
        },
      });

      return tx.outboxEvent.findMany({
        where: {
          id: { in: ids },
          status: 'PROCESSING',
        },
        orderBy: { createdAt: 'asc' },
      });
    });
  }

  async markProcessed(id: string) {
    return await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
        lastError: null,
      },
    });
  }

  async markFailed(id: string, message: string) {
    return await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: 'PENDING',
        lastError: message.slice(0, 1000),
        availableAt: new Date(Date.now() + 30_000),
      },
    });
  }
}
