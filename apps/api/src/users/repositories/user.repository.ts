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

    if(!result) return null;

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

  findByEmailWithAuth(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        auth: true,
      },
    });
  }

  findByIdWithAuth(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        auth: true,
      },
    });
  }
};
