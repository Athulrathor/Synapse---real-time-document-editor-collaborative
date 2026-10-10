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

export type EmailJob =
  | VerificationEmailJob
  | PasswordResetEmailJob;