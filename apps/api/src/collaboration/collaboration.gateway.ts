import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { UUID } from 'crypto';

import type { Server, Socket } from 'socket.io';
import { DocumentsService } from '../documents/documents.service.js';
import { CollaborationAuthService } from './collaboration-auth.service.js';
import { HttpStatus } from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception.js';
import { PresenceService } from './presense.service.js';
import { OnEvent } from '@nestjs/event-emitter';

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
  ) {}

  @WebSocketServer()
  server!: Server;

  private getDocumentRoom(documentId: UUID): string {
    return `document:${documentId}:room`;
  }

  private getUserRoom(userId: string): string {
    return `user:${userId}:notifications`;
  }

  private emitNotification(recipientId: string,notification: Record<string, unknown>): void {
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

    console.log('Socket connection attempt:', client.id);
    console.log(
      'Token provided:',
      typeof token === 'string' && token.length > 0,
    );

    if (typeof token !== 'string' || !token.trim()) {
      client.disconnect(true);
      return;
    }

    try {
      const user = await this.collaborationAuthService.authenticate(token);

      client.data.user = user;
      await client.join(this.getUserRoom(user.userId));
    } catch (error) {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

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

        this.presenseService.leaveDocument(documentId, user.userId, client.id);

        this.server.to(room).emit('presence:user-left', {
          documentId,
          userId: user.userId,
        });

        this.server
          .to(room)
          .emit(
            'presence:update',
            this.presenseService.getDocumentPresence(documentId),
          );
      }
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
      await this.documentService.findByDocumentId(
        payload.documentId,
        user.userId,
      );

      const room = this.getDocumentRoom(payload.documentId);

      if (!client.rooms.has(room)) {
        await client.join(room);

        this.presenseService.joinDocument(
          payload.documentId,
          client.data.user.userId,
          client.id,
        );

        this.server.to(room).emit('presence:user-joined', {
          documentId: payload.documentId,
          userId: client.data.user.userId,
        });
      }

      this.server
        .to(room)
        .emit(
          'presence:update',
          this.presenseService.getDocumentPresence(payload.documentId),
        );

      client.emit('document:joined', {
        success: true,
        documentId: payload.documentId,
      });

      console.log(`Socket ${client.id} joined room ${room}`);

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
      this.presenseService.leaveDocument(
        payload.documentId,
        client.data.user.userId,
        client.id,
      );

      await client.leave(room);

      this.server.to(room).emit('presence:user-left', {
        documentId: payload.documentId,
        userId: client.data.user.userId,
      });
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
  handleSetPresenceStatus(
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

    this.presenseService.setStatus(
      payload.documentId,
      user.userId,
      payload.status,
    );

    this.server
      .to(room)
      .emit(
        'presence:update',
        this.presenseService.getDocumentPresence(payload.documentId),
      );

    return {
      success: true,
      documentId: payload.documentId,
      status: payload.status,
    };
  }

  @SubscribeMessage('presence:set-typing')
  handleSetTyping(
    client: Socket,
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

    this.presenseService.setTyping(
      payload.documentId,
      user.userId,
      payload.isTyping,
    );

    this.server.to(room).emit('presence:typing-update', {
      documentId: payload.documentId,
      typingUsers: this.presenseService.getTypingUsers(payload.documentId),
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

    this.presenseService.setCursor(
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
