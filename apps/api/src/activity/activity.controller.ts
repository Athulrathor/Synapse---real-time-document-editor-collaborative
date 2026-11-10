import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';

import type { Request } from 'express';

import { ActivityService } from './activity.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';
import { AppException } from '../common/exceptions/app.exception.js';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @ResponseMessage('Activity timeline retrieved successfully.')
  findGlobalActivity(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const parsedLimit = limit === undefined ? 20 : Number(limit);

    if (
      !Number.isSafeInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 50
    ) {
      throw new AppException({
        code: 'INVALID_ACTIVITY_LIMIT',
        message: 'Limit must be an integer between 1 and 50.',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return this.activityService.findGlobalActivity(
      req.user.userId,
      parsedLimit,
      cursor,
    );
  }
}