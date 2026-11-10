import { IsOptional, IsString, Length } from 'class-validator';
import type { UUID } from 'crypto';
import { optional } from 'joi';

export class CreateWorkspaceDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsString()
  description?: string;
}
