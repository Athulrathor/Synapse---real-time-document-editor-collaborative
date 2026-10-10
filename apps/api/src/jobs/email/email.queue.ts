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
    data: Extract<EmailJob, { type: 'verification' }>,jobId?: string,
  ) {
    return this.queue.add('verification', {...data}, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2_000,
      },
      removeOnComplete: 1000,
      removeOnFail: false,
    });
  }
}