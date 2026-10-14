export interface VerificationEmailJob {
  type: 'verification';
  email: string;
  name: string;
  token: string;
}

export interface PasswordResetEmailJob {
  type: 'password-reset';
  email: string;
  name: string;
  token: string;
}

export interface TwoFactorOtpEmailJob {
  type: 'two-factor-otp';
  email: string;
  name: string;
  otp: string;
  expiresInMinutes: number;
}

export type EmailJob =
  | VerificationEmailJob
  | PasswordResetEmailJob
  | TwoFactorOtpEmailJob;
