import { WorkspaceRole } from '@prisma/client';

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

export interface WorkspaceInvitationEmailJob {
  type: 'workspace-invitation';
  email: string;
  workspaceName: string;
  inviterName: string;
  role: WorkspaceRole;
  token: string;
  expiresAt: string;
}

export type EmailJob =
  | VerificationEmailJob
  | PasswordResetEmailJob
  | TwoFactorOtpEmailJob
  | WorkspaceInvitationEmailJob;
