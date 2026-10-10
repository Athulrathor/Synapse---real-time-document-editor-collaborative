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

interface AccessTokenPayload {
  sub: string;
  email?: string;
  sessionId: string;
  tokenVersion: number;
}

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email?: string;
    sessionId: string;
    tokenVersion: number;
  };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtTokenService: JwtTokenService,
    private readonly usersRepository: UsersRepository,
    private readonly sessionRepository: SessionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppException({
        code: 'Invalid_Access_Token',
        message: 'Access token is required.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    const accessToken = authHeader.slice('Bearer '.length).trim();

    if (!accessToken) {
      throw new AppException({
        code: 'Invalid_Access_Token',
        message: 'Access token is required.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    try {
      const payload =
        await this.jwtTokenService.verifyAccessToken<AccessTokenPayload>(
          accessToken,
        );

      if (
        typeof payload.sub !== 'string' ||
        payload.sub.length === 0 ||
        !Number.isSafeInteger(payload.tokenVersion) ||
        payload.tokenVersion < 0
      ) {
        throw new AppException({
          code: 'Invalid_Access_Token',
          message: 'Invalid access token.',
          status: HttpStatus.UNAUTHORIZED,
        });
      }

      const user = await this.usersRepository.findByIdWithAuth(payload.sub);

      if (!user || !user.auth || user.status !== 'ACTIVE') {
        throw new AppException({
          code: 'Invalid_Access_Token',
          message: 'Account is not active.',
          status: HttpStatus.UNAUTHORIZED,
        });
      }

      if (
        user.auth.tokenVersion !== payload.tokenVersion ||
        (user.auth.lockedUntil !== null && user.auth.lockedUntil > new Date())
      ) {
        throw new AppException({
          code: 'Invalid_Access_Token',
          message: 'Access token is no longer valid.',
          status: HttpStatus.UNAUTHORIZED,
        });
      }

      const session = await this.sessionRepository.findActiveSession(
        payload.sessionId,
        payload.sub,
      );

      if (!session) {
        throw new AppException({
          code: 'Invalid_Access_Token',
          message: 'Session is no longer valid.',
          status: HttpStatus.UNAUTHORIZED,
        });
      }

      request.user = {
        userId: payload.sub,
        email: payload.email,
        sessionId: payload.sessionId,
        tokenVersion: payload.tokenVersion,
      };

      return true;
    } catch {
      throw new AppException({
        code: 'Invalid_Access_Token',
        message: 'Invalid or expired access token.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }
  }
}
