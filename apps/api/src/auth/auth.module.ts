import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './repositories/auth.repository.js';
import { VerificationRepository } from './repositories/verification.repository.js';
import { UsersRepository } from '../users/repositories/user.repository.js';
import { UsersModule } from '../users/users.module.js';
import { JwtModule } from '../common/jwt/jwt.module.js';
import { PasswordService } from '../common/crypto/password.service.js';
import { TokenService } from '../common/crypto/token.service.js';
import { EmailService } from '../common/email/email.service.js';
import { SessionRepository } from './repositories/session.repository.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { EmailQueue } from '../jobs/email/email.queue.js';
import { OutboxRepository } from '../jobs/outbox/outbox.repository.js';
import { CryptoModule } from '../common/crypto/crypto.module.js';

@Module({
  imports: [
    UsersModule,
    JwtModule,
    JobsModule,
    CryptoModule
  ],
  controllers: [AuthController],
  providers: [AuthService,PasswordService,TokenService,EmailQueue,AuthRepository,VerificationRepository,SessionRepository,UsersRepository,OutboxRepository],
  exports: [
    AuthService,
  ],
})
export class AuthModule {}
