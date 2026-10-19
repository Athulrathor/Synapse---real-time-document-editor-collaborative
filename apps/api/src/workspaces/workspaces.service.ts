import { HttpStatus, Injectable } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';

import {
  WorkspaceMemberAlreadyExistsError,
  WorkspacesRepository,
} from './repository/workspace.repository.js';
import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto.js';
import { AppException } from '../common/exceptions/app.exception.js';
import { AddMemberDto } from './dto/add-member.dto.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';
import { RedisService } from '../common/redis/redis.service.js';

const WORKSPACE_NOT_FOUND = {
  code: 'WORKSPACE_NOT_FOUND',
  message: 'Workspace not found.',
  status: HttpStatus.NOT_FOUND,
} as const;

const INSUFFICIENT_PERMISSIONS = {
  code: 'INSUFFICIENT_WORKSPACE_PERMISSIONS',
  message: 'You do not have permission to perform this action.',
  status: HttpStatus.FORBIDDEN,
} as const;

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly redisService: RedisService,
  ) {}

  async findMine(userId: string) {
    const cacheKey = `workspaces:user:${userId}`;

    return this.redisService.remember(cacheKey, 60, () =>
      this.workspacesRepository.findMine(userId),
    );
  }

  async findOne(workspaceId: string, userId: string) {
    const cacheKey = `workspace:${workspaceId}:member:${userId}`;
    const trackingKey = `workspace:${workspaceId}:cache-keys`;

    const workspace = await this.redisService.remember(
      cacheKey,
      60,
      () => this.workspacesRepository.findOneForMember(workspaceId, userId),
      trackingKey,
    );

    if (!workspace) {
      throw new AppException(WORKSPACE_NOT_FOUND);
    }

    return workspace;
  }

  async create(userId: string, dto: CreateWorkspaceDto) {
    const workspace = await this.workspacesRepository.createWorkspaceWithOwner(
      userId,
      {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
      },
    );

    await this.redisService.deleteCache(`workspaces:user:${userId}`);

    return workspace;
  }

  async update(workspaceId: string, userId: string, dto: UpdateWorkspaceDto) {
    const membership = await this.workspacesRepository.findMembership(
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new AppException(WORKSPACE_NOT_FOUND);
    }

    if (
      membership.role !== WorkspaceRole.OWNER &&
      membership.role !== WorkspaceRole.ADMIN
    ) {
      throw new AppException({
        ...INSUFFICIENT_PERMISSIONS,
        message:
          'Only workspace owners and administrators can update workspace details.',
      });
    }

    const updatedWorkspace = await this.workspacesRepository.updateWorkspace(
      workspaceId,
      {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() || null,
        }),
      },
    );

    await this.redisService.invalidateTrackedCache(
      `workspace:${workspaceId}:cache-keys`,
    );

    const members = await this.workspacesRepository.findMemberIds(workspaceId);

    await Promise.all(
      members.map(({ userId }) =>
        this.redisService.deleteCache(`workspaces:user:${userId}`),
      ),
    );

    return updatedWorkspace;
  }

  async remove(workspaceId: string, userId: string) {
    const membership = await this.workspacesRepository.findMembership(
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new AppException(WORKSPACE_NOT_FOUND);
    }

    if (membership.role !== WorkspaceRole.OWNER) {
      throw new AppException({
        ...INSUFFICIENT_PERMISSIONS,
        message: 'Only the workspace owner can delete the workspace.',
      });
    }

    const members = await this.workspacesRepository.findMemberIds(workspaceId);

    await this.workspacesRepository.deleteWorkspace(workspaceId);

    await this.redisService.invalidateTrackedCache(
      `workspace:${workspaceId}:cache-keys`,
    );

    await Promise.all(
      members.map(({ userId }) =>
        this.redisService.deleteCache(`workspaces:user:${userId}`),
      ),
    );

    return;
  }

  async addMember(workspaceId: string, actorId: string, dto: AddMemberDto) {
    const actorMembership = await this.workspacesRepository.findMembership(
      workspaceId,
      actorId,
    );

    if (!actorMembership) {
      throw new AppException(WORKSPACE_NOT_FOUND);
    }

    if (
      actorMembership.role !== WorkspaceRole.OWNER &&
      actorMembership.role !== WorkspaceRole.ADMIN
    ) {
      throw new AppException({
        ...INSUFFICIENT_PERMISSIONS,
        message: 'Only workspace owners and administrators can add members.',
      });
    }

    const role = dto.role ?? WorkspaceRole.VIEWER;

    if (role === WorkspaceRole.OWNER) {
      throw new AppException({
        code: 'OWNER_ROLE_ASSIGNMENT_NOT_ALLOWED',
        message: 'The owner role cannot be assigned when adding a member.',
        status: HttpStatus.FORBIDDEN,
      });
    }

    // Only the owner can grant administrator privileges.
    if (
      role === WorkspaceRole.ADMIN &&
      actorMembership.role !== WorkspaceRole.OWNER
    ) {
      throw new AppException({
        ...INSUFFICIENT_PERMISSIONS,
        message: 'Only the workspace owner can grant the administrator role.',
      });
    }

    const user = await this.workspacesRepository.findUserByEmail(dto.email);

    if (!user) {
      throw new AppException({
        code: 'USER_NOT_FOUND',
        message: 'No user was found with that email address.',
        status: HttpStatus.NOT_FOUND,
      });
    }

    const existingMember = await this.workspacesRepository.findMember(
      workspaceId,
      user.id,
    );

    if (existingMember) {
      throw new AppException({
        code: 'WORKSPACE_MEMBER_ALREADY_EXISTS',
        message: 'User is already a member of this workspace.',
        status: HttpStatus.CONFLICT,
      });
    }

    let member = null;

    try {
      member = await this.workspacesRepository.createMember(
        workspaceId,
        user.id,
        role,
      );
    } catch (error) {
      if (error instanceof WorkspaceMemberAlreadyExistsError) {
        throw new AppException({
          code: 'WORKSPACE_MEMBER_ALREADY_EXISTS',
          message: 'This user is already a member of the workspace.',
          status: HttpStatus.CONFLICT,
        });
      }

      throw error;
    }

    await this.redisService.invalidateTrackedCache(
      `workspace:${workspaceId}:cache-keys`,
    );

    await this.redisService.deleteCache(`workspaces:user:${user.id}`);

    return member;
  }

  async updateMemberRole(
    workspaceId: string,
    actorId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
  ) {
    const actorMembership = await this.workspacesRepository.findMembership(
      workspaceId,
      actorId,
    );

    if (!actorMembership) {
      throw new AppException(WORKSPACE_NOT_FOUND);
    }

    if (
      actorMembership.role !== WorkspaceRole.OWNER &&
      actorMembership.role !== WorkspaceRole.ADMIN
    ) {
      throw new AppException({
        ...INSUFFICIENT_PERMISSIONS,
        message:
          'Only workspace owners and administrators can change member roles.',
      });
    }

    if (dto.role === WorkspaceRole.OWNER) {
      throw new AppException({
        code: 'OWNER_ROLE_ASSIGNMENT_NOT_ALLOWED',
        message:
          'The owner role cannot be assigned through member role updates.',
        status: HttpStatus.FORBIDDEN,
      });
    }

    const targetMembership = await this.workspacesRepository.findMember(
      workspaceId,
      targetUserId,
    );

    if (!targetMembership) {
      throw new AppException({
        code: 'WORKSPACE_MEMBER_NOT_FOUND',
        message: 'Workspace member not found.',
        status: HttpStatus.NOT_FOUND,
      });
    }

    if (targetMembership.role === WorkspaceRole.OWNER) {
      throw new AppException({
        ...INSUFFICIENT_PERMISSIONS,
        message: 'The workspace owner role cannot be changed here.',
      });
    }

    // Only the owner can grant/revoke administrator privileges.
    if (
      actorMembership.role !== WorkspaceRole.OWNER &&
      (dto.role === WorkspaceRole.ADMIN ||
        targetMembership.role === WorkspaceRole.ADMIN)
    ) {
      throw new AppException({
        ...INSUFFICIENT_PERMISSIONS,
        message:
          'Only the workspace owner can grant or revoke the administrator role.',
      });
    }

    const updatedMember = await this.workspacesRepository.updateMemberRole(
      workspaceId,
      targetUserId,
      dto.role,
    );

    await this.redisService.invalidateTrackedCache(
      `workspace:${workspaceId}:cache-keys`,
    );

    await this.redisService.deleteCache(`workspaces:user:${targetUserId}`);

    return updatedMember;
  }

  async removeMember(
    workspaceId: string,
    actorId: string,
    targetUserId: string,
  ) {
    const actorMembership = await this.workspacesRepository.findMembership(
      workspaceId,
      actorId,
    );

    if (!actorMembership) {
      throw new AppException(WORKSPACE_NOT_FOUND);
    }

    if (
      actorMembership.role !== WorkspaceRole.OWNER &&
      actorMembership.role !== WorkspaceRole.ADMIN
    ) {
      throw new AppException({
        ...INSUFFICIENT_PERMISSIONS,
        message: 'Only workspace owners and administrators can remove members.',
      });
    }

    const targetMembership = await this.workspacesRepository.findMember(
      workspaceId,
      targetUserId,
    );

    if (!targetMembership) {
      throw new AppException({
        code: 'WORKSPACE_MEMBER_NOT_FOUND',
        message: 'Workspace member not found.',
        status: HttpStatus.NOT_FOUND,
      });
    }

    if (targetMembership.role === WorkspaceRole.OWNER) {
      throw new AppException({
        ...INSUFFICIENT_PERMISSIONS,
        message: 'The workspace owner cannot be removed.',
      });
    }

    // Only the owner can remove an administrator.
    if (
      actorMembership.role !== WorkspaceRole.OWNER &&
      targetMembership.role === WorkspaceRole.ADMIN
    ) {
      throw new AppException({
        ...INSUFFICIENT_PERMISSIONS,
        message: 'Only the workspace owner can remove an administrator.',
      });
    }

    const removedMember = await this.workspacesRepository.deleteMember(
      workspaceId,
      targetUserId,
    );

    await this.redisService.invalidateTrackedCache(
      `workspace:${workspaceId}:cache-keys`,
    );

    await this.redisService.deleteCache(`workspaces:user:${targetUserId}`);

    return removedMember;
  }
}
