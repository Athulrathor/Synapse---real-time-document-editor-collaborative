
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  resetToken!: string;

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
