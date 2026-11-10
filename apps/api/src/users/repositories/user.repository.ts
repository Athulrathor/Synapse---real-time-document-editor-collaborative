import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { PrismaTransaction } from '../../database/prisma.types.js';
import { CreateUserDto } from '../dto/create-user.dto.js';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    const result = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!result) return null;

    return result;
  }

  async create(data: CreateUserDto, tx: PrismaTransaction) {
    return tx.user.create({
      data,
    });
  }

  async activateUser(userId: string, tx: PrismaTransaction) {
    return tx.user.update({
      where: {
        id: userId,
      },
      data: {
        status: 'ACTIVE',
      },
    });
  }

  async findByEmailWithAuth(email: string) {
    return await this.prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        auth: true,
        avatar: {
          select: {
            id: true,
            name: true,
            path: true,
            fileId: true,
          },
        },
        googleAccount: {
          select: {
            id: true,
            googleId: true,
          },
        },
      },
    });
  }

  async findByIdWithAuth(userId: string) {
    return await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        auth: true,
        avatar: {
          select: {
            id: true,
            name: true,
            path: true,
            fileId: true,
          },
        },
        googleAccount: {
          select: {
            id: true,
            googleId: true,
          },
        },
      },
    });
  }

  async findProfileById(userId: string) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        avatar: {
          select: {
            id: true,
            name: true,
            path: true,
            fileId: true,
          },
        },
      },
    });
  }

  async updateProfile(userId: string, name: string) {
    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        name,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        avatar: {
          select: {
            id: true,
            name: true,
            path: true,
            fileId: true,
          },
        },
      },
    });
  }

  async createOrUpdateAvatar(
    userId: string,
    data: {
      name: string;
      fileId: string;
      path: string;
    },
  ) {
    return this.prisma.avatar.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
      },
      update: data,
    });
  }

  async findAvatarByUserId(userId: string) {
    return this.prisma.avatar.findUnique({
      where: { userId },
      select: {
        id: true,
        name: true,
        fileId: true,
        path: true,
      },
    });
  }

  async deleteAvatar(userId: string) {
    return this.prisma.avatar.delete({
      where: { userId },
    });
  }
}
