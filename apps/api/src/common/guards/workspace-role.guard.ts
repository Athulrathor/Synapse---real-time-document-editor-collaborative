import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceRole } from '@prisma/client';
import { isUUID } from 'class-validator';

import { ROLES_KEY } from '../decorators/role.decorator.js';
import { WorkspacesRepository } from '../../workspaces/repository/workspace.repository.js';
import { AppException } from '../exceptions/app.exception.js';
import { UUID } from 'crypto';

interface AuthenticatedRequest {
  user?: {
    userId: UUID;
    email?: string;
  };
  params: {
    workspaceId?: UUID;
  };
}

@Injectable()
export class WorkspaceRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly workspacesRepository: WorkspacesRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No role metadata means this guard has no role restriction to enforce.
    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const userId = request.user?.userId;
    const workspaceId = request.params?.workspaceId;

    if (!userId) {
      throw new AppException({
        code: 'UNAUTHENTICATED',
        message: 'Authentication is required.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    if (!workspaceId || !isUUID(workspaceId)) {
      throw new AppException({
        code: 'INVALID_WORKSPACE_ID',
        message: 'Workspace ID must be a valid UUID.',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const membership = await this.workspacesRepository.findMembership(
      workspaceId,
      userId,
    );

    // Avoid revealing whether a workspace exists to non-members.
    if (!membership) {
      throw new AppException({
        code: 'WORKSPACE_NOT_FOUND',
        message: 'Workspace not found.',
        status: HttpStatus.NOT_FOUND,
      });
    }

    if (!requiredRoles.includes(membership.role)) {
      throw new AppException({
        code: 'INSUFFICIENT_WORKSPACE_PERMISSIONS',
        message: 'You do not have permission to perform this action.',
        status: HttpStatus.FORBIDDEN,
      });
    }

    return true;
  }
}
