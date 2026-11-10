import {
  Controller,
  Get,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';

import { NotificationService } from './notification.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ResponseMessage('Notifications retrieved successfully.')
  getNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationService.getNotifications(
      user.userId,
      page,
      limit,
      unreadOnly === 'true',
    );
  }

  @Get('unread/count')
  @ResponseMessage('Unread notification retrieved successfully!.')
  getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.getUnreadCount(user.userId);
  }

  @Patch(':id/read')
  @ResponseMessage('Notification marked as read successfully!.')
  markAsRead(
    @Param('id', ParseUUIDPipe) notificationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.markAsRead(notificationId, user.userId);
  }

  @Patch('read/all')
  @ResponseMessage('Mark all Notification read successfully!.')
  markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.markAllAsRead(user.userId);
  }

  @Delete(':id')
  @ResponseMessage('Notification deleted successfully!.')
  deleteNotification(
    @Param('id', ParseUUIDPipe) notificationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.deleteNotification(
      notificationId,
      user.userId,
    );
  }
}
