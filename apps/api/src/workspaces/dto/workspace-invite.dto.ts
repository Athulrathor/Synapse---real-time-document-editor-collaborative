import { IsString, MinLength } from 'class-validator';

export class AcceptWorkspaceInvitationDto {
  @IsString()
  @MinLength(1)
  token: string;
}
