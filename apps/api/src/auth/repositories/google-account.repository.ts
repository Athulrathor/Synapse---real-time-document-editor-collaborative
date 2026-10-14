import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class GoogleAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByGoogleId(googleId: string) {
    return await this.prisma.googleAccount.findUnique({
      where: { googleId },
      include: { user: true },
    });
  }

  async findByUserId(userId: string) {
    return await this.prisma.googleAccount.findUnique({
      where: { userId },
    });
  }

  async create(data: {
    userId: string;
    googleId: string;
    email: string;
    emailVerified: boolean;
  }) {
    return await this.prisma.googleAccount.create({
      data,
    });
  }
}
