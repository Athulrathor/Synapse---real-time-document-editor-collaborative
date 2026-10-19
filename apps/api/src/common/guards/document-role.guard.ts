import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceRole } from '@prisma/client';
import { isUUID } from 'class-validator';
import { UUID } from 'crypto';

import { ROLES_KEY } from '../decorators/role.decorator.js';
import { WorkspacesRepository } from '../../workspaces/repository/workspace.repository.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { DocumentsRepository } from '../../documents/repository/document.repository.js';

interface AuthenticatedRequest {
  user?: {
    userId: UUID;
  };
  params: {
    documentId?: string;
  };
}

@Injectable()
export class DocumentRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly documentsRepository: DocumentsRepository,
    private readonly workspacesRepository: WorkspacesRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<
      WorkspaceRole[]
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const userId = request.user?.userId;
    const documentId = request.params?.documentId;

    if (!userId) {
      throw new AppException({
        code: 'UNAUTHENTICATED',
        message: 'Authentication is required.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    if (!documentId || !isUUID(documentId)) {
      throw new AppException({
        code: 'INVALID_DOCUMENT_ID',
        message: 'Document ID must be a valid UUID.',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const document =
      await this.documentsRepository.findDocumentWorkspace(
        documentId as UUID,
      );

    if (!document) {
      throw new AppException({
        code: 'DOCUMENT_NOT_FOUND',
        message: 'Document not found.',
        status: HttpStatus.NOT_FOUND,
      });
    }

    const membership =
      await this.workspacesRepository.findMembership(
        document.workspaceId,
        userId,
      );

    // Do not reveal a document's existence to non-members.
    if (!membership) {
      throw new AppException({
        code: 'DOCUMENT_NOT_FOUND',
        message: 'Document not found.',
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