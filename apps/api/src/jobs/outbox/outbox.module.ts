import { Module } from '@nestjs/common';
import { OutboxRepository } from './outbox.repository.js';
import { OutboxDispatcherService } from './outbox-dispatcher.service.js';
import { JobsModule } from '../jobs.module.js';
import { CryptoModule } from '../../common/crypto/crypto.module.js';
import { NotificationModule } from '../../notification/notification.module.js';
import { CollaborationModule } from '../../collaboration/collaboration.module.js';

@Module({
  imports: [JobsModule, CryptoModule, NotificationModule,CollaborationModule],
  providers: [OutboxRepository,OutboxDispatcherService],
  exports: [OutboxRepository],
})
export class OutboxModule {}
