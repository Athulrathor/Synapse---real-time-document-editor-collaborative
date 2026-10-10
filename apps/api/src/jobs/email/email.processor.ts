import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { EmailService } from '../../common/email/email.service.js';
import { EmailJob } from './email.types.js';

@Processor('email', {
  concurrency: 5,
})
export class EmailProcessor extends WorkerHost {
  constructor(
    private readonly emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job<EmailJob>): Promise<void> {
    switch (job.data.type) {
      case 'verification':
        await this.emailService.sendVerificationEmail(
          job.data.email,
          job.data.name,
          job.data.token,
        );
        return;

      case 'password-reset':
        throw new Error(
          'Password-reset email handler is not implemented yet.',
        );

      default: {
        const unsupported: never = job.data;
        throw new Error('Unsupported email job');
      }
    }
  }
}