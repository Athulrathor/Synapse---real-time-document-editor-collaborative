import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration.js';
import { envValidationSchema } from './config/env.validation.js';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { EmailModule } from './common/email/email.module.js';
import { JwtModule } from './common/jwt/jwt.module.js';
import { CryptoModule } from './common/crypto/crypto.module.js';
import { RedisModule } from './common/redis/redis.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { ScheduleModule } from '@nestjs/schedule';
import { OutboxModule } from './jobs/outbox/outbox.module.js';
import { ImageKitModule } from './common/imagekit/imagekit.module.js';
import { WorkspacesModule } from './workspaces/workspaces.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { CollaborationModule } from './collaboration/collaboration.module.js';
import { NotificationModule } from './notification/notification.module.js';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OutboxRepository } from './jobs/outbox/outbox.repository.js';
import { ActivityModule } from './activity/activity.module.js';

// export const {
//   ObserveModule,
//   ObserveInstrument,
// }: {
//   ObserveModule: { forRoot: (...args: any[]) => DynamicModule };
//   ObserveInstrument: any;
// } = createObserveModule();

@Module({
  imports: [
    // ObserveModule.forRoot({
    //   appKey: 'YOUR_APP_KEY',
    //   appSecret: 'YOUR_APP_SECRET',
    //   serviceId: 'api',
    // }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    DatabaseModule,
    HealthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    AuthModule,
    UsersModule,
    CryptoModule,
    JwtModule,
    EmailModule,
    RedisModule,
    JobsModule,
    OutboxModule,
    ImageKitModule,
    WorkspacesModule,
    DocumentsModule,
    CollaborationModule,
    NotificationModule,
    ActivityModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    OutboxRepository,
  ],
})
export class AppModule {}
