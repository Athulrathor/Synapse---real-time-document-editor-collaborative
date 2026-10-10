import {
  ForbiddenException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { RegisterDto } from './dto/register.dto.js';
import { AuthDto } from './dto/auth.dto.js';
import { CreateUserDto } from '../users/dto/create-user.dto.js';

import { AuthRepository } from './repositories/auth.repository.js';
import { VerificationRepository } from './repositories/verification.repository.js';
import { UsersRepository } from '../users/repositories/user.repository.js';

import { AppException } from '../common/exceptions/app.exception.js';

import { PrismaService } from '../database/prisma.service.js';
import { PasswordService } from '../common/crypto/password.service.js';
import { TokenService } from '../common/crypto/token.service.js';
import { JwtTokenService } from '../common/jwt/jwt.service.js';

import { EmailQueue } from '../jobs/email/email.queue.js';

import { PrismaTransaction } from '../database/prisma.types.js';

import { UserStatus } from '@prisma/client';
import { VerificationDto } from './dto/verification.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { SessionRepository } from './repositories/session.repository.js';
import { OutboxRepository } from '../jobs/outbox/outbox.repository.js';
import { EncryptionService } from '../common/crypto/encryption.service.js';
import { RefreshTokenDto } from '../common/jwt/dto/refresh-token.dto.js';
import {
  RefreshTokenPayloadDto,
  RefreshTokenResponseDto,
} from './dto/refreshToken.dto.js';

export interface RegistrationResponse {
  success: boolean;
  message: string;
  accessToken?: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    name: string;
    status: UserStatus;
    createdAt: Date;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly verificationRepository: VerificationRepository,
    private readonly userRepository: UsersRepository,
    private readonly outboxRepository: OutboxRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly encrytionService: EncryptionService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtTokenService,
    private readonly sessionRepository: SessionRepository,
    private readonly emailQueue: EmailQueue,
  ) {}

  async registerUser(dto: RegisterDto): Promise<RegistrationResponse> {
    const { name, email, password } = dto;

    const normalizedEmail = email.trim().toLowerCase();

    const existedUser = await this.userRepository.findByEmail(normalizedEmail);

    if (existedUser) {
      throw new AppException({
        code: 'USER_ALREADY_EXISTS',
        message: 'A user with this email already exists.',
        status: HttpStatus.CONFLICT,
      });
    }

    const passwordHash = await this.passwordService.hash(password);

    const verificationToken = await this.tokenService.generateRandomToken();

    const verificationTokenHash =
      await this.tokenService.hashToken(verificationToken);

    const encryptedToken =
      await this.encrytionService.encrypt(verificationToken);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.prisma.$transaction(
      async (tx: PrismaTransaction) => {
        const newUser = await this.userRepository.create(
          {
            email: normalizedEmail,
            name,
            status: UserStatus.PENDING,
          } as CreateUserDto,
          tx,
        );

        await this.authRepository.create(
          {
            userId: newUser.id,
            passwordHash: passwordHash,
          } as AuthDto,
          tx,
        );

        await this.verificationRepository.create(
          {
            userId: newUser.id,
            token: verificationTokenHash,
            expiresAt: expiresAt,
          } as VerificationDto,
          tx,
        );

        await this.outboxRepository.create(
          {
            eventType: 'USER_VERIFICATION_EMAIL_REQUESTED',
            aggregateId: newUser.id,
            payload: {
              userId: newUser.id,
              email: normalizedEmail,
              name,
              encryptedToken,
            },
          },
          tx,
        );

        return newUser;
      },
    );

    await this.emailQueue.enqueueVerification({
      type: 'verification',
      email,
      name,
      token: verificationToken,
    });

    return {
      success: true,
      message: 'Verification email send to registed email address.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
        createdAt: user.createdAt,
      },
    };
  }

  async verifyEmail(
    dto: VerifyEmailDto,
  ): Promise<{ success: boolean; message: string } | null> {
    const { token } = dto;

    const tokenHash = await this.tokenService.hashToken(token);

    const verificationRecord =
      await this.verificationRepository.findByTokenHash(tokenHash);

    if (!verificationRecord) {
      throw new AppException({
        code: 'INVALID_VERIFICATION_TOKEN',
        message:
          'The provided verification token is invalid or has already been used.',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    if (verificationRecord.expiresAt < new Date()) {
      throw new AppException({
        code: 'VERIFICATION_TOKEN_EXPIRED',
        message: 'Verification token has expired.',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    if (verificationRecord.user.status === 'ACTIVE') {
      throw new AppException({
        code: 'EMAIL_ALREADY_VERIFIED',
        message: 'Email is already verified.',
        status: HttpStatus.CONFLICT,
      });
    }

    await this.prisma.$transaction(async (tx: PrismaTransaction) => {
      await tx.emailVerification.update({
        where: {
          id: verificationRecord.id,
        },
        data: {
          verifiedAt: new Date(),
        },
      });

      await this.userRepository.activateUser(
        verificationRecord.userId as string,
        tx,
      );
    });

    return { success: true, message: 'Email verified successfully.' };
  }

  async loginUser(
    dto: { email: string; password: string },
    ipAddress: string,
    userAgent: string,
    deviceName: string,
  ): Promise<RegistrationResponse | null> {
    const { email, password } = dto;

    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.userRepository.findByEmailWithAuth(normalizedEmail);

    if (!user || !user.auth) {
      throw new AppException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    if (user.status === UserStatus.PENDING) {
      throw new AppException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email before logging in.',
        status: HttpStatus.FORBIDDEN,
      });
    }

    if (
      user.status === UserStatus.SUSPENDED ||
      user.status === UserStatus.DELETED
    ) {
      throw new AppException({
        code: 'ACCOUNT_UNAVAILABLE',
        message: 'This account is unavailable.',
        status: HttpStatus.FORBIDDEN,
      });
    }

    if (user.auth.lockedUntil && user.auth.lockedUntil > new Date()) {
      throw new AppException({
        code: 'ACCOUNT_LOCKED',
        message: 'Account is temporarily locked.',
        status: HttpStatus.FORBIDDEN,
      });
    }

    const passwordValid = await this.passwordService.verify(
      user.auth.passwordHash!,
      password,
    );

    if (!passwordValid) {
      await this.authRepository.recordFailedLogin(user.id);

      throw new AppException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    const sessionId = await this.tokenService.createRandomUUID();

    const accessToken = await this.jwtService.generateAccessToken({
      sub: user.id,
      email: user.email,
      sessionId,
      tokenVersion: user.auth.tokenVersion,
    });

    const refreshToken = await this.jwtService.generateRefreshToken({
      sub: user.id,
      sessionId,
      tokenVersion: user.auth.tokenVersion,
    });

    const refreshTokenHash = await this.tokenService.hashToken(refreshToken);

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction(async (tx: PrismaTransaction) => {
      await this.sessionRepository.create(
        {
          id: sessionId,
          userId: user.id,
          ipAddress,
          userAgent,
          deviceName,
          refreshTokenHash,
          expiresAt,
        },
        tx,
      );
    });

    await this.authRepository.resetFailedLogins(user.id);

    return {
      success: true,
      message: 'Email verified successfully.',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
        createdAt: user.createdAt,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto): Promise<RefreshTokenResponseDto> {
    let payload: RefreshTokenPayloadDto;

    // 1. Verify JWT signature and expiration.
    try {
      payload =
        await this.jwtService.verifyRefreshToken<RefreshTokenPayloadDto>(
          dto.refreshToken,
        );
    } catch {
      throw new AppException({
        code: 'Invalid_Credential',
        message: 'Invalid or expired refresh token.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    // 2. Validate required claims at runtime.
    if (
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      typeof payload.sessionId !== 'string' ||
      !payload.sessionId ||
      !Number.isSafeInteger(payload.tokenVersion) ||
      payload.tokenVersion < 0
    ) {
      throw new AppException({
        code: 'Invalid_Credential',
        message: 'Invalid refresh token claims.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    // 3. Find the session and associated user.
    const session = await this.sessionRepository.findByIdAndUserId(
      payload.sessionId,
      payload.sub,
    );

    if (!session) {
      throw new AppException({
        code: 'Invalid_Credential',
        message: 'Invalid refresh token.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    const now = new Date();

    // 4. Check session validity.
    if (session.revokedAt || session.expiresAt <= now) {
      throw new AppException({
        code: 'Session_Already_Revoked',
        message: 'Session is expired or revoked.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    // 5. Check account status.
    if (session.user.status !== UserStatus.ACTIVE) {
      throw new AppException({
        code: 'Accout_is_Active',
        message: "Account is not active.');",
        status: HttpStatus.FORBIDDEN,
      });
    }

    // 6. Check token version.
    if (
      !session.user.auth ||
      session.user.auth.tokenVersion !== payload.tokenVersion
    ) {
      throw new AppException({
        code: 'Invalid_Refresh_Token',
        message: 'Refresh token is no longer valid.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    // 7. Verify the presented token matches the stored hash.
    const currentTokenHash = await this.tokenService.hashToken(
      dto.refreshToken,
    );

    if (currentTokenHash !== session.refreshTokenHash) {
      throw new AppException({
        code: 'Invalid_Refresh_Token',
        message: 'Refresh token reuse detected.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    // 8. Generate replacement tokens.
    const newRefreshToken = await this.jwtService.generateRefreshToken({
      sub: session.user.id,
      sessionId: session.id,
      tokenVersion: session.user.auth.tokenVersion,
    });

    const newAccessToken = await this.jwtService.generateAccessToken({
      sub: session.user.id,
      email: session.user.email,
      sessionId: session.id,
      tokenVersion: session.user.auth.tokenVersion,
    });

    const newRefreshTokenHash =
      await this.tokenService.hashToken(newRefreshToken);

    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // 9. Atomically replace the old hash.
    const result = await this.sessionRepository.rotateRefreshToken(
      session.id,
      session.user.id,
      currentTokenHash,
      newRefreshTokenHash,
      newExpiresAt,
    );

    if (result.count !== 1) {
      throw new AppException({
        code: 'Invalid_Refresh_Token',
        message:
          'Refresh token has already been used or the session is no longer valid.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    // 10. Return the new tokens only after rotation succeeds.
    return {
      success: true,
      message: 'Tokens refreshed successfully.',
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logoutCurrentSession(userId: string, sessionId: string) {
    const result = await this.sessionRepository.revokeSessionForUser(
      sessionId,
      userId,
    );

    return {
      success: true,
      message: result
        ? 'Logged out successfully.'
        : 'Session was already revoked or does not exist.',
    };
  }

  async logoutAllSessions(userId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.userAuth.update({
        where: { userId },
        data: {
          tokenVersion: { increment: 1 },
        },
      });

      await this.sessionRepository.revokeAllUserSessionsInTransaction(
        userId,
        tx,
      );
    });

    return {
      success: true,
      message: 'Logged out from all devices successfully.',
    };
  }
}
