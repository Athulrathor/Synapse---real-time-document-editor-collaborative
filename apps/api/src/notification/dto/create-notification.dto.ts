import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { NotificationResourceType, NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @IsUUID()
  @IsNotEmpty()
  recipientId: string;

  @IsOptional()
  @IsUUID()
  actorId?: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;

  @IsOptional()
  @IsString()
  dedupeKey?: string;

  @IsOptional()
  @IsEnum(NotificationResourceType)
  resourceType?: NotificationResourceType;

  @IsOptional()
  @IsUUID()
  resourceId?: string;
}
