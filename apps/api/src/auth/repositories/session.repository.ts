import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service.js';
import { PrismaTransaction } from '../../database/prisma.types.js';

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: {
      id?: string;
      userId: string;
      refreshTokenHash: string;
      expiresAt: Date;
      deviceName?: string;
      userAgent?: string;
      ipAddress?: string;
    },
    tx: PrismaTransaction,
  ) {
    return tx.userSession.create({
      data,
    });
  }

  // async createSession(data: {
  //   id?: string;
  //   userId: string;
  //   deviceName?: string;
  //   userAgent?: string;
  //   ipAddress?: string;
  //   expiresAt: Date;
  // }) {
  //   return this.prisma.userSession.create({
  //     data: {
  //       ...data,
  //       refreshTokenHash: '',
  //     },
  //   });
  // }

  async updateRefreshToken(
    sessionId: string,
    refreshTokenHash: string,
    expiresAt: Date,
  ) {
    return await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { refreshTokenHash, expiresAt },
    });
  }

  async revokeSession(sessionId: string) {
    return await this.prisma.userSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserSessions(userId: string) {
    return await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserSessionsInTransaction(
    userId: string,
    tx: PrismaTransaction,
  ) {
    return tx.userSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async findByIdAndUserId(sessionId: string, userId: string) {
    return await this.prisma.userSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      include: {
        user: {
          include: {
            auth: true,
          },
        },
      },
    });
  }

  async rotateRefreshToken(
    sessionId: string,
    userId: string,
    currentTokenHash: string,
    newTokenHash: string,
    expiresAt: Date,
  ) {
    return this.prisma.userSession.updateMany({
      where: {
        id: sessionId,
        userId,
        refreshTokenHash: currentTokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        refreshTokenHash: newTokenHash,
        expiresAt,
      },
    });
  }

  async revokeSessionForUser(sessionId: string, userId: string) {
    const result = await this.prisma.userSession.updateMany({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return result.count === 1;
  }

  async findActiveSession(sessionId: string, userId: string) {
    return this.prisma.userSession.findFirst({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
      },
    });
  }

  async incrementTokenVersion(userId: string) {
    return this.prisma.userAuth.update({
      where: { userId },
      data: {
        tokenVersion: { increment: 1 },
      },
      select: {
        tokenVersion: true,
      },
    });
  }
}
