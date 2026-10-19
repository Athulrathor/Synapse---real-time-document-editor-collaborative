import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, DocumentStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { PrismaTransaction } from '../../database/prisma.service.js';
import { UUID } from 'crypto';
import { AppException } from '../../common/exceptions/app.exception.js';
import { RedisService } from '../../common/redis/redis.service.js';
import {
  createDocumentSnapshot,
  parseDocumentSnapshot,
} from '../utils/document-snapshot.util.js';
import { Bytes } from '@prisma/client/runtime/client';
import { OutboxRepository } from '../../jobs/outbox/outbox.repository.js';

@Injectable()
export class DocumentsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly outboxRepository: OutboxRepository,
  ) {}

  private async invalidateWorkspaceDocumentCaches(
    workspaceId: UUID,
  ): Promise<void> {
    // Invalidate workspace document-list, pagination, and tree caches.
    await this.redisService.invalidateTrackedCache(
      `workspace:${workspaceId}:cache-keys`,
    );

    // Invalidate search caches for current workspace members.
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { userId: true },
    });

    await Promise.all(
      members.map(({ userId }) =>
        this.redisService.invalidateTrackedCache(
          `user:${userId}:document-search:cache-keys`,
        ),
      ),
    );

    // Invalidate cached details for every document in this workspace.
    const documents = await this.prisma.document.findMany({
      where: { workspaceId },
      select: { id: true },
    });

    await Promise.all(
      documents.map(({ id }) =>
        this.redisService.invalidateTrackedCache(`document:${id}:cache-keys`),
      ),
    );
  }

  async findByWorkspace(workspaceId: UUID) {
    const cacheKey = `workspace:${workspaceId}:documents`;

    return this.redisService.remember(
      cacheKey,
      60,
      async () => {
        return this.prisma.document.findMany({
          where: {
            workspaceId,
            status: 'ACTIVE',
          },
          select: {
            id: true,
            workspaceId: true,
            title: true,
            status: true,
            createdById: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        });
      },
      `workspace:${workspaceId}:cache-keys`,
    );
  }

  async findByDocument(documentId: UUID) {
    const cacheKey = `document:${documentId}:details`;

    return this.redisService.remember(
      cacheKey,
      60,
      async () => {
        return this.prisma.document.findFirst({
          where: {
            id: documentId,
            status: DocumentStatus.ACTIVE,
          },
          select: {
            id: true,
            workspaceId: true,
            title: true,
            content: true,
            status: true,
            createdById: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      },
      `document:${documentId}:cache-keys`,
    );
  }

  async findDocumentWorkspace(documentId: UUID) {
    return this.prisma.document.findFirst({
      where: {
        id: documentId,
        status: {
          in: [DocumentStatus.ACTIVE, DocumentStatus.ARCHIVED],
        },
      },
      select: {
        id: true,
        workspaceId: true,
        status: true,
      },
    });
  }

  async getTree(workspaceId: UUID) {
    const cacheKey = `workspace:${workspaceId}:documents:tree`;

    return this.redisService.remember(
      cacheKey,
      60,
      async () => {
        return this.prisma.document.findMany({
          where: {
            workspaceId,
            status: DocumentStatus.ACTIVE,
          },
          select: {
            id: true,
            workspaceId: true,
            status: true,
            content: true,
            title: true,
            createdById: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        });
      },
      `workspace:${workspaceId}:cache-keys`,
    );
  }

  async search(userId: UUID, q: string) {
    const cacheKey = `documents:search:user:${userId}:q:${encodeURIComponent(q.toLowerCase())}`;

    return this.redisService.remember(
      cacheKey,
      60,
      async () => {
        await this.prisma.document.findMany({
          where: {
            status: DocumentStatus.ACTIVE,
            title: {
              contains: q,
              mode: 'insensitive',
            },
            workspace: {
              members: {
                some: {
                  userId,
                },
              },
            },
          },
          select: {
            id: true,
            title: true,
            workspaceId: true,
            content: true,
            status: true,
            createdById: true,
            updatedAt: true,
          },
          orderBy: {
            updatedAt: 'desc',
          },
          take: 20,
        });
      },
      `user:${userId}:document-search:cache-keys`,
    );
  }

  async findWorkspaceDocuments(workspaceId: UUID, page: number, limit: number) {
    const cached = `workspace:${workspaceId}:documents:page:${page}:limit:${limit}`;

    return this.redisService.remember(
      cached,
      60,
      async () => {
        const where = {
          workspaceId,
          status: DocumentStatus.ACTIVE,
        };

        const [items, total] = await this.prisma.$transaction([
          this.prisma.document.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            select: {
              id: true,
              workspaceId: true,
              title: true,
              status: true,
              createdById: true,
              createdAt: true,
              updatedAt: true,
            },
          }),
          this.prisma.document.count({ where }),
        ]);

        return {
          items,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        };
      },
      `workspace:${workspaceId}:cache-keys`,
    );
  }

  async createDocument(
    workspaceId: UUID,
    userId: UUID,
    data: {
      title?: string;
      content?: Prisma.InputJsonValue;
    },
  ) {
    const doc = await this.prisma.$transaction(
      async (tx: PrismaTransaction) => {
        const doc = await tx.document.create({
          data: {
            workspaceId,
            createdById: userId,
            title: data.title?.trim() || 'Untitled document',
            ...(data.content !== undefined && { content: data.content }),
          },
          select: {
            id: true,
            workspaceId: true,
            title: true,
            content: true,
            status: true,
            createdById: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        const snapshot: Bytes = Uint8Array.from(
          createDocumentSnapshot({
            title: doc.title,
            content: doc.content,
          }),
        );

        await tx.version.create({
          data: {
            documentId: doc.id,
            versionNumber: 1,
            snapshot,
            createdById: userId,
            message: 'Initial version',
          },
        });

        //   await tx.auditLog.create({
        //     data: {
        //       workspaceId: dto.workspaceId,
        //       documentId: document.id,
        //       actorId: userId,
        //       action: AuditActions.DOCUMENT_CREATED,
        //       metadata: {
        //         title: document.title,
        //       },
        //     },
        //   });

        await this.outboxRepository.create(
          {
            eventType: 'DOCUMENT_CREATED',
            aggregateId: doc.id,
            payload: {
              documentId: doc.id,
              workspaceId: doc.workspaceId,
              createdById: doc.createdById,
              title: doc.title,
            },
          },
          tx,
        );

        return doc;
      },
    );

    await this.invalidateWorkspaceDocumentCaches(workspaceId);

    return doc;
  }

  async update(
    documentId: UUID,
    data: { title?: string; content?: Prisma.InputJsonValue },
  ) {
    try {
      const document = await this.prisma.$transaction(
        async (tx: PrismaTransaction) => {
          await tx.$queryRaw`
            SELECT id
            FROM "Document"
            WHERE id = ${documentId}
            FOR UPDATE
          `;

          const existingDocument = await tx.document.findFirst({
            where: { id: documentId, status: DocumentStatus.ACTIVE },
            select: {
              id: true,
              workspaceId: true,
              title: true,
              content: true,
              createdById: true,
              createdAt: true,
              updatedAt: true,
            },
          });

          if (!existingDocument) {
            throw new AppException({
              code: 'DOCUMENT_NOT_FOUND',
              message: 'Document not found.',
              status: HttpStatus.NOT_FOUND,
            });
          }

          const nextTitle =
            data.title !== undefined
              ? data.title.trim()
              : existingDocument.title;

          const nextContent =
            data.content !== undefined
              ? data.content
              : existingDocument.content;

          const titleChanged = nextTitle !== existingDocument.title;

          const contentChanged =
            data.content !== undefined &&
            JSON.stringify(data.content) !==
              JSON.stringify(existingDocument.content);

          const hasChanges = titleChanged || contentChanged;

          if (!hasChanges) {
            return { ...existingDocument, status: DocumentStatus.ACTIVE };
          }

          const updatedDocument = await tx.document.update({
            where: { id: documentId },
            data: {
              title: nextTitle,
              ...(data.content !== undefined && { content: data.content }),
            },
            select: {
              id: true,
              workspaceId: true,
              title: true,
              content: true,
              status: true,
              createdById: true,
              createdAt: true,
              updatedAt: true,
            },
          });

          const latestVersion = await tx.version.findFirst({
            where: { documentId },
            orderBy: { versionNumber: 'desc' },
            select: { versionNumber: true },
          });

          const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

          const snapshot: Bytes = Uint8Array.from(
            createDocumentSnapshot({
              title: updatedDocument.title,
              content: updatedDocument.content,
            }),
          );

          await tx.version.create({
            data: {
              documentId,
              versionNumber: nextVersionNumber,
              snapshot,
              createdById: updatedDocument.createdById,
              message: 'Document updated',
            },
          });
          return updatedDocument;
        },
      );

      await this.invalidateWorkspaceDocumentCaches(
        document.workspaceId as UUID,
      );

      return document;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new AppException({
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found.',
          status: HttpStatus.NOT_FOUND,
        });
      }
      throw error;
    }
  }

  async archiveDocument(documentId: UUID) {
    try {
      const doc = await this.prisma.document.update({
        where: {
          id: documentId,
          status: DocumentStatus.ACTIVE,
        },
        data: {
          status: DocumentStatus.ARCHIVED,
        },
      });

      await this.invalidateWorkspaceDocumentCaches(doc.workspaceId as UUID);

      return doc;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new AppException({
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found.',
          status: HttpStatus.NOT_FOUND,
        });
      }

      throw error;
    }
  }

  findArchivedDocument(documentId: UUID) {
    return this.prisma.document.findFirst({
      where: {
        id: documentId,
        status: DocumentStatus.ARCHIVED,
      },
      select: {
        id: true,
        workspaceId: true,
        title: true,
        status: true,
        createdById: true,
      },
    });
  }

  async restoreDocument(documentId: UUID) {
    try {
      const doc = await this.prisma.document.update({
        where: {
          id: documentId,
          status: DocumentStatus.ARCHIVED,
        },
        data: {
          status: DocumentStatus.ACTIVE,
        },
      });

      await this.invalidateWorkspaceDocumentCaches(doc.workspaceId as UUID);

      return doc;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new AppException({
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found.',
          status: HttpStatus.NOT_FOUND,
        });
      }

      throw error;
    }
  }

  async softDeleteDocument(documentId: UUID) {
    try {
      const doc = await this.prisma.document.update({
        where: {
          id: documentId,
          status: DocumentStatus.ACTIVE,
        },
        data: {
          status: DocumentStatus.DELETED,
        },
      });

      await this.invalidateWorkspaceDocumentCaches(doc.workspaceId as UUID);

      return doc;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new AppException({
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found.',
          status: HttpStatus.NOT_FOUND,
        });
      }

      throw error;
    }
  }

  async findVersions(documentId: UUID) {
    const cacheKey = `document:${documentId}:versions`;
    const trackingKey = `document:${documentId}:cache-keys`;

    return this.redisService.remember(
      cacheKey,
      60,
      () =>
        this.prisma.version.findMany({
          where: {
            documentId,
          },
          select: {
            id: true,
            documentId: true,
            versionNumber: true,
            message: true,
            createdById: true,
            createdAt: true,
            creator: {
              select: {
                id: true,
                name: true,
                avatar: {
                  select: {
                    path: true,
                  },
                },
              },
            },
          },
          orderBy: {
            versionNumber: 'desc',
          },
        }),
      trackingKey,
    );
  }

  async restoreVersion(documentId: UUID, versionNumber: number, userId: UUID) {
    try {
      const document = await this.prisma.$transaction(
        async (tx: PrismaTransaction) => {
          // Serialize changes to this document.
          await tx.$queryRaw`
          SELECT id
          FROM "Document"
          WHERE id = ${documentId}
          FOR UPDATE
        `;

          const currentDocument = await tx.document.findFirst({
            where: {
              id: documentId,
              status: DocumentStatus.ACTIVE,
            },
            select: {
              id: true,
              workspaceId: true,
              title: true,
              content: true,
              createdById: true,
            },
          });

          if (!currentDocument) {
            throw new AppException({
              code: 'DOCUMENT_NOT_FOUND',
              message: 'Document not found.',
              status: HttpStatus.NOT_FOUND,
            });
          }

          const requestedVersion = await tx.version.findUnique({
            where: {
              documentId_versionNumber: {
                documentId,
                versionNumber,
              },
            },
            select: {
              snapshot: true,
            },
          });

          if (!requestedVersion) {
            throw new AppException({
              code: 'DOCUMENT_VERSION_NOT_FOUND',
              message: 'Document version not found.',
              status: HttpStatus.NOT_FOUND,
            });
          }

          const snapshot = parseDocumentSnapshot(requestedVersion.snapshot);

          const updatedDocument = await tx.document.update({
            where: {
              id: documentId,
            },
            data: {
              title: snapshot.title,
              content:
                snapshot.content === null
                  ? Prisma.DbNull
                  : (snapshot.content as Prisma.InputJsonValue),
            },
            select: {
              id: true,
              workspaceId: true,
              title: true,
              content: true,
              status: true,
              createdById: true,
              createdAt: true,
              updatedAt: true,
            },
          });

          const latestVersion = await tx.version.findFirst({
            where: { documentId },
            orderBy: { versionNumber: 'desc' },
            select: { versionNumber: true },
          });

          const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

          const newSnapshot: Bytes = Uint8Array.from(
            createDocumentSnapshot({
              title: updatedDocument.title,
              content: updatedDocument.content,
            }),
          );

          await tx.version.create({
            data: {
              documentId,
              versionNumber: nextVersionNumber,
              snapshot: newSnapshot,
              createdById: userId,
              message: `Restored version V${versionNumber}`,
            },
          });

          return updatedDocument;
        },
      );

      await this.invalidateWorkspaceDocumentCaches(
        document.workspaceId as UUID,
      );

      return document;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new AppException({
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found.',
          status: HttpStatus.NOT_FOUND,
        });
      }

      throw error;
    }
  }
}
