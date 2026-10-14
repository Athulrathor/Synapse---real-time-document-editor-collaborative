import { Optional } from '@nestjs/common';
import { IsString, IsUUID, IsNotEmpty } from 'class-validator';

export class UpdateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @Optional()
  description?: string;
}
