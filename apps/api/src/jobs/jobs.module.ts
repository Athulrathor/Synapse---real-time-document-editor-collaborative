import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

import { EmailModule } from '../common/email/email.module.js';
import { EmailProcessor } from './email/email.processor.js';
import { EmailQueue } from './email/email.queue.js';
import { OutboxModule } from './outbox/outbox.module.js';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = new URL(
          config.getOrThrow<string>('redis.url'),
        );

        return {
          connection: {
            host: redisUrl.hostname,
            port: Number(redisUrl.port || 6379),
            username: redisUrl.username || undefined,
            password: redisUrl.password
              ? decodeURIComponent(redisUrl.password)
              : undefined,
            maxRetriesPerRequest: null,
          },
        };
      },
    }),

    BullModule.registerQueue({
      name: 'email',
    }),

    EmailModule,
  ],

  providers: [EmailProcessor,EmailQueue],
  exports: [BullModule,EmailProcessor],
})
export class JobsModule {}