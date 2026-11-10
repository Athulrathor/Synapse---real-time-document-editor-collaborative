import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  @IsNotEmpty()
  newPassword!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  @IsNotEmpty()
  confirmPassword!: string;
}
