import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { RegisterDto } from './dto/register.dto.js';
import { AuthDto, AuthUserResponse } from './dto/auth.dto.js';
import { CreateUserDto } from '../users/dto/create-user.dto.js';

import { AuthRepository } from './repositories/auth.repository.js';
import { VerificationRepository } from './repositories/verification.repository.js';
import { UsersRepository } from '../users/repositories/user.repository.js';

import { AppException } from '../common/exceptions/app.exception.js';

import { PrismaService } from '../database/prisma.service.js';
import { PasswordService } from '../common/crypto/password.service.js';
import { TokenService } from '../common/crypto/token.service.js';
import { JwtTokenService } from '../common/jwt/jwt.service.js';

import { PrismaTransaction } from '../database/prisma.types.js';

import { UserStatus } from '@prisma/client';

import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { SessionRepository } from './repositories/session.repository.js';
import { OutboxRepository } from '../jobs/outbox/outbox.repository.js';
import { EncryptionService } from '../common/crypto/encryption.service.js';
import { RefreshTokenDto } from '../common/jwt/dto/refresh-token.dto.js';
import { ForgotPasswordDto } from './dto/forget-password.dto.js';
import { PasswordResetRepository } from './repositories/password-reset.repository.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { GoogleAccountRepository } from './repositories/google-account.repository.js';
import type { GoogleUserProfile } from './strategies/google.strategy.js';
import { ImageKitService } from '../common/imagekit/imagekit.service.js';
import { ConfigService } from '@nestjs/config';
import { ChangePasswordDto } from './dto/change-password-dto.js';

export interface LoginsResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    status: UserStatus;
    createdAt: Date;
    auth?: {
      id: string;
      emailVerified: boolean;
    };
    avatar?: {
      id: string;
      name: string;
      path: string;
      fileId: string;
    };
  };
}

export type JwtPayload = {
  sub: string;
  email: string;
  sessionId: string;
  tokenVersion: number;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private logError(error: unknown): void {
    if (error instanceof Error) {
      this.logger.error(`${error.name}: ${error.message}`, error.stack);
    } else {
      this.logger.error(`Unknown error: ${String(error)}`);
    }
  }

  private async downloadGoogleAvatar(
    avatarUrl: string,
  ): Promise<Buffer | null> {
    try {
      const url = new URL(avatarUrl);

      if (url.protocol !== 'https:') {
        return null;
      }

      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        redirect: 'error',
      });

      if (!response.ok) {
        return null;
      }

      const contentType = response.headers.get('content-type');

      if (!contentType?.startsWith('image/')) {
        return null;
      }

      const contentLength = Number(response.headers.get('content-length') ?? 0);

      const maxSize = 5 * 1024 * 1024;

      if (contentLength > maxSize) {
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();

      if (arrayBuffer.byteLength > maxSize) {
        return null;
      }

      return Buffer.from(arrayBuffer);
    } catch {
      return null;
    }
  }

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
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly googleAccountRepository: GoogleAccountRepository,
    private readonly imagekitService: ImageKitService,
    private readonly configService: ConfigService,
  ) {}

  async registerUser(
    dto: RegisterDto,
    avatar?: Express.Multer.File,
  ): Promise<void> {
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

    if (!avatar) {
      throw new Error('error imagekit?.');
    }

    const uploadResult = await this.imagekitService.uploadAvatar(
      avatar.buffer,
      avatar.originalname,
    );
    const fileId = uploadResult.fileId;
    if (!fileId) {
      throw new Error('Avatar upload did not return a file ID.');
    }
    const filePath = uploadResult.filePath;
    if (!filePath) {
      throw new Error('Avatar upload did not return a file path.');
    }

    const passwordHash = await this.passwordService.hash(password);

    const verificationToken = await this.tokenService.generateRandomToken();

    const verificationTokenHash =
      await this.tokenService.hashToken(verificationToken);

    const encryptedToken =
      await this.encrytionService.encrypt(verificationToken);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.prisma
      .$transaction(async (tx: PrismaTransaction) => {
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

        await tx.avatar.create({
          data: {
            name: uploadResult.name ?? avatar.originalname,
            fileId,
            path: filePath,
            userId: newUser.id,
          },
        });

        await this.outboxRepository.create(
          {
            eventType: 'USER_VERIFICATION_EMAIL_REQUESTED',
            aggregateId: newUser.id,
            payload: {
              userId: newUser.id,
              email: normalizedEmail,
              name,
              token: encryptedToken,
            },
          },
          tx,
        );

        return newUser;
      })
      .catch(async (error) => {
        if (uploadResult) {
          if (uploadResult.fileId)
            try {
              await this.imagekitService.deleteImage(uploadResult.fileId);
            } catch (cleanupError) {
              // Log cleanup failure for later reconciliation.
              console.error(
                'Failed to clean up orphaned Google avatar:',
                cleanupError,
              );
            }
        }
        throw error;
      });

    const ttlSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

    const verificationStored =
      await this.verificationRepository.createVerification(
        verificationTokenHash,
        user.id,
        ttlSeconds,
      );

    if (!verificationStored) {
      throw new AppException({
        code: 'VERIFICATION_TOKEN_CREATION_FAILED',
        message: 'Unable to create an email verification token.',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }

    return;
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    const { token } = dto;

    const tokenHash = await this.tokenService.hashToken(token);

    const verificationRecord =
      await this.verificationRepository.consumeRedisVerification(tokenHash);

    if (!verificationRecord) {
      throw new AppException({
        code: 'INVALID_VERIFICATION_TOKEN',
        message:
          'The provided verification token is invalid or has already been used.',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    await this.prisma.$transaction(async (tx: PrismaTransaction) => {
      const user = await tx.user.findUnique({
        where: { id: verificationRecord.userId },
        include: {
          auth: true,
        },
      });

      if (!user) {
        throw new AppException({
          code: 'USER_NOT_FOUND',
          message: 'The user associated with this token was not found.',
          status: HttpStatus.NOT_FOUND,
        });
      }

      if (!user.auth) {
        throw new AppException({
          code: 'USER_AUTH_NOT_FOUND',
          message: 'Authentication information was not found.',
          status: HttpStatus.NOT_FOUND,
        });
      }

      if (user.auth.emailVerified) {
        throw new AppException({
          code: 'EMAIL_ALREADY_VERIFIED',
          message: 'Email is already verified.',
          status: HttpStatus.CONFLICT,
        });
      }

      await tx.userAuth.update({
        where: { userId: user.id },
        data: { emailVerified: true },
      });

      await this.userRepository.activateUser(user.id, tx);
    });

    return;
  }

  async loginUser(
    dto: { email: string; password: string },
    ipAddress: string,
    userAgent: string,
    deviceName: string,
  ): Promise<LoginsResponse> {
    const { email, password } = dto;

    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.userRepository.findByEmailWithAuth(normalizedEmail);

    if (!user || !user.auth) {
      throw new AppException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
        status: HttpStatus.BAD_REQUEST,
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

    if (!user?.auth?.passwordHash) {
      throw new AppException({
        code: 'GOOGLE_USER_ERROR',
        message: 'Please login through google sign',
        status: HttpStatus.UNAUTHORIZED,
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
      await this.authRepository.recordFailedLogin(user.id); // wait

      throw new AppException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const sessionId = await this.tokenService.createRandomUUID();

    const tokenVersion = await this.authRepository.getTokenVersion(user.id);

    const accessToken = await this.jwtService.generateAccessToken({
      sub: user.id,
      email: user.email,
      sessionId,
      tokenVersion,
    });

    const refreshToken = await this.jwtService.generateRefreshToken({
      sub: user.id,
      sessionId,
      tokenVersion,
    });

    const refreshTokenHash = await this.tokenService.hashToken(refreshToken);

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.sessionRepository.create({
      id: sessionId,
      userId: user.id,
      ipAddress,
      userAgent,
      deviceName,
      refreshTokenHash,
      expiresAt,
    });

    await this.authRepository.resetFailedLogins(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
        createdAt: user.createdAt,
        avatar: {
          id: user?.avatar?.id ?? '',
          name: user?.avatar?.name ?? '',
          path: user?.avatar?.path ?? '',
          fileId: user?.avatar?.fileId ?? '',
        },
        auth: {
          id: user?.auth?.id,
          emailVerified: user?.auth?.emailVerified ?? false,
        },
      },
    };
  }

  async loginWithGoogle(
    profile: GoogleUserProfile,
    ipAddress: string,
    userAgent: string,
    deviceName: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: AuthUserResponse;
  }> {
    const user = await this.resolveGoogleUser(profile);

    const sessionId = await this.tokenService.createRandomUUID();

    const tokenVersion = await this.authRepository.getTokenVersion(user.id);

    const accessToken = await this.jwtService.generateAccessToken({
      sub: user.id,
      email: user.email,
      sessionId,
      tokenVersion,
    });

    const refreshToken = await this.jwtService.generateRefreshToken({
      sub: user.id,
      sessionId,
      tokenVersion,
    });

    const refreshTokenHash = await this.tokenService.hashToken(refreshToken);

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.sessionRepository.create({
      id: sessionId,
      userId: user.id,
      ipAddress,
      userAgent,
      deviceName,
      refreshTokenHash,
      expiresAt,
    });

    return {
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        avatar: user.avatar
          ? {
              id: user.avatar.id,
              fileId: user.avatar.fileId,
              name: user.avatar.name,
              path: user.avatar.path,
            }
          : null,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: AuthUserResponse;
  }> {
    let payload: JwtPayload;

    // 1. Verify JWT signature and expiration.
    try {
      payload = await this.jwtService.verifyRefreshToken<JwtPayload>(
        dto.refreshToken,
      );
    } catch (error) {
      throw new AppException({
        code: 'Invalid_Credential',
        message: 'Invalid or expired refresh token.',
        status: HttpStatus.UNAUTHORIZED,
        details: error,
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

    const user = await this.userRepository.findByIdWithAuth(payload.sub);

    if (!user || !user.auth || user.status !== UserStatus.ACTIVE) {
      throw new AppException({
        code: 'Invalid_Credential',
        message: 'Account is not active or no longer exists.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    const currentTokenVersion = await this.authRepository.getTokenVersion(
      user.id,
    );

    if (currentTokenVersion !== payload.tokenVersion) {
      throw new AppException({
        code: 'Invalid_Refresh_Token',
        message: 'Refresh token is no longer valid.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    const session = await this.sessionRepository.findByIdAndUserId(
      payload.sessionId,
      user.id,
    );

    if (!session || session.expiresAt.getTime() <= Date.now()) {
      throw new AppException({
        code: 'Invalid_Refresh_Token',
        message: 'Session is expired or revoked.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    const now = new Date();

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
      sub: user.id,
      sessionId: session.id,
      tokenVersion: currentTokenVersion,
    });

    const newAccessToken = await this.jwtService.generateAccessToken({
      sub: user.id,
      email: user.email,
      sessionId: session.id,
      tokenVersion: currentTokenVersion,
    });

    const newRefreshTokenHash =
      await this.tokenService.hashToken(newRefreshToken);

    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // 9. Atomically replace the old hash.
    const result = await this.sessionRepository.rotateRefreshToken(
      session.id,
      user.id,
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
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        avatar: user.avatar
          ? {
              id: user.avatar.id,
              fileId: user.avatar.fileId,
              name: user.avatar.name,
              path: user.avatar.path,
            }
          : null,
      },
    };
  }

  async logoutCurrentSession(userId: string, sessionId: string): Promise<void> {
    const result = await this.sessionRepository.revokeSessionForUser(
      sessionId,
      userId,
    );

    return;
  }

  async logoutAllSessions(userId: string): Promise<void> {
    await this.authRepository.incrementTokenVersion(userId);

    await this.sessionRepository.revokeAllUserSessions(userId);

    return;
  }

  async forgetPassword(dto: ForgotPasswordDto): Promise<void> {
    const { email } = dto;

    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.userRepository.findByEmailWithAuth(normalizedEmail);

    if (!user || user.status !== UserStatus.ACTIVE) {
      return;
    }

    const otp = await this.tokenService.generateDigitOtp();

    const tokenHash = await this.tokenService.hashToken(otp);

    const encryptedOtp = await this.encrytionService.encrypt(otp);

    await this.passwordResetRepository.save(tokenHash, user.id, 300);

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.outboxRepository.create(
          {
            eventType: 'RESET_PASSWORD_EMAIL_REQUESTED',
            aggregateId: user.id,
            payload: {
              userId: user.id,
              email: normalizedEmail,
              name: user.name,
              token: encryptedOtp,
            },
          },
          tx,
        );
      });
    } catch (error) {
      await this.passwordResetRepository.consume(tokenHash);
      throw new AppException({
        code: 'EMAIL_QUEUE_ERROR',
        message: 'Unable to request password-reset email.',
        details: error,
      });
    }

    return;
  }

  async verifyResetPasswordOtp(data: {
    email: string;
    otp?: string | undefined;
  }): Promise<{ resetToken: string }> {
    const { email, otp } = data;
    const normalizedEmail = email.trim().toLowerCase();

    if (!otp || !/^\d{6}$/.test(otp)) {
      new AppException({
        code: 'INVALID_RESET_OTP',
        message: 'Invalid or expired verification code.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    const user = await this.userRepository.findByEmailWithAuth(normalizedEmail);

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new AppException({
        code: 'INVALID_RESET_OTP',
        message: 'Invalid or expired verification code.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    const tokenHash = await this.tokenService.hashToken(otp as string);

    const UserId = await this.passwordResetRepository.findUserId(tokenHash);

    if (!UserId || UserId !== user.id) {
      const attempts =
        await this.passwordResetRepository.incrementFailedAttempts(tokenHash);

      if (attempts >= 5) {
        await this.passwordResetRepository.consume(tokenHash);
        await this.passwordResetRepository.clearFailedAttempts(tokenHash);
      }

      throw new AppException({
        code: 'INVALID_RESET_OTP',
        message: 'Invalid or expired verification code.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    const consumedUserId =
      await this.passwordResetRepository.consume(tokenHash);

    if (!consumedUserId || consumedUserId !== user.id) {
      throw new AppException({
        code: 'INVALID_RESET_OTP',
        message: 'Invalid or expired verification code.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    await this.passwordResetRepository.clearFailedAttempts(tokenHash);

    const resetToken = await this.tokenService.createRandomUUID();

    const resetTokenHash = await this.tokenService.hashToken(resetToken);

    await this.passwordResetRepository.saveResetToken(
      resetTokenHash,
      user.id,
      600,
    );

    return { resetToken: resetToken };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const { resetToken, newPassword, confirmPassword } = dto;

    if (newPassword !== confirmPassword) {
      throw new AppException({
        code: 'PASSWORD_MISMATCH',
        message: 'Password and confirm password do not match.',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const tokenHash = await this.tokenService.hashToken(resetToken);

    const userId =
      await this.passwordResetRepository.findUserIdResetToken(tokenHash);

    if (!userId) {
      throw new AppException({
        code: 'INVALID_OR_EXPIRED_RESET_TOKEN',
        message: 'Invalid or expired password-reset token.',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return;
  }

  // async resolveGoogleUser(profile: GoogleUserProfile) {
  //   // 1. Find an existing Google account.
  //   const existingGoogleAccount =
  //     await this.googleAccountRepository.findByGoogleId(profile.googleId);

  //   if (existingGoogleAccount) {
  //     if (existingGoogleAccount.user.status !== UserStatus.ACTIVE) {
  //       throw new AppException({
  //         code: 'ACCOUNT_UNAVAILABLE',
  //         message: 'This account is unavailable.',
  //         status: HttpStatus.FORBIDDEN,
  //       });
  //     }

  //     return existingGoogleAccount.user;
  //   }

  //   // 2. Require a verified Google email.
  //   if (!profile.emailVerified) {
  //     throw new AppException({
  //       code: 'GOOGLE_EMAIL_NOT_VERIFIED',
  //       message: 'Your Google email must be verified.',
  //       status: HttpStatus.FORBIDDEN,
  //     });
  //   }

  //   // 3. Do not silently link Google to an existing account.
  //   const existingUser = await this.userRepository.findByEmailWithAuth(
  //     profile.email,
  //   );

  //   if (existingUser) {
  //     throw new AppException({
  //       code: 'GOOGLE_ACCOUNT_LINK_REQUIRED',
  //       message:
  //         'An account with this email already exists. Sign in using your existing method before linking Google.',
  //       status: HttpStatus.CONFLICT,
  //     });
  //   }

  //   // 4. Download and upload the avatar only when creating a new user.
  //   let uploadedAvatar: {
  //     fileId: string;
  //     filePath: string;
  //     name: string;
  //   } | null = null;

  //   if (profile.avatarUrl) {
  //     try {
  //       const avatarBuffer = await this.downloadGoogleAvatar(profile.avatarUrl);

  //       if (avatarBuffer) {
  //         const avatarFileName = `google-avatar-${profile.googleId}.jpg`;

  //         uploadedAvatar = (await this.imagekitService.uploadAvatar(
  //           avatarBuffer,
  //           avatarFileName,
  //         )) as {
  //           fileId: string;
  //           filePath: string;
  //           name: string;
  //         };
  //       }
  //     } catch {
  //       // Avatar upload is optional; authentication can continue without it.
  //       uploadedAvatar = null;
  //     }
  //   }

  //   // 5. Create the user and related records atomically.
  //   try {
  //     return await this.prisma.$transaction(async (tx: PrismaTransaction) => {
  //       const user = await tx.user.create({
  //         data: {
  //           email: profile.email,
  //           name: profile.name,
  //           status: UserStatus.ACTIVE,
  //         },
  //       });

  //       const auth = await tx.userAuth.create({
  //         data: {
  //           userId: user.id,
  //           passwordHash: null,
  //           emailVerified: profile.emailVerified,
  //         },
  //       });

  //       const google = await tx.googleAccount.create({
  //         data: {
  //           userId: user.id,
  //           googleId: profile.googleId,
  //           email: profile.email,
  //           emailVerified: profile.emailVerified,
  //         },
  //       });

  //       const avatar = uploadedAvatar
  //         ? await tx.avatar.create({
  //             data: {
  //               name: uploadedAvatar.name,
  //               fileId: uploadedAvatar.fileId,
  //               path: uploadedAvatar.filePath,
  //               userId: user.id,
  //             },
  //           })
  //         : null;

  //       return {
  //         id: user.id,
  //         email: user.email,
  //         name: user.name,
  //         status: user.status,
  //         createdAt: user.createdAt,
  //         auth: {
  //           id: auth.id,
  //           emailVerified: auth.emailVerified,
  //         },
  //         avatar: avatar
  //           ? {
  //               id: avatar.id,
  //               name: avatar.name,
  //               path: avatar.path,
  //               fileId: avatar.fileId,
  //             }
  //           : null,
  //         googleAccount: {
  //           id: google.id,
  //           googleId: google.googleId,
  //         },
  //       };
  //     });
  //   } catch (error) {
  //     // Clean up the external file if the database transaction fails.
  //     if (uploadedAvatar) {
  //       try {
  //         await this.imagekitService.deleteImage(uploadedAvatar.fileId);
  //       } catch (cleanupError) {
  //         console.error(
  //           'Failed to clean up orphaned Google avatar:',
  //           cleanupError,
  //         );
  //       }
  //     }

  //     // Preserve intentional application errors.
  //     if (error instanceof AppException) {
  //       throw error;
  //     }

  //     // Avoid misreporting database failures as avatar upload failures.
  //     console.error('Failed to create Google user:', error);

  //     throw new AppException({
  //       code: 'GOOGLE_USER_CREATION_FAILED',
  //       message: 'Unable to create your account with Google.',
  //       status: HttpStatus.INTERNAL_SERVER_ERROR,
  //     });
  //   }
  // }

  // async generateGoogleOAuthState(): Promise<string> {
  //   const state = await this.tokenService.generateRandomToken(32);

  //   const created = await this.verificationRepository.createGoogleOAuthState(
  //     state,
  //     300,
  //   );

  //   if (!created) {
  //     throw new AppException({
  //       code: '',
  //       message: 'Failed to initialize Google authentication.',
  //       status: HttpStatus.INTERNAL_SERVER_ERROR,
  //     });
  //   }

  //   return state;
  // }

  // async consumeGoogleOAuthState(state: string): Promise<boolean> {
  //   if (!state || state.length > 256) {
  //     return false;
  //   }

  //   return this.verificationRepository.consumeGoogleOAuthState(state);
  // }

  private async resolveGoogleUser(
  profile: GoogleUserProfile,
): Promise<LoginsResponse> {
  const googleId = profile.googleId?.trim();
  const email = profile.email?.trim().toLowerCase();
  const emailVerified = profile.emailVerified;

  // 1. Validate Google profile
  if (!googleId || !email || !emailVerified) {
    throw new AppException({
      code: 'INVALID_GOOGLE_PROFILE',
      message: 'Google account information is invalid or email is not verified.',
      status: HttpStatus.UNAUTHORIZED,
    });
  }

  // 2. Check whether Google account is already linked
  const existingGoogleAccount =
    await this.prisma.googleAccount.findUnique({
      where: { googleId },
      include: {
        user: {
          include: {
            auth: true,
            avatar: true,
            googleAccount: true,
          },
        },
      },
    });

  if (existingGoogleAccount) {
    if (existingGoogleAccount.user.status !== 'ACTIVE') {
      throw new AppException({
        code: 'ACCOUNT_INACTIVE',
        message: 'Your account is inactive.',
        status: HttpStatus.FORBIDDEN,
      });
    }

    return existingGoogleAccount.user;
  }

  // 3. Do not automatically link accounts using email
  const existingUser = await this.prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppException({
      code: 'GOOGLE_ACCOUNT_LINK_REQUIRED',
      message: 'An account with this email already exists. Please sign in and link your Google account.',
      status: HttpStatus.CONFLICT,
    });
  }

  // 4. Download and upload Google avatar for a new user
  let uploadedAvatar: {
    fileId: string;
    path: string;
    name: string;
  } | null = null;

  if (profile.avatarUrl) {
    const buffer = await this.downloadGoogleAvatar(profile.avatarUrl);

    if (buffer) {
      const uploaded = await this.imagekitService.uploadAvatar(
        buffer,
        `google-avatar-${googleId}.jpg`,
      );

      const { fileId, filePath, name } = uploaded;

if (fileId && filePath && name) {
  uploadedAvatar = {
    fileId,
    path: filePath,
    name,
  };
} else {
  throw new AppException({
    code: 'INVALID_AVATAR_UPLOAD',
    message: 'ImageKit returned incomplete avatar information.',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  });
}
    }
  }

  // 5. Create user and related records atomically
  try {
    const user = await this.prisma.$transaction(async (tx) => {
      return tx.user.create({
        data: {
          email,
          name: profile.name?.trim() || email.split('@')[0],
          status: 'ACTIVE',

          auth: {
            create: {
              passwordHash: null,
              emailVerified: true,
            },
          },

          googleAccount: {
            create: {
              googleId,
              email,
              emailVerified: true,
            },
          },

          ...(uploadedAvatar && {
            avatar: {
              create: {
                name: uploadedAvatar.name,
                fileId: uploadedAvatar.fileId,
                path: uploadedAvatar.path,
              },
            },
          }),
        },
        include: {
          auth: true,
          avatar: true,
          googleAccount: true,
        },
      });
    });

    return user;
  } catch (error) {
    // 6. Handle concurrent Google login requests
    const linkedAccount =
      await this.prisma.googleAccount.findUnique({
        where: { googleId },
        include: {
          user: {
            include: {
              auth: true,
              avatar: true,
              googleAccount: true,
            },
          },
        },
      });

    // This request's uploaded image was not used by the concurrent request.
    if (uploadedAvatar) {
      try {
        await this.imagekitService.deleteImage(uploadedAvatar.fileId);
      } catch (cleanupError) {
        console.error(
          'Failed to clean up unused Google avatar:',
          cleanupError,
        );
      }
    }

    if (linkedAccount) {
      if (linkedAccount.user.status !== 'ACTIVE') {
        throw new AppException({
          code: 'ACCOUNT_INACTIVE',
          message: 'Your account is inactive.',
          status: HttpStatus.FORBIDDEN,
        });
      }

      return linkedAccount.user;
    }

    // 7. Check if another request created the email account
    const userByEmail = await this.prisma.user.findUnique({
      where: { email },
    });

    if (userByEmail) {
      throw new AppException({
        code: 'GOOGLE_ACCOUNT_LINK_REQUIRED',
        message: 'An account with this email already exists. Please sign in and link your Google account.',
        status: HttpStatus.CONFLICT,
      });
    }

    throw error;
  }
}

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const { currentPassword, newPassword, confirmPassword } = dto;

    // 1. Validate password confirmation.
    if (newPassword !== confirmPassword) {
      throw new AppException({
        code: 'PASSWORD_MISMATCH',
        message: 'New password and confirmation do not match.',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    // 2. Prevent reusing the current password.
    if (currentPassword === newPassword) {
      throw new AppException({
        code: 'SAME_PASSWORD',
        message: 'New password must be different from your current password.',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    // 3. Retrieve the existing password hash.
    const passwordHash = await this.authRepository.findPasswordHash(userId);

    if (!passwordHash) {
      throw new AppException({
        code: 'PASSWORD_NOT_CONFIGURED',
        message: 'This account does not have a password configured.',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    // 4. Verify the current password.
    const isCurrentPasswordValid = await this.passwordService.verify(
      passwordHash,
      currentPassword,
    );

    if (!isCurrentPasswordValid) {
      throw new AppException({
        code: 'INVALID_CURRENT_PASSWORD',
        message: 'Your current password is incorrect.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    // 5. Hash the new password.
    const newPasswordHash = await this.passwordService.hash(newPassword);

    // 6. Update password and increment tokenVersion atomically.
    await this.authRepository.resetPasswordAndIncrementTokenVersion(
      userId,
      newPasswordHash,
    );

    // 7. Revoke all Redis sessions.
    await this.sessionRepository.revokeAllUserSessions(userId);
  }
}
