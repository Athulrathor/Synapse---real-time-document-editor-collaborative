import { UserStatus } from '@prisma/client';
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

export interface AuthUserResponse {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  avatar: {
    id: string;
    fileId: string;
    name: string;
    path: string;
  } | null;
}
