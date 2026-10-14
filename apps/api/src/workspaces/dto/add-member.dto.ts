import { IsEnum, IsString } from 'class-validator';
import { WorkspaceRole } from '@prisma/client';

export class AddMemberDto {
  @IsString()
  email!: string;

  @IsEnum(WorkspaceRole)
  role!: WorkspaceRole;
}
