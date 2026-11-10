import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { WorkspaceRole } from '@prisma/client';

import { WorkspacesService } from './workspaces.service.js';
import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto.js';
import { AddMemberDto } from './dto/add-member.dto.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { WorkspaceRoleGuard } from '../common/guards/workspace-role.guard.js';
import { Roles } from '../common/decorators/role.decorator.js';
import { AppException } from '../common/exceptions/app.exception.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';
import { CreateWorkspaceInvitationDto } from './dto/create-workspace-invitation.dto.js';
import { AcceptWorkspaceInvitationDto } from './dto/workspace-invite.dto.js';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  private validateUuid(value: string, fieldName: string): void {
    if (!isUUID(value)) {
      throw new AppException({
        code: 'INVALID_WORKSPACE_ID',
        message: `${fieldName} must be a valid UUID`,
        status: HttpStatus.BAD_REQUEST,
      });
    }
  }

  @Post()
  @ResponseMessage('Workspace created successfully.')
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(req.user.userId, dto);
  }

  @Get()
  @ResponseMessage('Workspaces retrieved successfully.')
  findMine(@Req() req: AuthenticatedRequest) {
    return this.workspacesService.findMine(req.user.userId);
  }

  @Get(':workspaceId')
  @ResponseMessage('Workspace retrieved successfully.')
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.validateUuid(workspaceId, 'Workspace ID');

    return this.workspacesService.findOne(workspaceId, req.user.userId);
  }

  @Patch(':workspaceId')
  @UseGuards(WorkspaceRoleGuard)
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Workspace updated successfully.')
  update(
    @Param('workspaceId') workspaceId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    this.validateUuid(workspaceId, 'Workspace ID');

    return this.workspacesService.update(workspaceId, req.user.userId, dto);
  }

  @Delete(':workspaceId')
  @UseGuards(WorkspaceRoleGuard)
  @Roles(WorkspaceRole.OWNER)
  @ResponseMessage('Workspace deleted successfully.')
  remove(
    @Param('workspaceId') workspaceId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.validateUuid(workspaceId, 'Workspace ID');

    return this.workspacesService.remove(workspaceId, req.user.userId);
  }

  // @Post(':workspaceId/members')
  // @UseGuards(WorkspaceRoleGuard)
  // @Roles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  // @ResponseMessage('Workspace member added successfully.')
  // addMember(
  //   @Param('workspaceId') workspaceId: string,
  //   @Req() req: AuthenticatedRequest,
  //   @Body() dto: AddMemberDto,
  // ) {
  //   this.validateUuid(workspaceId, 'Workspace ID');

  //   return this.workspacesService.addMember(workspaceId, req.user.userId, dto);
  // }

  // temporary
  @Post(':workspaceId/invitations')
  @UseGuards(WorkspaceRoleGuard)
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Workspace invitation created successfully.')
  createInvitation(
    @Param('workspaceId') workspaceId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateWorkspaceInvitationDto,
  ) {
    this.validateUuid(workspaceId, 'Workspace ID');

    return this.workspacesService.createInvitation(
      workspaceId,
      req.user.userId,
      dto,
    );
  }

  @Post('invitations/accept')
  @ResponseMessage('Workspace invitation accepted successfully.')
  acceptInvitation(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AcceptWorkspaceInvitationDto,
  ) {
    return this.workspacesService.acceptInvitation(dto.token, req.user.userId);
  }

  @Delete(':workspaceId/invitations/:invitationId')
  @UseGuards(WorkspaceRoleGuard)
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Workspace invitation revoked successfully.')
  revokeInvitation(
    @Param('workspaceId') workspaceId: string,
    @Param('invitationId') invitationId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.validateUuid(workspaceId, 'Workspace ID');
    this.validateUuid(invitationId, 'Invitation ID');

    return this.workspacesService.revokeInvitation(
      workspaceId,
      invitationId,
      req.user.userId,
    );
  }

  @Post('invitations/reject')
  @ResponseMessage('Workspace invitation rejected successfully.')
  rejectInvitation(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AcceptWorkspaceInvitationDto,
  ) {
    return this.workspacesService.rejectInvitation(dto.token, req.user.userId);
  }

  @Get(':workspaceId/invitations')
  @UseGuards(WorkspaceRoleGuard)
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Workspace invitations retrieved successfully.')
  getWorkspaceInvitations(
    @Param('workspaceId') workspaceId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.validateUuid(workspaceId, 'Workspace ID');

    return this.workspacesService.getWorkspaceInvitations(
      workspaceId,
      req.user.userId,
    );
  }

  @Patch(':workspaceId/members/:userId')
  @UseGuards(WorkspaceRoleGuard)
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Workspace member role updated successfully.')
  updateMemberRole(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    this.validateUuid(workspaceId, 'Workspace ID');
    this.validateUuid(targetUserId, 'User ID');

    return this.workspacesService.updateMemberRole(
      workspaceId,
      req.user.userId,
      targetUserId,
      dto,
    );
  }

  @Delete(':workspaceId/members/:userId')
  @UseGuards(WorkspaceRoleGuard)
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Workspace member removed successfully.')
  removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.validateUuid(workspaceId, 'Workspace ID');
    this.validateUuid(targetUserId, 'User ID');

    return this.workspacesService.removeMember(
      workspaceId,
      req.user.userId,
      targetUserId,
    );
  }
}
