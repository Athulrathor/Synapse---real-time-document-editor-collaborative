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
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspacesService.create(req.user.userId, dto);
  }

  @Get()
  @ResponseMessage('Workspaces retrieved successfully.')
  findMine(@Req() req: AuthenticatedRequest,) {
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
  @Roles(WorkspaceRole.OWNER,WorkspaceRole.ADMIN)
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

  @Post(':workspaceId/members')
  @UseGuards(WorkspaceRoleGuard)
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Workspace member added successfully.')
  addMember(
    @Param('workspaceId') workspaceId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: AddMemberDto,
  ) {
    this.validateUuid(workspaceId, 'Workspace ID');

    return this.workspacesService.addMember(workspaceId, req.user.userId, dto);
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
