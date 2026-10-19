import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EmailQueue } from '../email/email.queue.js';
import { OutboxRepository } from './outbox.repository.js';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class OutboxDispatcherService {
  private readonly logger = new Logger(OutboxDispatcherService.name);

  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly emailQueue: EmailQueue,
    private readonly eventEmitter: EventEmitter2,
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

          case 'DOCUMENT_CREATED': {
            const documentEvent = event.payload as {
              documentId: string;
              workspaceId: string;
              createdById: string;
              title: string;
            };

            this.eventEmitter.emitAsync('document.created', {
              outboxEventId: event.id,
              ...documentEvent,
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
}
