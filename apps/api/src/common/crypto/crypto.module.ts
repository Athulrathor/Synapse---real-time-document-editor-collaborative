import { Module } from '@nestjs/common';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';
import { EncryptionService } from './encryption.service.js';

@Module({
  providers: [PasswordService,TokenService,EncryptionService],
  exports: [PasswordService,TokenService,EncryptionService]
})
export class CryptoModule {}
