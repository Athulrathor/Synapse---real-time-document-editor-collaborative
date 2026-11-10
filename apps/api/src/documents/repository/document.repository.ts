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
import { YjsPersistenceService } from '../../collaboration/yjs/yjs-persistence.service.js';

@Injectable()
export class DocumentsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly outboxRepository: OutboxRepository,
    private readonly yjsPersistenceService: YjsPersistenceService,
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
            workspace: {
              select: {
                id: true,
                name: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: {
                  select: {
                    path: true,
                    id: true,
                    fileId: true,
                  },
                },
              },
            },
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
        return await this.prisma.document.findMany({
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

        const snapshot: Bytes = new TextEncoder().encode(
          JSON.stringify(
            createDocumentSnapshot({
              title: doc.title,
              content: (doc.content ?? {
                text: { text: '', richText: {} },
              }) as Parameters<typeof createDocumentSnapshot>[0]['content'],
            }),
          ),
        );

        const version = await tx.version.create({
          data: {
            documentId: doc.id,
            versionNumber: 1,
            snapshot,
            createdById: userId,
            message: 'Initial version',
          },
          select: {
            id: true,
            versionNumber: true,
          },
        });

        await tx.activity.create({
          data: {
            type: 'DOCUMENT_CREATED',
            actorId: userId,
            workspaceId,
            documentId: doc.id,
            versionId: version.id,
            metadata: {
              documentTitle: doc.title,
              versionNumber: version.versionNumber,
              versionMessage: 'Initial version',
            },
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
    userId: UUID,
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

          const snapshot: Bytes = new TextEncoder().encode(
            JSON.stringify(
              createDocumentSnapshot({
                title: updatedDocument.title,
                content: (updatedDocument.content ?? {
                  text: { text: '', richText: {} },
                }) as Parameters<typeof createDocumentSnapshot>[0]['content'],
              }),
            ),
          );

          const version = await tx.version.create({
            data: {
              documentId,
              versionNumber: nextVersionNumber,
              snapshot,
              createdById: userId,
              message: 'Document updated',
            },
            select: {
              id: true,
              versionNumber: true,
            },
          });

          await tx.activity.create({
            data: {
              type: 'DOCUMENT_UPDATED',
              actorId: userId,
              workspaceId: updatedDocument.workspaceId,
              documentId: updatedDocument.id,
              versionId: version.id,
              metadata: {
                documentTitle: updatedDocument.title,
                versionNumber: version.versionNumber,
                versionMessage: 'Document updated',
              },
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

  async archiveDocument(documentId: UUID, userId: UUID) {
    try {
      const doc = await this.prisma.$transaction(
        async (tx: PrismaTransaction) => {
          const updatedDocument = await tx.document.update({
            where: {
              id: documentId,
              status: DocumentStatus.ACTIVE,
            },
            data: {
              status: DocumentStatus.ARCHIVED,
            },
          });

          await tx.activity.create({
            data: {
              type: 'DOCUMENT_ARCHIVED',
              actorId: userId,
              workspaceId: updatedDocument.workspaceId,
              documentId: updatedDocument.id,
              metadata: {
                documentTitle: updatedDocument.title,
              },
            },
          });

          return updatedDocument;
        },
      );

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

  async restoreDocument(documentId: UUID, userId: UUID) {
    try {
      const doc = await this.prisma.$transaction(
        async (tx: PrismaTransaction) => {
          const updatedDocument = await tx.document.update({
            where: {
              id: documentId,
              status: DocumentStatus.ARCHIVED,
            },
            data: {
              status: DocumentStatus.ACTIVE,
            },
          });

          await tx.activity.create({
            data: {
              type: 'DOCUMENT_RESTORED',
              actorId: userId,
              workspaceId: updatedDocument.workspaceId,
              documentId: updatedDocument.id,
              metadata: {
                documentTitle: updatedDocument.title,
                source: 'ARCHIVE',
              },
            },
          });

          return updatedDocument;
        },
      );

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

  async softDeleteDocument(documentId: UUID, userId: UUID) {
    try {
      const doc = await this.prisma.$transaction(
        async (tx: PrismaTransaction) => {
          const updatedDocument = await tx.document.update({
            where: {
              id: documentId,
              status: DocumentStatus.ACTIVE,
            },
            data: {
              status: DocumentStatus.DELETED,
              deletedAt: new Date(),
            },
          });

          await tx.activity.create({
            data: {
              type: 'DOCUMENT_DELETED',
              actorId: userId,
              workspaceId: updatedDocument.workspaceId,
              documentId: updatedDocument.id,
              metadata: {
                documentTitle: updatedDocument.title,
                source: 'TRASH',
              },
            },
          });

          return updatedDocument;
        },
      );

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
              code: 'NOT_FOUND',
              message: 'version not found!',
              status: HttpStatus.NOT_FOUND,
            });
          }

          const snapshot = parseDocumentSnapshot(requestedVersion.snapshot);

          const snapshotBytes = Buffer.from(JSON.stringify(snapshot), 'utf8');

          if (!requestedVersion) {
            throw new AppException({
              code: 'DOCUMENT_VERSION_NOT_FOUND',
              message: 'Document version not found.',
              status: HttpStatus.NOT_FOUND,
            });
          }

          const richText =
            snapshot.content === null
              ? { type: 'doc', content: [] }
              : (
                  snapshot.content as {
                    text?: {
                      richText?: Record<string, unknown>;
                    };
                  }
                ).text?.richText;

          if (
            !richText ||
            typeof richText !== 'object' ||
            richText.type !== 'doc'
          ) {
            throw new AppException({
              code: 'INVALID_DOCUMENT_SNAPSHOT',
              message:
                'The requested version contains invalid document content.',
              status: HttpStatus.INTERNAL_SERVER_ERROR,
            });
          }

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

          await this.yjsPersistenceService.replaceDocumentState(
            tx,
            documentId,
            richText,
          );

          const latestVersion = await tx.version.findFirst({
            where: { documentId },
            orderBy: { versionNumber: 'desc' },
            select: { versionNumber: true },
          });

          const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

          const newSnapshot: Bytes = Buffer.from(
            JSON.stringify(
              createDocumentSnapshot({
                title: updatedDocument.title,
                content: updatedDocument.content as {
                  text: {
                    text: string;
                    richText: Record<string, unknown>;
                  };
                },
              }),
            ),
            'utf8',
          );

          const version = await tx.version.create({
            data: {
              documentId,
              versionNumber: nextVersionNumber,
              snapshot: newSnapshot,
              createdById: userId,
              message: `Restored version V${versionNumber}`,
            },
            select: {
              id: true,
              versionNumber: true,
            },
          });

          await tx.activity.create({
            data: {
              type: 'VERSION_RESTORED',
              actorId: userId,
              workspaceId: updatedDocument.workspaceId,
              documentId: updatedDocument.id,
              versionId: version.id,
              metadata: {
                documentTitle: updatedDocument.title,
                versionNumber: version.versionNumber,
                restoredFromVersion: versionNumber,
                versionMessage: `Restored version V${versionNumber}`,
              },
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

  async recordView(userId: UUID, documentId: UUID) {
    return this.prisma.documentView.upsert({
      where: {
        userId_documentId: {
          userId,
          documentId,
        },
      },
      create: {
        userId,
        documentId,
        lastViewedAt: new Date(),
      },
      update: {
        lastViewedAt: new Date(),
      },
    });
  }

  async findRecent(userId: UUID, limit = 20) {
    return this.prisma.documentView.findMany({
      where: {
        userId,
        document: {
          status: 'ACTIVE',
          workspace: {
            members: {
              some: { userId },
            },
          },
        },
      },
      select: {
        lastViewedAt: true,
        document: {
          select: {
            id: true,
            title: true,
            workspace: {
              select: {
                id: true,
                name: true,
              },
            },
            updatedAt: true,
            createdById: true,
          },
        },
      },
      orderBy: {
        lastViewedAt: 'desc',
      },
      take: limit,
    });
  }

  async star(userId: UUID, documentId: UUID) {
    return this.prisma.starredDocument.upsert({
      where: { userId_documentId: { userId, documentId } },
      create: { userId, documentId },
      update: {},
    });
  }

  async unstar(userId: UUID, documentId: UUID) {
    return this.prisma.starredDocument.deleteMany({
      where: { userId, documentId },
    });
  }

  async findStarred(userId: UUID) {
    return this.prisma.starredDocument.findMany({
      where: {
        userId,
        document: {
          status: 'ACTIVE',
          workspace: { members: { some: { userId } } },
        },
      },
      select: {
        createdAt: true,
        document: {
          select: {
            id: true,
            title: true,
            workspace: {
              select: {
                id: true,
                name: true,
              },
            },
            updatedAt: true,
            createdById: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async isStarred(userId: UUID, documentId: UUID) {
    const starred = await this.prisma.starredDocument.findUnique({
      where: { userId_documentId: { userId, documentId } },
      select: { id: true },
    });
    return Boolean(starred);
  }

  async findDeletedDocuments(userId: UUID) {
    return this.prisma.document.findMany({
      where: {
        status: 'DELETED',
        workspace: {
          members: {
            some: { userId },
          },
        },
      },
      select: {
        id: true,
        title: true,
        workspaceId: true,
        status: true,
        deletedAt: true,
        updatedAt: true,
        createdById: true,
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        deletedAt: 'desc',
      },
    });
  }

  async findDeletedDocument(documentId: UUID) {
    return this.prisma.document.findFirst({
      where: {
        id: documentId,
        status: 'DELETED',
      },
      select: {
        id: true,
        workspaceId: true,
        status: true,
      },
    });
  }

  async permanentlyDeleteDocument(documentId: UUID, userId: UUID) {
    const deletedDocument = await this.prisma.$transaction(
      async (tx: PrismaTransaction) => {
        // Capture document details before physical deletion.
        const document = await tx.document.findFirst({
          where: {
            id: documentId,
            status: DocumentStatus.DELETED,
          },
          select: {
            id: true,
            workspaceId: true,
            title: true,
          },
        });

        if (!document) {
          throw new AppException({
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Document not found.',
            status: HttpStatus.NOT_FOUND,
          });
        }

        // Preserve the activity record independently of the document.
        await tx.activity.create({
          data: {
            type: 'DOCUMENT_PERMANENTLY_DELETED',
            actorId: userId,
            workspaceId: document.workspaceId,
            documentId: document.id,
            metadata: {
              documentTitle: document.title,
              source: 'TRASH',
            },
          },
        });

        // Physically delete only after recording the activity.
        return tx.document.delete({
          where: {
            id: document.id,
            status: DocumentStatus.DELETED,
          },
        });
      },
    );

    await this.invalidateWorkspaceDocumentCaches(
      deletedDocument.workspaceId as UUID,
    );

    return deletedDocument;
  }

  async restoreDeletedDocument(documentId: UUID, userId: UUID) {
    const result = await this.prisma.$transaction(
      async (tx: PrismaTransaction) => {
        const updatedDocument = await tx.document.update({
          where: {
            id: documentId,
            status: DocumentStatus.DELETED,
          },
          data: {
            status: DocumentStatus.ACTIVE,
            deletedAt: null,
          },
        });

        await tx.activity.create({
          data: {
            type: 'DOCUMENT_RESTORED',
            actorId: userId,
            workspaceId: updatedDocument.workspaceId,
            documentId: updatedDocument.id,
            metadata: {
              documentTitle: updatedDocument.title,
              source: 'TRASH',
            },
          },
        });

        return updatedDocument;
      },
    );

    await this.invalidateWorkspaceDocumentCaches(result.workspaceId as UUID);

    return result;
  }
}
