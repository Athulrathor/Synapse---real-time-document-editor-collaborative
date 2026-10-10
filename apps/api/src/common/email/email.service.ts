import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private readonly transporter: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService,
  ) {
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
    const verificationUrl =
      `http://localhost:3000/verify-email?token=${token}`;

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
}