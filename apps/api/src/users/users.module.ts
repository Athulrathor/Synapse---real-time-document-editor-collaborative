import { Module, forwardRef } from '@nestjs/common';

import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { UsersRepository } from './repositories/user.repository.js';
import { AuthModule } from '../auth/auth.module.js';
import { JwtModule } from '../common/jwt/jwt.module.js';
import { ImageKitModule } from '../common/imagekit/imagekit.module.js';

@Module({
  imports: [forwardRef(() => AuthModule), JwtModule,ImageKitModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersRepository],
})
export class UsersModule {}