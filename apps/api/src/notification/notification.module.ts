import { forwardRef, Module } from '@nestjs/common';
import { NotificationService } from './notification.service.js';
import { NotificationController } from './notification.controller.js';
import { RedisModule } from '../common/redis/redis.module.js';
import { NotificationRepository } from './repository/notification.repository.js';
import { NotificationCacheRepository } from './repository/notification-cache.repository.js';
import { UsersModule } from '../users/users.module.js';
import { JwtModule } from '../common/jwt/jwt.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { DocumentCreatedListener } from './events/document-created.listener.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';

@Module({
  imports: [
    RedisModule,
    UsersModule,
    JwtModule,
    AuthModule,
    forwardRef(() => WorkspacesModule),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationRepository,
    NotificationCacheRepository,
    DocumentCreatedListener,
  ],
  exports: [NotificationService, NotificationRepository],
})
export class NotificationModule {}
