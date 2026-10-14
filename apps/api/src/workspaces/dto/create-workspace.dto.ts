import { IsNotEmpty, IsString, IsUUID, Length } from 'class-validator';
import type { UUID } from 'crypto';

export class CreateWorkspaceDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsString()
  description?: string;
}
