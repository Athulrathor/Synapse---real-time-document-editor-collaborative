import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EmailQueue } from '../email/email.queue.js';
import { OutboxRepository } from './outbox.repository.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  DocumentStatus,
  NotificationResourceType,
  NotificationType,
  WorkspaceRole,
} from '@prisma/client';
import { NotificationService } from '../../notification/notification.service.js';
import { YjsPersistenceService } from '../../collaboration/yjs/yjs-persistence.service.js';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class OutboxDispatcherService {
  // private readonly logger = new Logger(OutboxDispatcherService.name);
  private readonly logger = new Logger(YjsPersistenceService.name);

  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly emailQueue: EmailQueue,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
    private readonly yjsPersistenceService: YjsPersistenceService,
  ) {}

  @Cron('*/5 * * * * *')
  async dispatchPendingEvents(): Promise<void> {
    const events = await this.outboxRepository.claimPending(50);

    for (const event of events) {
      try {
        const payload = event.payload as {
          userId: string;
          email: string;
          name: string;
          token: string;
        };

        switch (event.eventType) {
          case 'USER_VERIFICATION_EMAIL_REQUESTED':
            console.log("cron started USER_VERIFICATION")
            await this.emailQueue.enqueueVerification(
              {
                type: 'verification',
                email: payload.email,
                name: payload.name,
                token: payload.token,
              },
              `outbox-${event.id}`,
            );
            break;

          case 'RESET_PASSWORD_EMAIL_REQUESTED':
            console.log("cron started RESET_PASSWORD")
            await this.emailQueue.enqueuePasswordReset(
              {
                type: 'password-reset',
                email: payload.email,
                name: payload.name,
                token: payload.token,
              },
              `outbox-${event.id}`,
            );
            break;

          case 'DOCUMENT_CREATED':
            console.log("cron started DOCUMENT_CREATED")
            const documentEvent = event.payload as {
              documentId: string;
              workspaceId: string;
              createdById: string;
              title: string;
            };

            await this.eventEmitter.emitAsync('document.created', {
              outboxEventId: event.id,
              ...documentEvent,
            });
            break;

          case 'WORKSPACE_INVITATION_EMAIL_REQUESTED': {
            console.log("cron started WORKSPACE_INVITATION_EMAIL_REQUESTED")
            const invitationPayload = event.payload as {
              workspaceId: string;
              workspaceName: string;
              email: string;
              inviterName: string;
              role: WorkspaceRole;
              token: string;
              expiresAt: string;
            };

            await this.emailQueue.enqueueWorkspaceInvitation(
              {
                type: 'workspace-invitation',
                email: invitationPayload.email,
                workspaceName: invitationPayload.workspaceName,
                inviterName: invitationPayload.inviterName,
                role: invitationPayload.role,
                token: invitationPayload.token,
                expiresAt: invitationPayload.expiresAt,
              },
              `outbox-${event.id}`,
            );

            break;
          }

          case 'WORKSPACE_INVITATION_NOTIFICATION_REQUESTED': {
            const invitationPayload = event.payload as {
              recipientId: string;
              actorId: string;
              workspaceId: string;
              workspaceName: string;
              invitationId: string;
              role: WorkspaceRole;
            };

            await this.notificationService.create({
              recipientId: invitationPayload.recipientId,
              actorId: invitationPayload.actorId,
              type: NotificationType.WORKSPACE_INVITATION,
              title: 'Workspace invitation',
              message: `You have been invited to join ${invitationPayload.workspaceName} as ${invitationPayload.role}.`,
              resourceType: NotificationResourceType.WORKSPACE,
              resourceId: invitationPayload.invitationId,
              dedupeKey: `workspace-invitation:${invitationPayload.invitationId}`,
            });

            break;
          }

          default:
            throw new Error(`Unsupported outbox event: ${event.eventType}`);
        }

        await this.outboxRepository.markProcessed(event.id);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';

        this.logger.error(
          `Failed to dispatch outbox event ${event.id}: ${message}`,
        );

        await this.outboxRepository.markFailed(event.id, message);
      }
    }
  }

  @Cron('*/5 * * * * *')
  async processPendingCheckpoints(): Promise<void> {
    // console.log('[Scheduler] processPendingCheckpoints executed');
    const cutoff = new Date(Date.now() - 30_000);

    const pendingDocuments = await this.prisma.yjsDocumentState.findMany({
      where: {
        lastEditedAt: { lte: cutoff },
        pendingActorIds: { isEmpty: false },
        document: {
          is: { status: DocumentStatus.ACTIVE },
        },
      },
      orderBy: { lastEditedAt: 'asc' },
      take: 20,
      select: { documentId: true },
    });

    for (const { documentId } of pendingDocuments) {
      try {
        await this.yjsPersistenceService.createVersionCheckpoint(documentId);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';

        this.logger.error(
          `Failed to create checkpoint for document ${documentId}: ${message}`,
        );
      }
    }
  }
}
