import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { EmailService } from '../../common/email/email.service.js';
import { EmailJob } from './email.types.js';
import { EncryptionService } from '../../common/crypto/encryption.service.js';

@Processor('email', {
  concurrency: 5,
})
export class EmailProcessor extends WorkerHost {
  constructor(
    private readonly emailService: EmailService,
    private readonly encryptionService: EncryptionService,
  ) {
    super();
  }

  async process(job: Job<EmailJob>): Promise<void> {
    switch (job.data.type) {
      case 'verification': {
        const token = await this.encryptionService.decrypt(job.data.token);
        await this.emailService.sendVerificationEmail(
          job.data.email,
          job.data.name,
          token,
        );
        return;
      }

      case 'password-reset':
        const otpHash = await this.encryptionService.decrypt(job.data.token);
        await this.emailService.sendPasswordResetEmail(
          job.data.email,
          job.data.name,
          otpHash,
        );
        return;

      case 'two-factor-otp':
        await this.emailService.sendTwoFactorOtpEmail(
          job.data.email,
          job.data.name,
          job.data.otp,
          job.data.expiresInMinutes,
        );
        return;

      case 'workspace-invitation': {
        const token = await this.encryptionService.decrypt(job.data.token);
        await this.emailService.sendWorkspaceInvitationEmail(
          job.data.email,
          job.data.workspaceName,
          job.data.inviterName,
          job.data.role,
          token,
          job.data.expiresAt,
        );
        return;
      }

      default: {
        const unsupported: never = job.data;
        throw new Error('Unsupported email job');
      }
    }
  }
}
