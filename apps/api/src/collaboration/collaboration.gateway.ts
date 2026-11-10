import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { UUID } from 'crypto';

import type { Server, Socket } from 'socket.io';
import { DocumentsService } from '../documents/documents.service.js';
import { CollaborationAuthService } from './collaboration-auth.service.js';
import { HttpStatus } from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception.js';
import { PresenceService } from './presense.service.js';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../database/prisma.service.js';
import { YjsPersistenceService } from './yjs/yjs-persistence.service.js';
import { isUUID } from 'class-validator';

@WebSocketGateway({
  namespace: '/collaboration',
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
})
export class CollaborationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly documentService: DocumentsService,
    private readonly collaborationAuthService: CollaborationAuthService,
    private readonly presenseService: PresenceService,
    private readonly prismaService: PrismaService,
    private readonly yjsPersistenceService: YjsPersistenceService,
  ) {}

  @WebSocketServer()
  server!: Server;

  private getDocumentRoom(documentId: UUID): string {
    return `document:${documentId}:room`;
  }

  private getUserRoom(userId: string): string {
    return `user:${userId}:notifications`;
  }

  private emitNotification(
    recipientId: string,
    notification: Record<string, unknown>,
  ): void {
    this.server
      .to(this.getUserRoom(recipientId))
      .emit('notification:new', notification);
  }

  @OnEvent('notification.deliver')
  handleNotificationDeliver(event: {
    recipientId: string;
    notification: Record<string, unknown>;
  }): void {
    this.emitNotification(event.recipientId, event.notification);
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token;

    if (typeof token !== 'string' || !token.trim()) {
      client.disconnect(true);
      return;
    }

    try {
      const user = await this.collaborationAuthService.authenticate(token);

      console.log('connection :', client.id, ' user: ', user.email);

      client.data.user = user;
      await client.join(this.getUserRoom(user.userId));
    } catch (error) {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    console.log(
      `Client disconnected: ${client.id}`,
      ' user: ',
      client?.data?.usesr?.email,
    );

    const user = client.data.user;

    if (!user?.userId) {
      return;
    }

    for (const room of client.rooms) {
      if (room === client.id) {
        continue;
      }

      if (room.startsWith('document:') && room.endsWith(':room')) {
        const documentId = room.slice(
          'document:'.length,
          -':room'.length,
        ) as UUID;

        await this.presenseService.leaveDocument(
          documentId,
          user.userId,
          client.id,
        );

        const presence =
          await this.presenseService.getDocumentPresence(documentId);

        await this.server.to(room).emit('presence:user-left', {
          documentId,
          userId: user.userId,
        });

        await this.server.to(room).emit('presence:update', presence);
      }
    }
  }

  @SubscribeMessage('collaboration:sync-request')
  async handleYjsSyncRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      documentId: string;
      requestId: string;
      state: Uint8Array | Buffer | ArrayBuffer | number[];
    },
  ) {
    const user = client.data.user;

    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const documentId = payload?.documentId;
    const requestId = payload?.requestId;

    if (!documentId || !isUUID(documentId)) {
      return { success: false, message: 'Invalid document ID' };
    }

    if (
      typeof requestId !== 'string' ||
      requestId.length === 0 ||
      requestId.length > 100
    ) {
      return { success: false, message: 'Invalid reconciliation request ID' };
    }

    const room = this.getDocumentRoom(documentId as UUID);

    if (!client.rooms.has(room)) {
      return { success: false, message: 'Join the document first' };
    }

    try {
      await this.documentService.findByDocumentId(
        documentId as UUID,
        user.userId,
      );

      const hasState =
        await this.yjsPersistenceService.hasDocumentState(documentId);

      if (!hasState) {
        const richText = await this.documentService.getContentForCollaboration(
          documentId as UUID,
          user.userId,
        );

        if (richText) {
          await this.yjsPersistenceService.initializeFromRichText(
            documentId,
            richText as Record<string, unknown>,
          );
        }
      }

      const state = await this.yjsPersistenceService.loadDocument(documentId);

      client.emit('collaboration:sync-state', {
        documentId,
        requestId,
        state: Buffer.from(state),
      });

      return { success: true, requestId };
    } catch (error) {
      console.error(
        '[Collaboration] Sync request failed:',
        error instanceof Error ? (error.stack ?? error.message) : error,
      );

      return {
        success: false,
        requestId,
        message: 'Unable to synchronize document',
      };
    }
  }

  @SubscribeMessage('collaboration:sync-client-state')
  async handleClientStateSync(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      documentId: string;
      requestId: string;
      state: Uint8Array | Buffer | ArrayBuffer | number[];
    },
  ) {
    const user = client.data.user;

    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const documentId = payload?.documentId;

    if (!documentId || !isUUID(documentId)) {
      return { success: false, message: 'Invalid document ID' };
    }

    const room = this.getDocumentRoom(documentId as UUID);

    if (!client.rooms.has(room)) {
      return { success: false, message: 'Join the document first' };
    }

    try {
      await this.documentService.findByDocumentId(
        documentId as UUID,
        user.userId,
      );

      let clientState: Uint8Array;

      if (payload.state instanceof ArrayBuffer) {
        clientState = new Uint8Array(payload.state);
      } else if (Buffer.isBuffer(payload.state)) {
        clientState = new Uint8Array(payload.state);
      } else if (payload.state instanceof Uint8Array) {
        clientState = new Uint8Array(payload.state);
      } else if (Array.isArray(payload.state)) {
        clientState = new Uint8Array(payload.state);
      } else {
        return { success: false, message: 'Invalid Yjs state' };
      }

      if (clientState.byteLength === 0 || clientState.byteLength > 5_000_000) {
        return { success: false, message: 'Invalid Yjs state size' };
      }

      await this.yjsPersistenceService.mergeClientState(
        documentId,
        Buffer.from(clientState),
      );

      client.to(room).emit('collaboration:update', {
        documentId,
        update: Buffer.from(clientState),
      });

      return { success: true, requestId: payload?.requestId };
    } catch (error) {
      console.error('[Collaboration] Client state sync failed:', error);

      return {
        success: false,

        message: 'Unable to synchronize client state',
      };
    }
  }

  @SubscribeMessage('collaboration:initialize')
  async handleYjsInitialize(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      documentId: string;
      update: Buffer | Uint8Array | ArrayBuffer;
    },
  ) {
    const user = client.data.user;

    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const documentId = payload?.documentId;

    if (!documentId || !isUUID(documentId)) {
      return { success: false, message: 'Invalid document ID' };
    }

    const room = this.getDocumentRoom(documentId as UUID);

    if (!client.rooms.has(room)) {
      return { success: false, message: 'Join the document first' };
    }

    const incoming = payload?.update;

    let update: Uint8Array;

    if (Buffer.isBuffer(incoming)) {
      update = new Uint8Array(incoming);
    } else if (incoming instanceof ArrayBuffer) {
      update = new Uint8Array(incoming);
    } else if (incoming instanceof Uint8Array) {
      update = new Uint8Array(incoming);
    } else {
      return { success: false, message: 'Invalid Yjs update' };
    }

    if (update.byteLength === 0 || update.byteLength > 1_000_000) {
      return { success: false, message: 'Invalid update size' };
    }

    try {
      // The user must be a workspace member.
      await this.documentService.findByDocumentId(
        documentId as UUID,
        user.userId,
      );

      // Initialize only if the document has no existing Yjs state.
      const initialized = await this.yjsPersistenceService.initializeDocument(
        documentId,
        update,
      );

      // Return whether this request created the initial state.
      client.emit('collaboration:initialize-result', {
        documentId,
        initialized,
      });

      return {
        success: true,
        initialized,
      };
    } catch {
      return {
        success: false,
        message: 'Unable to initialize collaborative document',
      };
    }
  }

  @SubscribeMessage('collaboration:update')
  async handleYjsUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      documentId: string;
      update: Buffer | Uint8Array | ArrayBuffer;
    },
  ) {
    const user = client.data.user;

    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const documentId = payload?.documentId;

    if (!documentId || !isUUID(documentId)) {
      return { success: false, message: 'Invalid document ID' };
    }

    const room = this.getDocumentRoom(documentId as UUID);

    if (!client.rooms.has(room)) {
      return { success: false, message: 'Join the document first' };
    }

    const incoming = payload?.update;

    let update: Uint8Array;

    if (Buffer.isBuffer(incoming)) {
      update = new Uint8Array(incoming);
    } else if (incoming instanceof ArrayBuffer) {
      update = new Uint8Array(incoming);
    } else if (incoming instanceof Uint8Array) {
      update = new Uint8Array(incoming);
    } else {
      return { success: false, message: 'Invalid Yjs update' };
    }

    if (update.byteLength === 0 || update.byteLength > 1_000_000) {
      return { success: false, message: 'Invalid update size' };
    }

    try {
      // Verify edit permission using your existing role rules.
      await this.documentService.assertCanEditDocument(
        documentId as UUID,
        user.userId,
      );

      // Save first, then broadcast.
      await this.yjsPersistenceService.persistUpdate(documentId,user.userId, update);

      client.to(room).emit('collaboration:update', {
        documentId,
        update: Buffer.from(update),
      });

      return { success: true };
    } catch {
      return { success: false, message: 'Unable to save collaborative update' };
    }
  }

  @SubscribeMessage('document:join')
  async handleJoinDocument(client: Socket, payload: { documentId: UUID }) {
    const user = client.data.user;

    if (!user?.userId) {
      throw new AppException({
        code: 'AUTHENTICATION_FAILED',
        message: 'Authentication required.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    if (
      typeof payload?.documentId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        payload.documentId,
      )
    ) {
      throw new AppException({
        code: 'INVALID_DOCUMENT_ID',
        message: 'A valid document ID is required.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    try {
      const remainingNeeds = await this.prismaService.user.findUnique({
        where: {
          id: user?.userId,
        },

        select: {
          id: true,
          name: true,
          avatar: {
            select: {
              path: true,
            },
          },
        },
      });

      await this.documentService.findByDocumentId(
        payload.documentId,
        user.userId,
      );

      const room = this.getDocumentRoom(payload.documentId);

      if (!client.rooms.has(room)) {
        await client.join(room);

        await this.presenseService.joinDocument(
          payload.documentId,
          client.data.user.userId,
          client.id,
          remainingNeeds?.avatar?.path ?? '',
          remainingNeeds?.name ?? 'Unknown',
        );

        this.server.to(room).emit('presence:user-joined', {
          documentId: payload.documentId,
          userId: client.data.user.userId,
        });
      }

      const presence = await this.presenseService.getDocumentPresence(
        payload.documentId,
      );

      await this.server.to(room).emit('presence:update', presence);

      client.emit('document:joined', {
        success: true,
        documentId: payload.documentId,
      });

      console.log(
        `Socket ${client.id} joined room ${room} user: ${user?.email}`,
      );

      return {
        success: true,
        documentId: payload.documentId,
      };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }

      throw new AppException({
        code: 'DOCUMENT_ACCESS_DENIED',
        message: 'The document was not found or you do not have access.',
        status: HttpStatus.FORBIDDEN,
      });
    }
  }

  @SubscribeMessage('document:leave')
  async handleLeaveDocument(client: Socket, payload: { documentId: UUID }) {
    if (!client.data.user?.userId) {
      throw new AppException({
        code: 'UNAUTHORIZED',
        message: 'Authentication is required.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    if (
      typeof payload?.documentId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        payload.documentId,
      )
    ) {
      throw new AppException({
        code: 'INVALID_DOCUMENT_ID',
        message: 'A valid document ID is required.',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const ids = await this.documentService.findByDocumentId(
      payload.documentId,
      client.data.user.userId,
    );

    if (!ids) {
      throw new AppException({
        code: 'INVALID_DOCUMENT_ID',
        message: 'A valid document ID is required.',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const room = this.getDocumentRoom(payload.documentId);

    if (client.rooms.has(room)) {
      const userLeft = await this.presenseService.leaveDocument(
        payload.documentId,
        client.data.user.userId,
        client.id,
      );

      await client.leave(room);

      if (userLeft) {
        this.server.to(room).emit('presence:user-left', {
          documentId: payload.documentId,
          userId: client.data.user.userId,
        });
      }
    }

    this.server
      .to(room)
      .emit(
        'presence:update',
        this.presenseService.getDocumentPresence(payload.documentId),
      );

    client.emit('document:left', {
      success: true,
      documentId: payload.documentId,
    });

    return {
      success: true,
      documentId: payload.documentId,
    };
  }

  @SubscribeMessage('presence:set-status')
  async handleSetPresenceStatus(
    client: Socket,
    payload: {
      documentId: UUID;
      status: 'viewing' | 'editing';
    },
  ) {
    const user = client.data.user;

    if (!user?.userId) {
      throw new AppException({
        code: 'UNAUTHORIZED',
        message: 'User is not authenticated',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    if (payload.status !== 'viewing' && payload.status !== 'editing') {
      throw new AppException({
        code: 'INVALID_PRESENCE_STATUS',
        message: 'Status must be viewing or editing',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    if (
      !payload?.documentId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        payload.documentId,
      )
    ) {
      throw new AppException({
        code: 'INVALID_DOCUMENT_ID',
        message: 'A valid document ID is required',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const room = this.getDocumentRoom(payload.documentId);

    if (!client.rooms.has(room)) {
      throw new AppException({
        code: 'DOCUMENT_NOT_JOINED',
        message: 'Join the document before changing your status',
        status: HttpStatus.FORBIDDEN,
      });
    }

    await this.presenseService.setStatus(
      payload.documentId,
      user.userId,
      payload.status,
    );

    const presence = await this.presenseService.getDocumentPresence(
      payload.documentId,
    );

    this.server.to(room).emit('presence:update', presence);

    return {
      success: true,
      documentId: payload.documentId,
      status: payload.status,
    };
  }

  @SubscribeMessage('presence:set-typing')
  async handleSetTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      documentId: UUID;
      isTyping: boolean;
    },
  ) {
    const user = client.data.user;

    if (!user?.userId) {
      throw new AppException({
        code: 'UNAUTHORIZED',
        message: 'User is not authenticated',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    if (typeof payload?.isTyping !== 'boolean') {
      throw new AppException({
        code: 'INVALID_TYPING_STATUS',
        message: 'isTyping must be a boolean',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    if (
      !payload?.documentId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        payload.documentId,
      )
    ) {
      throw new AppException({
        code: 'INVALID_DOCUMENT_ID',
        message: 'A valid document ID is required',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const room = this.getDocumentRoom(payload.documentId);

    if (!client.rooms.has(room)) {
      throw new AppException({
        code: 'DOCUMENT_NOT_JOINED',
        message: 'Join the document before changing typing status',
        status: HttpStatus.FORBIDDEN,
      });
    }

    await this.presenseService.setTyping(
      payload.documentId,
      user.userId,
      payload.isTyping,
    );

    const typingUsers = await this.presenseService.getTypingUsers(
      payload.documentId,
    );

    this.server.to(room).emit('presence:typing-update', {
      documentId: payload.documentId,
      typingUsers,
    });

    return {
      success: true,
      documentId: payload.documentId,
      isTyping: payload.isTyping,
    };
  }

  @SubscribeMessage('document:cursor-update')
  async handleCursorUpdate(
    client: Socket,
    payload: {
      documentId: UUID;
      position: number;
      selectionEnd?: number;
    },
  ) {
    const user = client.data.user;

    if (!user?.userId) {
      throw new AppException({
        code: 'UNAUTHORIZED',
        message: 'User is not authenticated',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    if (
      !payload?.documentId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        payload.documentId,
      )
    ) {
      throw new AppException({
        code: 'INVALID_DOCUMENT_ID',
        message: 'A valid document ID is required',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    if (
      !Number.isInteger(payload.position) ||
      payload.position < 0 ||
      (payload.selectionEnd !== undefined &&
        (!Number.isInteger(payload.selectionEnd) || payload.selectionEnd < 0))
    ) {
      throw new AppException({
        code: 'INVALID_CURSOR_POSITION',
        message: 'Cursor positions must be non-negative integers',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const room = this.getDocumentRoom(payload.documentId);

    if (!client.rooms.has(room)) {
      throw new AppException({
        code: 'DOCUMENT_NOT_JOINED',
        message: 'Join the document before sharing your cursor',
        status: HttpStatus.FORBIDDEN,
      });
    }

    await this.presenseService.setCursor(
      payload.documentId,
      user.userId,
      payload.position,
      payload.selectionEnd ?? payload.position,
    );

    client.to(room).emit('document:cursor-updated', {
      documentId: payload.documentId,
      userId: user.userId,
      position: payload.position,
      selectionEnd: payload.selectionEnd ?? payload.position,
      status: (
        await this.presenseService.getUserStatus(
          payload.documentId,
          user.userId,
        )
      )?.status,
    });

    return { success: true };
  }

  @SubscribeMessage('document:test')
  async handleTestMessage(
    client: Socket,
    payload: { documentId: UUID; message: string },
  ) {
    const user = client.data.user;

    if (!user?.userId) {
      throw new AppException({
        code: 'AUTHENTICATION_FAILED',
        message: 'Authentication required.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    // Validate the payload.
    if (
      typeof payload?.documentId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        payload.documentId,
      )
    ) {
      throw new AppException({
        code: 'INVALID_DOCUMENT_ID',
        message: 'A valid document ID is required.',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    if (
      typeof payload.message !== 'string' ||
      !payload.message.trim() ||
      payload.message.length > 500
    ) {
      throw new AppException({
        code: 'INVALID_MESSAGE',
        message: 'Message must contain 1–500 characters.',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    // Verify that this user can access the document.
    try {
      await this.documentService.findByDocumentId(
        payload.documentId,
        user.userId,
      );
    } catch {
      throw new AppException({
        code: 'DOCUMENT_ACCESS_DENIED',
        message: 'The document was not found or you do not have access.',
        status: HttpStatus.FORBIDDEN,
      });
    }

    // Broadcast only after authorization succeeds.
    const room = this.getDocumentRoom(payload.documentId);

    if (!client.rooms.has(room)) {
      throw new AppException({
        code: 'DOCUMENT_ROOM_NOT_JOINED',
        message: 'Join the document room before sending messages.',
        status: HttpStatus.FORBIDDEN,
      });
    }

    this.server.to(room).emit('document:test:received', {
      documentId: payload.documentId,
      message: payload.message.trim(),
      senderId: user.userId,
    });

    return { success: true };
  }
}
