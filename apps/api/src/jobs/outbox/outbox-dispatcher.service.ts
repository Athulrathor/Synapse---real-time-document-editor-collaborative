
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EncryptionService } from '../../common/crypto/encryption.service.js';
import { EmailQueue } from '../email/email.queue.js';
import { OutboxRepository } from './outbox.repository.js';

@Injectable()
export class OutboxDispatcherService {
  private readonly logger = new Logger(OutboxDispatcherService.name);

  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly emailQueue: EmailQueue,
    private readonly encryptionService: EncryptionService,
  ) {}

  @Cron('*/5 * * * * *')
  async dispatchPendingEvents(): Promise<void> {
    console.log('[OUTBOX] Dispatcher triggered');
    const events = await this.outboxRepository.claimPending(50);

    console.log(`[OUTBOX] Claimed ${events.length} events`);

    for (const event of events) {
      try {
        if (event.eventType !== 'USER_VERIFICATION_EMAIL_REQUESTED') {
          throw new Error(`Unsupported outbox event: ${event.eventType}`);
        }
        const payload = event.payload as {
          userId: string;
          email: string;
          name: string;
          encryptedToken: string;
        };

        const token = await this.encryptionService.decrypt(payload.encryptedToken);
        
        await this.emailQueue.enqueueVerification({
        type: "verification",
          email: payload.email,
          name: payload.name,
          token,
        },`outbox-${event.id}`);

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