import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WorkspaceRole } from '@prisma/client';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('email.host'),
      port: this.configService.get<number>('email.port'),
      secure: this.configService.get<boolean>('email.secure'),
      auth: {
        user: this.configService.get<string>('email.user'),
        pass: this.configService.get<string>('email.password'),
      },
    });
  }

  async sendVerificationEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    const verificationUrl = `http://localhost:3000/verify/email?token=${token}`;

    await this.transporter.sendMail({
      from: this.configService.get<string>('email.from'),
      to: email,
      subject: 'Verify your Synapse Workspace account',
      html: `
        <h2>Welcome to Synapse Workspace, ${name}!</h2>

        <p>Please verify your email address by clicking the button below.</p>

        <a
          href="${verificationUrl}"
          style="
            display:inline-block;
            padding:10px 20px;
            background:#000;
            color:#fff;
            text-decoration:none;
            border-radius:6px;
          "
        >
          Verify Email
        </a>

        <p>This link will expire in 15 minutes.</p>
      `,
    });

    this.logger.log(`Verification email sent to ${email}`);
  }

  async sendPasswordResetEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('app.frontendUrl') ??
      'http://localhost:3000';

    // const resetUrl = new URL('/reset/password', frontendUrl);
    // resetUrl.searchParams.set('token', token);

    await this.transporter.sendMail({
      from: this.configService.get<string>('email.from'),
      to: email,
      subject: 'Your Synapse Workspace password reset OTP',
      text: [
        `Hi ${name},`,
        '',
        'We received a request to reset your password.',
        `Your password reset OTP is: ${token}`,
        '',
        'This OTP expires in 5 minutes.',
        'For your security, do not share this OTP with anyone.',
        'If you did not request this, you can ignore this email.',
      ].join('\n'),
      html: `     <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#222">       <h2>Password Reset</h2>       <p>Hi ${this.escapeHtml(name)},</p>       <p>We received a request to reset your Synapse Workspace password.</p>       <p>Use the following OTP to continue:</p>       <div style="background:#f4f4f5;padding:20px;text-align:center;border-radius:8px;margin:24px 0">         <span style="font-size:32px;font-weight:bold;letter-spacing:8px">
          ${this.escapeHtml(token)}         </span>       </div>       <p>This OTP expires in 5 minutes.</p>       <p><strong>For your security, do not share this OTP with anyone.</strong></p>       <p>If you did not request this, you can safely ignore this email.</p>       <p style="font-size:12px;color:#666">Synapse Workspace Security</p>     </div>
  `,
    });

    this.logger.log(`Password-reset email sent to ${email}`);

    this.logger.log(`Password-reset email queued for delivery to ${email}`);
  }

  async sendTwoFactorOtpEmail(
    email: string,
    name: string,
    otp: string,
    expiresInMinutes: number,
  ): Promise<void> {
    const safeName = this.escapeHtml(name);
    const safeOtp = this.escapeHtml(otp);

    await this.transporter.sendMail({
      from: this.configService.get<string>('email.from'),
      to: email,
      subject: 'Your Synapse Workspace login verification code',
      text: [
        `Hi ${name},`,
        '',
        'A login attempt requires email verification.',
        `Your verification code is: ${otp}`,
        '',
        `This code expires in ${expiresInMinutes} minutes.`,
        'Do not share this code with anyone.',
        'If you did not attempt to sign in, secure your account.',
        '',
        'Synapse Workspace Security',
      ].join('\n'),
      html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#222">
        <h2>Verify your login</h2>
        <p>Hi ${safeName},</p>
        <p>A login attempt requires email verification.</p>

        <div style="background:#f4f4f5;padding:20px;text-align:center;border-radius:8px;margin:24px 0">
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px">
            ${safeOtp}
          </span>
        </div>

        <p>This code expires in ${expiresInMinutes} minutes.</p>
        <p><strong>Never share this code with anyone.</strong></p>
        <p>If you did not attempt to sign in, you can ignore this email and secure your account.</p>
        <p style="font-size:12px;color:#666">Synapse Workspace Security</p>
      </div>
    `,
    });

    this.logger.log(`Two-factor OTP email sent to ${email}`);
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };

      return entities[char]!;
    });
  }

  async sendWorkspaceInvitationEmail(
    email: string,
    workspaceName: string,
    inviterName: string,
    role: WorkspaceRole,
    token: string,
    expiresAt: string,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('app.frontendUrl') ??
      'http://localhost:3000';

    const invitationUrl = new URL('/invitations', frontendUrl);
    invitationUrl.searchParams.set('token', token);

    const safeWorkspaceName = this.escapeHtml(workspaceName);
    const safeInviterName = this.escapeHtml(inviterName);
    const safeRole = this.escapeHtml(role);
    const safeInvitationUrl = this.escapeHtml(invitationUrl.toString());

    const expiryDate = new Date(expiresAt);
    const formattedExpiry = Number.isNaN(expiryDate.getTime())
      ? 'within 7 days'
      : expiryDate.toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'Asia/Kolkata',
        });

    await this.transporter.sendMail({
      from: this.configService.get<string>('email.from'),
      to: email,
      subject: `Invitation to join ${workspaceName} on Synapse Workspace`,
      text: [
        `Hi,`,
        '',
        `${inviterName} has invited you to join "${workspaceName}" on Synapse Workspace.`,
        `Your assigned role is: ${role}.`,
        '',
        `Accept your invitation: ${invitationUrl.toString()}`,
        '',
        `This invitation expires on ${formattedExpiry}.`,
        'If you were not expecting this invitation, you can ignore this email.',
        '',
        'Synapse Workspace',
      ].join('\n'),
      html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#222">
        <h2>You're invited to collaborate!</h2>

        <p>
          <strong>${safeInviterName}</strong> has invited you to join
          <strong>${safeWorkspaceName}</strong> on Synapse Workspace.
        </p>

        <p>Your assigned role: <strong>${safeRole}</strong></p>

        <div style="margin:28px 0">
          <a
            href="${safeInvitationUrl}"
            style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold"
          >
            Accept Invitation
          </a>
        </div>

        <p>This invitation expires on ${this.escapeHtml(formattedExpiry)}.</p>

        <p>If you weren't expecting this invitation, you can safely ignore this email.</p>

        <p style="font-size:12px;color:#666">Synapse Workspace</p>
      </div>
    `,
    });

    this.logger.log(`Workspace invitation email sent to ${email}`);
  }
}
