import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtTokenService } from '../common/jwt/jwt.service.js';
import { UsersRepository } from '../users/repositories/user.repository.js';
import { AuthRepository } from '../auth/repositories/auth.repository.js';
import { SessionRepository } from '../auth/repositories/session.repository.js';
import { AppException } from '../common/exceptions/app.exception.js';

interface AccessTokenPayload {
  sub: string;
  email?: string;
  sessionId: string;
  tokenVersion: number;
}

export interface AuthenticatedSocketUser {
  userId: string;
  email?: string;
  sessionId: string;
  tokenVersion: number;
  avatarPath?: string;
}

const INVALID_ACCESS_TOKEN = {
  code: 'INVALID_ACCESS_TOKEN',
  message: 'Access token is invalid or expired.',
  status: HttpStatus.UNAUTHORIZED,
} as const;

const AUTHENTICATION_FAILED = {
  code: 'AUTHENTICATION_FAILED',
  message: 'Authentication failed.',
  status: HttpStatus.UNAUTHORIZED,
} as const;

@Injectable()
export class CollaborationAuthService {
  constructor(
    private readonly jwtTokenService: JwtTokenService,
    private readonly usersRepository: UsersRepository,
    private readonly authRepository: AuthRepository,
    private readonly sessionRepository: SessionRepository,
  ) {}

  async authenticate(token: string): Promise<AuthenticatedSocketUser> {
    let payload: AccessTokenPayload;

    try {
      payload =
        await this.jwtTokenService.verifyAccessToken<AccessTokenPayload>(token);
    } catch {
      throw new AppException(INVALID_ACCESS_TOKEN);
    }

    if (
      !payload.sub ||
      !payload.sessionId ||
      !Number.isSafeInteger(payload.tokenVersion) ||
      payload.tokenVersion < 0
    ) {
      throw new AppException(INVALID_ACCESS_TOKEN);
    }

    const user = await this.usersRepository.findByIdWithAuth(payload.sub);

    if (!user || !user.auth || user.status !== 'ACTIVE') {
      throw new Error('Authentication failed.');
    }

    const currentTokenVersion = await this.authRepository.getTokenVersion(
      user.id,
    );

    if (currentTokenVersion !== payload.tokenVersion) {
      throw new AppException(AUTHENTICATION_FAILED);
    }

    if (user.auth.lockedUntil && user.auth.lockedUntil > new Date()) {
      throw new AppException(AUTHENTICATION_FAILED);
    }

    const session = await this.sessionRepository.findActiveSession(
      payload.sessionId,
      user.id,
    );

    if (!session) {
      throw new AppException(AUTHENTICATION_FAILED);
    }

    return {
      userId: user.id,
      email: payload.email,
      sessionId: session.id,
      tokenVersion: payload.tokenVersion,
      avatarPath: user.avatar?.path,
    };
  }
}
