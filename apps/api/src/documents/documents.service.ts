import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentsRepository } from './repository/document.repository.js';
import { WorkspacesRepository } from '../workspaces/repository/workspace.repository.js';
import { UUID } from 'crypto';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { AppException } from '../common/exceptions/app.exception.js';
import { Prisma, WorkspaceRole } from '@prisma/client';
import { UpdateDocumentDto } from './dto/update-document.dto.js';

const DOCUMENT_NOT_FOUND = {
  code: 'DOCUMENT_NOT_FOUND',
  message: 'Document not found.',
  status: HttpStatus.NOT_FOUND,
} as const;

const WORKSPACE_NOT_FOUND = {
  code: 'WORKSPACE_NOT_FOUND',
  message: 'Workspace not found.',
  status: HttpStatus.NOT_FOUND,
} as const;

const INSUFFICIENT_PERMISSIONS = {
  code: 'INSUFFICIENT_WORKSPACE_PERMISSIONS',
  message: 'You do not have permission to perform this action.',
  status: HttpStatus.FORBIDDEN,
} as const;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly documentsRepository: DocumentsRepository,
    private readonly workspacesRepository: WorkspacesRepository,
  ) {}

  private assertCanEdit(role: WorkspaceRole) {
    if (
      role !== WorkspaceRole.OWNER &&
      role !== WorkspaceRole.ADMIN &&
      role !== WorkspaceRole.EDITOR
    ) {
      throw new AppException(INSUFFICIENT_PERMISSIONS);
    }
  }

  private assertCanManage(role: WorkspaceRole) {
    if (role !== WorkspaceRole.OWNER && role !== WorkspaceRole.ADMIN) {
      throw new AppException(INSUFFICIENT_PERMISSIONS);
    }
  }

  async assertCanEditDocument(documentId: UUID, userId: UUID): Promise<void> {
    const document = await this.documentsRepository.findByDocument(documentId);

    if (!document) {
      throw new AppException(DOCUMENT_NOT_FOUND);
    }

    const membership = await this.workspacesRepository.findMembership(
      document.workspaceId,
      userId,
    );

    if (!membership) {
      throw new AppException(DOCUMENT_NOT_FOUND);
    }

    this.assertCanEdit(membership.role);
  }

  async create(workspaceId: UUID, userId: UUID, dto: CreateDocumentDto) {
    const membership = await this.workspacesRepository.findMembership(
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new AppException(WORKSPACE_NOT_FOUND);
    }

    this.assertCanEdit(membership.role);

    return await this.documentsRepository.createDocument(workspaceId, userId, {
      title: dto.title,
      ...(dto.content !== undefined && {
        content: dto.content as Prisma.InputJsonValue,
      }),
    });
  }

  async findByWorkspaceId(workspaceId: UUID, userId: UUID) {
    const membership = await this.workspacesRepository.findMembership(
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new AppException(WORKSPACE_NOT_FOUND);
    }

    return await this.documentsRepository.findByWorkspace(workspaceId);
  }

  async findByDocumentId(documentId: UUID, userId: UUID) {
    const document = await this.documentsRepository.findByDocument(documentId);

    if (!document) {
      throw new AppException(DOCUMENT_NOT_FOUND);
    }

    const membership = await this.workspacesRepository.findMembership(
      document.workspaceId,
      userId,
    );

    if (!membership) {
      throw new AppException(DOCUMENT_NOT_FOUND);
    }

    // Record the view after confirming document access.
    await this.documentsRepository.recordView(userId, documentId);

    return document;
  }

  async getContentForCollaboration(documentId: UUID, userId: UUID) {
    const document = await this.documentsRepository.findByDocument(documentId);

    if (!document) {
      throw new AppException(DOCUMENT_NOT_FOUND);
    }

    const membership = await this.workspacesRepository.findMembership(
      document.workspaceId,
      userId,
    );

    if (!membership) {
      throw new AppException(DOCUMENT_NOT_FOUND);
    }

    const content = document.content;

    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      return null;
    }

    const contentRecord = content as Record<string, unknown>;
    const nested =
      contentRecord.text &&
      typeof contentRecord.text === 'object' &&
      !Array.isArray(contentRecord.text)
        ? (contentRecord.text as Record<string, unknown>)
        : null;

    const richText = contentRecord.richText ?? nested?.richText;

    if (richText && typeof richText === 'object' && !Array.isArray(richText)) {
      return richText;
    }

    return null;
  }

  async update(documentId: UUID, userId: UUID, dto: UpdateDocumentDto) {
    const document = await this.documentsRepository.findByDocument(documentId);

    if (!document) {
      throw new AppException(DOCUMENT_NOT_FOUND);
    }

    const membership = await this.workspacesRepository.findMembership(
      document.workspaceId,
      userId,
    );

    if (!membership) {
      throw new AppException(DOCUMENT_NOT_FOUND);
    }

    this.assertCanEdit(membership.role);

    return await this.documentsRepository.update(documentId,userId, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.content !== undefined && {
        content: dto.content as Prisma.InputJsonValue,
      }),
    });
  }

  async findVersions(documentId: UUID, userId: UUID) {
    const document = await this.documentsRepository.findByDocument(documentId);

    if (!document) {
      throw new AppException({
        code: 'DOCUMENT_NOT_FOUND',
        message: 'Document not found.',
        status: HttpStatus.NOT_FOUND,
      });
    }

    const membership = await this.workspacesRepository.findMembership(
      document.workspaceId,
      userId,
    );

    if (!membership) {
      throw new AppException({
        code: 'DOCUMENT_NOT_FOUND',
        message: 'Document not found.',
        status: HttpStatus.NOT_FOUND,
      });
    }

    return this.documentsRepository.findVersions(documentId);
  }

  async restoreVersion(documentId: UUID, versionNumber: number, userId: UUID) {
    const document = await this.documentsRepository.findByDocument(documentId);

    if (!document) {
      throw new AppException(DOCUMENT_NOT_FOUND);
    }

    const membership = await this.workspacesRepository.findMembership(
      document.workspaceId,
      userId,
    );

    if (!membership) {
      throw new AppException(DOCUMENT_NOT_FOUND);
    }

    this.assertCanEdit(membership.role);

    return this.documentsRepository.restoreVersion(
      documentId,
      versionNumber,
      userId,
    );
  }

  async archiveDocument(documentId: UUID, userId: UUID) {
    const document = await this.documentsRepository.findByDocument(documentId);

    if (!document) {
      throw new AppException(DOCUMENT_NOT_FOUND);
    }

    const membership = await this.workspacesRepository.findMembership(
      document.workspaceId,
      userId,
    );

    if (!membership) {
      throw new AppException(DOCUMENT_NOT_FOUND);
    }

    this.assertCanManage(membership.role);

    return this.documentsRepository.archiveDocument(documentId,userId);
  }

  async restore(documentId: UUID, userId: UUID) {
    const document =
      await this.documentsRepository.findArchivedDocument(documentId);

    if (!document) {
      throw new AppException(DOCUMENT_NOT_FOUND);
    }

    const membership = await this.workspacesRepository.findMembership(
      document.workspaceId,
      userId,
    );

    if (!membership) {
      throw new AppException(DOCUMENT_NOT_FOUND);
    }

    this.assertCanManage(membership.role);

    return this.documentsRepository.restoreDocument(documentId,userId);
  }

  async remove(documentId: UUID, userId: UUID) {
    const document = await this.documentsRepository.findByDocument(documentId);

    if (!document) {
      throw new AppException(DOCUMENT_NOT_FOUND);
    }

    const membership = await this.workspacesRepository.findMembership(
      document.workspaceId,
      userId,
    );

    if (!membership) {
      throw new AppException(DOCUMENT_NOT_FOUND);
    }

    this.assertCanManage(membership.role);

    return this.documentsRepository.softDeleteDocument(documentId,userId);
  }

  async findWorkspaceDocuments(
    workspaceId: UUID,
    userId: UUID,
    page: number,
    limit: number,
  ) {
    const membership = await this.workspacesRepository.findMembership(
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new AppException(WORKSPACE_NOT_FOUND);
    }

    return this.documentsRepository.findWorkspaceDocuments(
      workspaceId,
      page,
      limit,
    );
  }

  async search(userId: UUID, q: string) {
    if (!q.trim()) {
      return [];
    }

    return this.documentsRepository.search(userId, q.trim());
  }

  async recordDocumentView(userId: UUID, documentId: UUID) {
    return this.documentsRepository.recordView(userId, documentId);
  }

  async findRecentlyViewed(userId: UUID) {
    return this.documentsRepository.findRecent(userId, 20);
  }

  async starDocument(userId: UUID, documentId: UUID) {
    await this.ensureDocumentAccess(documentId, userId);

    return this.documentsRepository.star(userId, documentId);
  }

  async unstarDocument(userId: UUID, documentId: UUID) {
    await this.ensureDocumentAccess(documentId, userId);

    return this.documentsRepository.unstar(userId, documentId);
  }

  async findStarredDocuments(userId: UUID) {
    return this.documentsRepository.findStarred(userId);
  }

  async findDeletedDocuments(userId: UUID) {
    return this.documentsRepository.findDeletedDocuments(userId);
  }

  async permanentlyDeleteDocument(documentId: UUID, userId: UUID) {
    const document =
      await this.documentsRepository.findDeletedDocument(documentId);

    if (!document) {
      throw new NotFoundException('Document not found in trash.');
    }

    const membership = await this.workspacesRepository.findMembership(
      document.workspaceId,
      userId,
    );

    if (!membership) {
      throw new NotFoundException('Document not found in trash.');
    }

    this.assertCanManage(membership.role);

    return this.documentsRepository.permanentlyDeleteDocument(documentId,userId);
  }

  async restoreDeletedDocument(documentId: UUID, userId: UUID) {
    const document =
      await this.documentsRepository.findDeletedDocument(documentId);

    if (!document) {
      throw new NotFoundException('Document not found in trash.');
    }

    const membership = await this.workspacesRepository.findMembership(
      document.workspaceId,
      userId,
    );

    if (!membership) {
      throw new NotFoundException('Document not found in trash.');
    }

    this.assertCanManage(membership.role);

    return this.documentsRepository.restoreDeletedDocument(documentId,userId);
  }

  async isDocumentStarred(userId: UUID, documentId: UUID) {
    await this.ensureDocumentAccess(documentId, userId);

    return this.documentsRepository.isStarred(userId, documentId);
  }

  private async ensureDocumentAccess(documentId: UUID, userId: UUID) {
    const document = await this.documentsRepository.findByDocument(documentId);

    if (!document) {
      throw new AppException(DOCUMENT_NOT_FOUND);
    }

    const membership = await this.workspacesRepository.findMembership(
      document.workspaceId,
      userId,
    );

    if (!membership) {
      throw new AppException(DOCUMENT_NOT_FOUND);
    }

    return document;
  }
}
