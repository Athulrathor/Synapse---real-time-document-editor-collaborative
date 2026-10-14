import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AuthDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly userId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  readonly passwordHash: string;
}
