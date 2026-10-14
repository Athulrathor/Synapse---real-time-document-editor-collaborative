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

import { SessionRepository } from './repositories/session.repository.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { EmailQueue } from '../jobs/email/email.queue.js';
import { OutboxRepository } from '../jobs/outbox/outbox.repository.js';
import { CryptoModule } from '../common/crypto/crypto.module.js';
import { RedisModule } from '../common/redis/redis.module.js';
import { PasswordResetRepository } from './repositories/password-reset.repository.js';

import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from './strategies/google.strategy.js';
import { GoogleAccountRepository } from './repositories/google-account.repository.js';

import { ImageKitModule } from '../common/imagekit/imagekit.module.js';
import { ImageKitService } from '../common/imagekit/imagekit.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { JwtTokenService } from '../common/jwt/jwt.service.js';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [UsersModule, JwtModule, JobsModule, CryptoModule, RedisModule,ImageKitModule,PassportModule.register({ session: false }),],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    EmailQueue,
    AuthRepository,
    VerificationRepository,
    SessionRepository,
    PasswordResetRepository,
    UsersRepository,
    OutboxRepository,
    GoogleStrategy,
    GoogleAccountRepository,
    ImageKitService,
    JwtAuthGuard,
  ],
  exports: [AuthService,JwtAuthGuard,SessionRepository,AuthRepository],
})
export class AuthModule {}
