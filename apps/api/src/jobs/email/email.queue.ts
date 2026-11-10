import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { EmailJob } from './email.types.js';

@Injectable()
export class EmailQueue {
  constructor(
    @InjectQueue('email')
    private readonly queue: Queue<EmailJob>,
  ) {}

  async enqueueVerification(
    data: Extract<EmailJob, { type: 'verification' }>,
    jobId?: string,
  ) {
    return this.queue.add(
      'verification',
      { ...data },
      {
        ...(jobId ? { jobId } : {}),
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2_000,
        },
        removeOnComplete: 1000,
        removeOnFail: false,
      },
    );
  }

  async getJobCounts() {
    return this.queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
    );
  }

  async getFailedJobs() {
    const jobs = await this.queue.getJobs(['failed'], 0);

    return Promise.all(
      jobs.map(async (job) => ({
        id: job.id,
        type: job.data.type,
        email: job.data.email,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
      })),
    );
  }

  async enqueuePasswordReset(
    data: Extract<EmailJob, { type: 'password-reset' }>,
    jobId?: string,
  ) {
    return this.queue.add(
      'password-reset',
      { ...data },
      {
        ...(jobId ? { jobId } : {}),
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2_000,
        },
        removeOnComplete: 1000,
        removeOnFail: false,
      },
    );
  }

  async enqueueTwoFactorOtp(
    data: Extract<EmailJob, { type: 'two-factor-otp' }>,
    jobId?: string,
  ) {
    return this.queue.add(
      'two-factor-otp',
      { ...data },
      {
        ...(jobId ? { jobId } : {}),
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2_000,
        },
        removeOnComplete: 1000,
        removeOnFail: false,
      },
    );
  }

  async enqueueWorkspaceInvitation(
    data: Extract<EmailJob, { type: 'workspace-invitation' }>,
    jobId?: string,
  ) {
    return this.queue.add(
      'workspace-invitation',
      { ...data },
      {
        ...(jobId ? { jobId } : {}),
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2_000,
        },
        removeOnComplete: 1000,
        removeOnFail: false,
      },
    );
  }
}
