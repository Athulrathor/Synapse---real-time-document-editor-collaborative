import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserStatus } from '@prisma/client'; 

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255) 
  readonly email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly name: string;

  // @IsString()
  // @IsNotEmpty()
  // @MaxLength(128)
  // readonly passwordHash: string;

  @IsOptional()
  @IsEnum(UserStatus) 
  readonly status: UserStatus = UserStatus.PENDING;
}
