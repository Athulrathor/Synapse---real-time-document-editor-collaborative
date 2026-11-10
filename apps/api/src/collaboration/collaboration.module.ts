import { Module } from '@nestjs/common';
import { CollaborationGateway } from './collaboration.gateway.js';
import { DocumentsModule } from '../documents/documents.module.js';
import { JwtModule } from '../common/jwt/jwt.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CollaborationAuthService } from './collaboration-auth.service.js';
import { PresenceService } from './presense.service.js';
import { RedisModule } from '../common/redis/redis.module.js';
import { YjsPersistenceService } from './yjs/yjs-persistence.service.js';

@Module({
  imports: [DocumentsModule, JwtModule, AuthModule, RedisModule],
  providers: [
    CollaborationGateway,
    CollaborationAuthService,
    PresenceService,
    YjsPersistenceService,
  ],
  exports: [YjsPersistenceService]
})
export class CollaborationModule {};
