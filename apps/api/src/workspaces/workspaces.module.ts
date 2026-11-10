import { forwardRef, Module } from '@nestjs/common';
import { WorkspacesController } from './workspaces.controller.js';
import { WorkspacesService } from './workspaces.service.js';
import { WorkspaceRoleGuard } from '../common/guards/workspace-role.guard.js';
import { WorkspacesRepository } from './repository/workspace.repository.js';
import { AuthModule } from '../auth/auth.module.js';
import { JwtModule } from '../common/jwt/jwt.module.js';
import { UsersModule } from '../users/users.module.js';
import { RedisService } from '../common/redis/redis.service.js';
import { TokenService } from '../common/crypto/token.service.js';
import { EncryptionService } from '../common/crypto/encryption.service.js';
import { NotificationRepository } from '../notification/repository/notification.repository.js';
import { NotificationModule } from '../notification/notification.module.js';

@Module({
  imports: [
    AuthModule,
    JwtModule,
    UsersModule,
    forwardRef(() => NotificationModule),
  ],
  controllers: [WorkspacesController],
  providers: [
    WorkspacesService,
    WorkspaceRoleGuard,
    WorkspacesRepository,
    RedisService,
    TokenService,
    EncryptionService,
  ],
  exports: [WorkspacesService, WorkspacesRepository],
})
export class WorkspacesModule {}
