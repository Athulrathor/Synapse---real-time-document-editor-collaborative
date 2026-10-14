import { IsDateString, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class VerificationDto {
  @IsUUID()
  @IsNotEmpty()
  readonly userId: string;

  @IsString()
  @IsNotEmpty()
  readonly token: string; 

  @IsDateString()
  @IsNotEmpty()
  readonly expiresAt: Date;
}
