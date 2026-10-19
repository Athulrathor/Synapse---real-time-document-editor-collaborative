import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { NotificationType, NotificationResourceType } from '@prisma/client';

import { type DocumentCreatedEvent } from '../../jobs/outbox/events/document-created.event.js';
import { NotificationService } from '../../notification/notification.service.js';
import { WorkspacesRepository } from '../../workspaces/repository/workspace.repository.js';

@Injectable()
export class DocumentCreatedListener {
  private readonly logger = new Logger(DocumentCreatedListener.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('document.created', { suppressErrors: false })
  async handleDocumentCreated(event: DocumentCreatedEvent): Promise<void> {
    const members = await this.workspacesRepository.findMemberIds(
      event.workspaceId,
    );

    const recipients = members.filter(
      (member) => member.userId !== event.createdById,
    );

    for (const recipient of recipients) {
      const notification = await this.notificationService.create({
        recipientId: recipient.userId,
        actorId: event.createdById,
        type: NotificationType.DOCUMENT_CREATED,
        title: 'New document created',
        message: `A new document "${event.title}" was created in your workspace.`,
        resourceType: NotificationResourceType.DOCUMENT,
        resourceId: event.documentId,
        dedupeKey: `${event.outboxEventId}:${recipient.userId}`,
      });

      this.eventEmitter.emit('notification.deliver', {
        recipientId: recipient.userId,
        notification,
      });
    }

    this.logger.log(
      `Processed document-created event for ${recipients.length} workspace members.`,
    );
  }
}
