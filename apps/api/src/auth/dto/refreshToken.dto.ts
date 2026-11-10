import { Avatar, type User } from '@prisma/client';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { AuthUserResponse } from './auth.dto.js';

export class RefreshTokenDto {
  // @IsNotEmpty()
  @IsOptional()
  refreshToken?: string;
}

export class RefreshTokenPayloadDto {
  @IsString()
  @IsNotEmpty()
  sub!: string;

  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsInt()
  @Min(0)
  tokenVersion!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  iat?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  exp?: number;
}

export class RefreshTokenResponseDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  user: AuthUserResponse;
}
