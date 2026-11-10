import { Module } from '@nestjs/common';

import { DocumentsService } from './documents.service.js';
import { DocumentsController } from './documents.controller.js';
import { DocumentsRepository } from './repository/document.repository.js';

import { WorkspacesModule } from '../workspaces/workspaces.module.js';
import { DocumentRoleGuard } from '../common/guards/document-role.guard.js';
import { WorkspacesRepository } from '../workspaces/repository/workspace.repository.js';
import { AuthModule } from '../auth/auth.module.js';
import { JwtModule } from '../common/jwt/jwt.module.js';
import { UsersModule } from '../users/users.module.js';
import { RedisService } from '../common/redis/redis.service.js';
import { OutboxRepository } from '../jobs/outbox/outbox.repository.js';
import { ActivityModule } from '../activity/activity.module.js';
import { YjsPersistenceService } from '../collaboration/yjs/yjs-persistence.service.js';

@Module({
  imports: [WorkspacesModule, AuthModule, JwtModule, UsersModule,ActivityModule],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    DocumentsRepository,
    DocumentRoleGuard,
    RedisService,
    OutboxRepository,
    YjsPersistenceService
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
