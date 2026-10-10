import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtTokenService {
  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateAccessToken(payload: object): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>(
        'jwt.accessSecret',
      ),
      expiresIn: '10m',
    });
  }

  async generateRefreshToken(payload: object): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>(
        'jwt.refreshSecret',
      ),
      expiresIn: '30d',
    });
  }

  async verifyAccessToken<T extends object>(
    token: string,
  ): Promise<T> {
    return this.jwtService.verifyAsync<T>(token, {
      secret: this.configService.getOrThrow<string>(
        'jwt.accessSecret',
      ),
    });
  }

  async verifyRefreshToken<T extends object>(
    token: string,
  ): Promise<T> {
    return this.jwtService.verifyAsync<T>(token, {
      secret: this.configService.getOrThrow<string>(
        'jwt.refreshSecret',
      ),
    });
  }
}