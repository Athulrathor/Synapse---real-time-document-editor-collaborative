
import { Module } from '@nestjs/common';
import { OutboxRepository } from './outbox.repository.js';
import { OutboxDispatcherService } from './outbox-dispatcher.service.js';
import { EmailQueue } from '../email/email.queue.js';
import { JobsModule } from '../jobs.module.js';
import { CryptoModule } from '../../common/crypto/crypto.module.js';

@Module({
  imports: [JobsModule,CryptoModule],
  providers: [OutboxRepository, OutboxDispatcherService],
  exports: [OutboxRepository],
})
export class OutboxModule {}