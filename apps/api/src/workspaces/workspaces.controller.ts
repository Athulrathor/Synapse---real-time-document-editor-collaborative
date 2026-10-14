import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
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
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/role.decorator.js';
import { AppException } from '../common/exceptions/app.exception.js';

interface AuthenticatedUser {
  userId: string;
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
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspacesService.create(user.userId, dto);
  }

  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.workspacesService.findMine(user.userId);
  }

  @Get(':workspaceId')
  findOne(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.validateUuid(workspaceId, 'Workspace ID');

    return this.workspacesService.findOne(workspaceId, user.userId);
  }

  @Patch(':workspaceId')
  update(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    this.validateUuid(workspaceId, 'Workspace ID');

    return this.workspacesService.update(workspaceId, user.userId, dto);
  }

  @Delete(':workspaceId')
  remove(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.validateUuid(workspaceId, 'Workspace ID');

    return this.workspacesService.remove(workspaceId, user.userId);
  }

  @Post(':workspaceId/members')
  @UseGuards(WorkspaceRoleGuard)
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  addMember(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddMemberDto,
  ) {
    this.validateUuid(workspaceId, 'Workspace ID');

    return this.workspacesService.addMember(workspaceId, user.userId, dto);
  }

  @Patch(':workspaceId/members/:userId')
  @UseGuards(WorkspaceRoleGuard)
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  updateMemberRole(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    this.validateUuid(workspaceId, 'Workspace ID');
    this.validateUuid(targetUserId, 'User ID');

    return this.workspacesService.updateMemberRole(
      workspaceId,
      user.userId,
      targetUserId,
      dto,
    );
  }

  @Delete(':workspaceId/members/:userId')
  @UseGuards(WorkspaceRoleGuard)
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.validateUuid(workspaceId, 'Workspace ID');
    this.validateUuid(targetUserId, 'User ID');

    return this.workspacesService.removeMember(
      workspaceId,
      user.userId,
      targetUserId,
    );
  }
}
