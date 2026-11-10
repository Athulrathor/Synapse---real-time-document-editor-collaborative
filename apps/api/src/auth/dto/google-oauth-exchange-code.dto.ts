import { IsString, MinLength } from 'class-validator';

export class GoogleOAuthExchangeDto {
  @IsString()
  @MinLength(32)
  code: string;
}
