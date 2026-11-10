import { Injectable } from '@nestjs/common';

import { ActivityRepository } from './repository/activity.repository.js';
import { AppException } from '../common/exceptions/app.exception.js';
import { HttpStatus } from '@nestjs/common';
import { isUUID } from 'class-validator';

@Injectable()
export class ActivityService {
  constructor(
    private readonly activityRepository: ActivityRepository,
  ) {}

  async findGlobalActivity(
    userId: string,
    limit = 20,
    cursor?: string,
  ) {
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    if (cursor && !isUUID(cursor)) {
      throw new AppException({
        code: 'INVALID_ACTIVITY_CURSOR',
        message: 'Activity cursor must be a valid UUID.',
        status: HttpStatus.BAD_REQUEST,
        details: { cursor },
      });
    }

    return this.activityRepository.findGlobalActivity(
      userId,
      safeLimit,
      cursor,
    );
  }
}