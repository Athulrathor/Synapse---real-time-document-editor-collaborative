import { Module } from '@nestjs/common';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import { JwtTokenService } from './jwt.service.js';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [ConfigModule,
    NestJwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>(
          'jwt.accessSecret',
        ),
        signOptions: {
          expiresIn: '10m',
        },
      }),
    }),],
  providers: [JwtTokenService],
  exports: [JwtTokenService],
})
export class JwtModule {}
