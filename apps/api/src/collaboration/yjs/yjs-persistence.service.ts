import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import * as Y from 'yjs';
import { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } from '@tiptap/y-tiptap';

import { getSchema } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { DocumentStatus, Prisma } from '@prisma/client';
import { createDocumentSnapshot } from '../../documents/utils/document-snapshot.util.js';

const COMPACTION_UPDATE_THRESHOLD = 100;

@Injectable()
export class YjsPersistenceService {
  constructor(private readonly prisma: PrismaService) {}

  private getProseMirrorSchema() {
    return getSchema([
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ]);
  }

  async getDocumentRichText(
    documentId: string,
  ): Promise<Record<string, unknown>> {
    const state = await this.loadDocument(documentId);

    const ydoc = new Y.Doc();

    try {
      Y.applyUpdate(ydoc, state);

      return yDocToProsemirrorJSON(ydoc, 'default') as Record<string, unknown>;
    } finally {
      ydoc.destroy();
    }
  }

  async hasDocumentState(documentId: string): Promise<boolean> {
    const state = await this.prisma.yjsDocumentState.findUnique({
      where: { documentId },
      select: {
        snapshot: true,
        _count: {
          select: {
            updates: true,
          },
        },
      },
    });

    return Boolean(state?.snapshot || state?._count.updates);
  }

  async initializeDocument(
    documentId: string,
    initialUpdate: Uint8Array,
  ): Promise<boolean> {
    if (initialUpdate.byteLength === 0) {
      throw new Error('Initial Yjs update cannot be empty');
    }

    return this.prisma.$transaction(
      async (tx) => {
        await tx.yjsDocumentState.upsert({
          where: { documentId },
          create: { documentId },
          update: {},
        });

        await tx.$queryRaw`
        SELECT "documentId"
        FROM "yjs_document_states"
        WHERE "documentId" = ${documentId}
        FOR UPDATE
      `;

        const state = await tx.yjsDocumentState.findUniqueOrThrow({
          where: { documentId },
          include: {
            updates: {
              select: { id: true },
              take: 1,
            },
          },
        });

        // Another client has already initialized this document.
        if (state.snapshot || state.updates.length > 0) {
          return false;
        }

        await tx.yjsDocumentUpdate.create({
          data: {
            documentId,
            update: Buffer.from(initialUpdate),
          },
        });

        return true;
      },
      {
        maxWait: 5000,
        timeout: 15000,
      },
    );
  }

  async createInitialUpdate(
    richText: Record<string, unknown>,
  ): Promise<Uint8Array> {
    const ydoc = prosemirrorJSONToYDoc(
      // This must match the shared fragment name used by TipTap Collaboration.
      // We'll use "default" consistently in the editor configuration.
      richText as never,
      'default',
    );

    try {
      return Y.encodeStateAsUpdate(ydoc);
    } finally {
      ydoc.destroy();
    }
  }

  async initializeFromRichText(
    documentId: string,
    richText: Record<string, unknown>,
  ): Promise<boolean> {
    // const initialYDoc = prosemirrorJSONToYDoc(richText as never, 'default');
    const initialYDoc = prosemirrorJSONToYDoc(
      this.getProseMirrorSchema(),
      richText as never,
      'default',
    );

    try {
      const initialUpdate = Y.encodeStateAsUpdate(initialYDoc);

      return await this.initializeDocument(documentId, initialUpdate);
    } finally {
      initialYDoc.destroy();
    }
  }

  async loadDocument(documentId: string): Promise<Uint8Array> {
    const state = await this.prisma.yjsDocumentState.findUnique({
      where: { documentId },
      include: {
        updates: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    const ydoc = new Y.Doc();

    try {
      if (state?.snapshot) {
        Y.applyUpdate(ydoc, new Uint8Array(state.snapshot));
      }

      for (const update of state?.updates ?? []) {
        Y.applyUpdate(ydoc, new Uint8Array(update.update));
      }

      return Y.encodeStateAsUpdate(ydoc);
    } finally {
      ydoc.destroy();
    }
  }

  async persistUpdate(
    documentId: string,
    actorId: string | null,
    update: Uint8Array,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.yjsDocumentState.upsert({
        where: { documentId },
        create: { documentId },
        update: {},
      });

      await tx.$queryRaw`
        SELECT "documentId"
        FROM "yjs_document_states"
        WHERE "documentId" = ${documentId}
        FOR UPDATE
      `;

      await tx.yjsDocumentUpdate.create({
        data: {
          documentId,
          actorId,
          update: Buffer.from(update),
        },
      });

      if (actorId) {
        await tx.$executeRaw`
    UPDATE "yjs_document_states"
    SET
      "lastEditedAt" = GREATEST("lastEditedAt", NOW()),
      "pendingActorIds" = CASE
        WHEN NOT (${actorId} = ANY("pendingActorIds"))
        THEN array_append("pendingActorIds", ${actorId})
        ELSE "pendingActorIds"
      END
    WHERE "documentId" = ${documentId}
  `;
      }
    });

    await this.compactDocumentIfNeeded(documentId);
  }

  async createVersionCheckpoint(documentId: string): Promise<boolean> {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`
    SELECT "id"
    FROM "Document"
    WHERE "id" = ${documentId}
    FOR UPDATE
  `;

        // 2. Then lock the Yjs state row.
        await tx.$queryRaw`
    SELECT "documentId"
    FROM "yjs_document_states"
    WHERE "documentId" = ${documentId}
    FOR UPDATE
  `;

        const state = await tx.yjsDocumentState.findUnique({
          where: { documentId },
          select: {
            lastEditedAt: true,
            lastCheckpointAt: true,
            pendingActorIds: true,
            snapshot: true,
            updates: {
              orderBy: { sequence: 'asc' },
              select: {
                update: true,
              },
            },
          },
        });

        if (
          !state ||
          !state.lastEditedAt ||
          state.pendingActorIds.length === 0
        ) {
          return false;
        }

        const inactivityMs = Date.now() - state.lastEditedAt.getTime();

        if (inactivityMs < 30_000) {
          return false;
        }

        const document = await tx.document.findFirst({
          where: {
            id: documentId,
            status: DocumentStatus.ACTIVE,
          },
          select: {
            id: true,
            workspaceId: true,
            title: true,
          },
        });

        if (!document) {
          return false;
        }

        const contributors = await tx.user.findMany({
          where: {
            id: { in: state.pendingActorIds },
          },
          select: { id: true },
        });

        if (contributors.length === 0) {
          return false;
        }

        const ydoc = new Y.Doc();

        let content: Record<string, unknown>;

        try {
          if (state.snapshot) {
            Y.applyUpdate(ydoc, new Uint8Array(state.snapshot));
          }

          for (const update of state.updates) {
            Y.applyUpdate(ydoc, new Uint8Array(update.update));
          }

          content = yDocToProsemirrorJSON(ydoc, 'default') as Record<
            string,
            unknown
          >;
        } finally {
          ydoc.destroy();
        }

        const snapshot = createDocumentSnapshot({
          title: document.title,
          content: {
            text: {
              text: '',
              richText: content,
            },
          },
        });

        const snapshotBytes = Buffer.from(JSON.stringify(snapshot), 'utf8');

        await tx.document.update({
          where: { id: documentId },
          data: {
            content: {
              text: {
                text: '',
                richText: content,
              },
            } as Prisma.InputJsonValue,
            updatedAt: new Date(),
          },
        });

        const latestVersion = await tx.version.findFirst({
          where: { documentId },
          orderBy: { versionNumber: 'desc' },
          select: { versionNumber: true },
        });

        const versionNumber = (latestVersion?.versionNumber ?? 0) + 1;

        const validContributorIds = new Set(
          contributors.map((user) => user.id),
        );

        const contributorIds = [
          ...new Set(
            state.pendingActorIds.filter((id) => validContributorIds.has(id)),
          ),
        ];

        if (contributorIds.length === 0) {
          return false;
        }

        const primaryActorId = contributorIds[0]!;

        const version = await tx.version.create({
          data: {
            documentId,
            versionNumber,
            snapshot: snapshotBytes,
            createdById: primaryActorId,
            message: 'Collaborative edits checkpoint',
          },
        });

        await tx.activity.create({
          data: {
            type: 'DOCUMENT_UPDATED',
            actorId: primaryActorId,
            workspaceId: document.workspaceId,
            documentId,
            versionId: version.id,
            metadata: {
              documentTitle: document.title,
              versionNumber,
              versionMessage: 'Collaborative edits checkpoint',
              contributorIds,
            },
          },
        });

        await tx.yjsDocumentState.update({
          where: { documentId },
          data: {
            lastCheckpointAt: new Date(),
            pendingActorIds: [],
          },
        });

        return true;
      },
      {
        maxWait: 5000,
        timeout: 15000,
      },
    );
  }

  async compactDocument(documentId: string): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        await tx.yjsDocumentState.upsert({
          where: { documentId },
          create: { documentId },
          update: {},
        });

        await tx.$queryRaw`
          SELECT "documentId"
          FROM "yjs_document_states"
          WHERE "documentId" = ${documentId}
          FOR UPDATE
        `;

        const state = await tx.yjsDocumentState.findUniqueOrThrow({
          where: { documentId },
          include: {
            updates: {
              orderBy: { sequence: 'asc' },
            },
          },
        });

        const ydoc = new Y.Doc();

        let snapshot: Uint8Array;

        try {
          if (state.snapshot) {
            Y.applyUpdate(ydoc, new Uint8Array(state.snapshot));
          }

          for (const update of state.updates) {
            Y.applyUpdate(ydoc, new Uint8Array(update.update));
          }

          snapshot = Y.encodeStateAsUpdate(ydoc);
        } finally {
          ydoc.destroy();
        }

        const lastSequence =
          state.updates.length > 0
            ? state.updates[state.updates.length - 1]!.sequence
            : null;

        await tx.yjsDocumentState.update({
          where: { documentId },
          data: {
            snapshot: Buffer.from(snapshot),
            snapshotVersion: { increment: 1 },
          },
        });

        if (lastSequence !== null) {
          await tx.yjsDocumentUpdate.deleteMany({
            where: {
              documentId,
              sequence: { lte: lastSequence },
            },
          });
        }
      },
      {
        maxWait: 5000,
        timeout: 15000,
      },
    );
  }

  async compactDocumentIfNeeded(documentId: string): Promise<void> {
    const state = await this.prisma.yjsDocumentState.findUnique({
      where: { documentId },
      select: {
        snapshot: true,
        _count: {
          select: {
            updates: true,
          },
        },
      },
    });

    if (!state || state._count.updates < COMPACTION_UPDATE_THRESHOLD) {
      return;
    }

    await this.compactDocument(documentId);
  }

  async getMissingUpdates(
    documentId: string,
    stateVector: Uint8Array,
  ): Promise<Uint8Array> {
    const state = await this.prisma.yjsDocumentState.findUnique({
      where: { documentId },
      include: {
        updates: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    const serverDoc = new Y.Doc();

    try {
      if (state?.snapshot) {
        Y.applyUpdate(serverDoc, new Uint8Array(state.snapshot));
      }

      for (const update of state?.updates ?? []) {
        Y.applyUpdate(serverDoc, new Uint8Array(update.update));
      }

      return Y.encodeStateAsUpdate(serverDoc, stateVector);
    } finally {
      serverDoc.destroy();
    }
  }

  async mergeClientState(
    documentId: string,
    clientState: Uint8Array,
  ): Promise<void> {
    if (clientState.byteLength === 0) {
      throw new Error('Client Yjs state cannot be empty');
    }

    const clientDoc = new Y.Doc();

    try {
      Y.applyUpdate(clientDoc, clientState);

      const normalizedState = Y.encodeStateAsUpdate(clientDoc);

      await this.persistUpdate(documentId, null, normalizedState);
    } finally {
      clientDoc.destroy();
    }
  }

  async replaceDocumentState(
    tx: Prisma.TransactionClient,
    documentId: string,
    richText: Record<string, unknown>,
  ): Promise<void> {
    const ydoc = prosemirrorJSONToYDoc(
      this.getProseMirrorSchema(),
      richText as never,
      'default',
    );

    try {
      const update = Y.encodeStateAsUpdate(ydoc);

      await tx.yjsDocumentState.upsert({
        where: { documentId },
        create: {
          documentId,
          snapshot: null,
          snapshotVersion: 0,
          pendingActorIds: [],
        },
        update: {
          snapshot: null,
          snapshotVersion: 0,
          pendingActorIds: [],
          lastEditedAt: null,
          lastCheckpointAt: null,
        },
      });

      await tx.$queryRaw`
  SELECT "documentId"
  FROM "yjs_document_states"
  WHERE "documentId" = ${documentId}
  FOR UPDATE
`;

      await tx.yjsDocumentUpdate.deleteMany({
        where: { documentId },
      });

      await tx.yjsDocumentUpdate.create({
        data: {
          documentId,
          update: Buffer.from(update),
        },
      });
    } finally {
      ydoc.destroy();
    }
  }
}
