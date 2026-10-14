
import {
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

import { type Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  email?: string;
  tokenVersion: number;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new Error(
        'CurrentUser requires an authenticated request.',
      );
    }

    return request.user;
  },
);