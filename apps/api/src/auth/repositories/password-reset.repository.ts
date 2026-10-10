import { Injectable } from '@nestjs/common';
import { PrismaService} from '../../database/prisma.service.js';
import { PasswordReset } from '@prisma/client';

@Injectable()
export class PasswordResetRepository {
  // Inject your raw DB client or connection pool if you have one
  constructor(
    private readonly prisma: PrismaService,
  ) {}

    async createPasswordReset(): Promise<PasswordReset | null> {
        return null;
    }
}