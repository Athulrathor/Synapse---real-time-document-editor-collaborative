import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const encodedKey = config.getOrThrow<string>('ENCRYPTION_KEY');
    const key = Buffer.from(encodedKey, 'base64');

    if (key.length !== KEY_LENGTH) {
      throw new InternalServerErrorException(
        'ENCRYPTION_KEY must be a base64-encoded 32-byte key',
      );
    }

    this.key = key;
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);

    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      ciphertext.toString('base64'),
    ].join('.');
  }

  decrypt(payload: string): string {
    try {
      const parts = payload.split('.');

      if (parts.length !== 3) {
        throw new Error('Invalid encrypted payload');
      }

      const [ivEncoded, tagEncoded, ciphertextEncoded] = parts;
      const iv = Buffer.from(ivEncoded, 'base64');
      const authTag = Buffer.from(tagEncoded, 'base64');
      const ciphertext = Buffer.from(ciphertextEncoded, 'base64');

      if (
        iv.length !== IV_LENGTH ||
        authTag.length !== AUTH_TAG_LENGTH ||
        !ivEncoded ||
        !tagEncoded ||
        !ciphertextEncoded
      ) {
        throw new Error('Invalid encrypted payload');
      }

      const decipher = createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);

      return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new InternalServerErrorException(
        'Unable to decrypt protected data',
      );
    }
  }
}
