import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class TokenService {
  async generateRandomToken(bytes = 32): Promise<string> {
    return await randomBytes(bytes).toString('hex');
  }

  async hashToken(token: string): Promise<string> {
    return await createHash('sha256')
      .update(token)
      .digest('hex');
  }

  async createRandomUUID(): Promise<string> {
    return await crypto.randomUUID();
  }
}