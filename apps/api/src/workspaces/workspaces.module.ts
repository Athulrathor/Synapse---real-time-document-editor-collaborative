import { Module } from '@nestjs/common';
import { WorkspacesController } from './workspaces.controller.js';
import { WorkspacesService } from './workspaces.service.js';
import { WorkspaceRoleGuard } from '../common/guards/workspace-role.guard.js';
import { WorkspacesRepository } from './repository/workspace.repository.js';
import { AuthModule } from '../auth/auth.module.js';
import { JwtModule } from '../common/jwt/jwt.module.js';
import { UsersModule } from '../users/users.module.js';
import { RedisService } from '../common/redis/redis.service.js';

@Module({
  imports: [AuthModule,JwtModule,UsersModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesService, WorkspaceRoleGuard,WorkspacesRepository,RedisService],
  exports: [WorkspacesService,WorkspacesRepository],
})
export class WorkspacesModule {};
