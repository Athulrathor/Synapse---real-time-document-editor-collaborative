import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service.js';
import { ActivityController } from './activity.controller.js';
import { ActivityRepository } from './repository/activity.repository.js';
import { AuthModule } from '../auth/auth.module.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { JwtModule } from '../common/jwt/jwt.module.js';

@Module({
  imports: [AuthModule,JwtModule],
  controllers: [ActivityController],
  providers: [ActivityService,ActivityRepository,JwtAuthGuard],
  exports: [ActivityService, ActivityRepository,JwtAuthGuard],
})
export class ActivityModule {}
