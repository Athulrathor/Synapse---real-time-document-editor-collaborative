import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomInt } from 'crypto';

@Injectable()
export class TokenService {
  async generateRandomToken(bytes = 32): Promise<string> {
    return await randomBytes(bytes).toString('hex');
  }

  async hashToken(token: string): Promise<string> {
    return await createHash('sha256').update(token).digest('hex');
  }

  async generateDigitOtp(): Promise<string> {
    return String(randomInt(100000, 1_000_000));
  }

  async createRandomUUID(): Promise<string> {
    return await crypto.randomUUID();
  }
}
