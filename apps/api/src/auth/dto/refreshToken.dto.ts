import {
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  refreshToken!: string;
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
  @IsBoolean() success!: boolean;
  @IsString() @IsNotEmpty() message!: string;
  @IsString() @IsNotEmpty() accessToken!: string;
  @IsString() @IsNotEmpty() refreshToken!: string;
}
