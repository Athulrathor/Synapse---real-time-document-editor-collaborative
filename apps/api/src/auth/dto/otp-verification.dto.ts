import { IsEmail, IsNotEmpty, Matches, MaxLength } from 'class-validator';

export class VerifyPasswordResetOtpDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(254)
  email!: string;

  @IsNotEmpty()
  @Matches(/^\d{6}$/, {
    message: 'OTP must be exactly 6 digits.',
  })
  otp!: string;
}