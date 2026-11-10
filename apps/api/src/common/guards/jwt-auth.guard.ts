import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { type Request } from 'express';
import { JwtTokenService } from '../jwt/jwt.service.js';
import { AppException } from '../exceptions/app.exception.js';
import { UsersRepository } from '../../users/repositories/user.repository.js';
import { SessionRepository } from '../../auth/repositories/session.repository.js';
import { AuthRepository } from '../../auth/repositories/auth.repository.js';
import { AuthenticatedUser } from '../decorators/current-user.decorator.js';

interface AccessTokenPayload {
  sub: string;
  email?: string;
  sessionId: string;
  tokenVersion: number;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtTokenService: JwtTokenService,
    private readonly usersRepository: UsersRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly authRepository: AuthRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppException({
        code: 'INVALID_ACCESS_TOKEN',
        message: 'Access token is required.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    const accessToken = authHeader.slice('Bearer '.length).trim();

    if (!accessToken) {
      throw new AppException({
        code: 'INVALID_ACCESS_TOKEN',
        message: 'Access token is required.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    // 1. Verify only the JWT inside this try/catch.
    let payload: AccessTokenPayload;

    try {
      payload =
        await this.jwtTokenService.verifyAccessToken<AccessTokenPayload>(
          accessToken,
        );
    } catch {
      throw new AppException({
        code: 'INVALID_ACCESS_TOKEN',
        message: 'Invalid or expired access token.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    // 2. Validate the token payload.
    if (
      typeof payload.sub !== 'string' ||
      payload.sub.length === 0 ||
      typeof payload.sessionId !== 'string' ||
      payload.sessionId.length === 0 ||
      !Number.isSafeInteger(payload.tokenVersion) ||
      payload.tokenVersion < 0
    ) {
      throw new AppException({
        code: 'INVALID_ACCESS_TOKEN',
        message: 'Invalid access token payload.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    // 3. Check the user account.
    const user = await this.usersRepository.findByIdWithAuth(payload.sub);

    if (!user || !user.auth || user.status !== 'ACTIVE') {
      throw new AppException({
        code: 'INVALID_ACCESS_TOKEN',
        message: 'Account is not active.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    // 4. Check token version and account lock.
    const currentTokenVersion = await this.authRepository.getTokenVersion(
      user.id,
    );

    if (
      currentTokenVersion !== payload.tokenVersion ||
      (user.auth.lockedUntil !== null && user.auth.lockedUntil > new Date())
    ) {
      throw new AppException({
        code: 'INVALID_ACCESS_TOKEN',
        message: 'Access token is no longer valid.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    // 5. Reject only when the session is missing or inactive.
    const session = await this.sessionRepository.findActiveSession(
      payload.sessionId,
      user.id,
    );

    if (!session) {
      throw new AppException({
        code: 'INVALID_ACCESS_TOKEN',
        message: 'Session is no longer active.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    // 6. Attach authenticated user to the request.
    request.user = {
      userId: user.id,
      email: user.email,
      name: user.name,
      sessionId: session.id,
      tokenVersion: payload.tokenVersion,
      avatar: user.avatar
        ? {
            id: user.avatar.id,
            fileId: user.avatar.fileId,
            name: user.avatar.name,
            path: user.avatar.path,
          }
        : null,
    };

    return true;
  }
}
