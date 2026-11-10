import { HttpStatus, Injectable } from '@nestjs/common';
import { WorkspaceInvitationStatus, WorkspaceRole } from '@prisma/client';

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
import { CreateWorkspaceInvitationDto } from './dto/create-workspace-invitation.dto.js';
import { TokenService } from '../common/crypto/token.service.js';
import { EncryptionService } from '../common/crypto/encryption.service.js';

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
    private readonly tokenService: TokenService,
    private readonly encryptionService: EncryptionService,
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

  // async addMember(workspaceId: string, actorId: string, dto: AddMemberDto) {
  //   const actorMembership = await this.workspacesRepository.findMembership(
  //     workspaceId,
  //     actorId,
  //   );

  //   if (!actorMembership) {
  //     throw new AppException(WORKSPACE_NOT_FOUND);
  //   }

  //   if (
  //     actorMembership.role !== WorkspaceRole.OWNER &&
  //     actorMembership.role !== WorkspaceRole.ADMIN
  //   ) {
  //     throw new AppException({
  //       ...INSUFFICIENT_PERMISSIONS,
  //       message: 'Only workspace owners and administrators can add members.',
  //     });
  //   }

  //   const role = dto.role ?? WorkspaceRole.VIEWER;

  //   if (role === WorkspaceRole.OWNER) {
  //     throw new AppException({
  //       code: 'OWNER_ROLE_ASSIGNMENT_NOT_ALLOWED',
  //       message: 'The owner role cannot be assigned when adding a member.',
  //       status: HttpStatus.FORBIDDEN,
  //     });
  //   }

  //   // Only the owner can grant administrator privileges.
  //   if (
  //     role === WorkspaceRole.ADMIN &&
  //     actorMembership.role !== WorkspaceRole.OWNER
  //   ) {
  //     throw new AppException({
  //       ...INSUFFICIENT_PERMISSIONS,
  //       message: 'Only the workspace owner can grant the administrator role.',
  //     });
  //   }

  //   const user = await this.workspacesRepository.findUserByEmail(dto.email);

  //   if (!user) {
  //     throw new AppException({
  //       code: 'USER_NOT_FOUND',
  //       message: 'No user was found with that email address.',
  //       status: HttpStatus.NOT_FOUND,
  //     });
  //   }

  //   const existingMember = await this.workspacesRepository.findMember(
  //     workspaceId,
  //     user.id,
  //   );

  //   if (existingMember) {
  //     throw new AppException({
  //       code: 'WORKSPACE_MEMBER_ALREADY_EXISTS',
  //       message: 'User is already a member of this workspace.',
  //       status: HttpStatus.CONFLICT,
  //     });
  //   }

  //   let member = null;

  //   try {
  //     member = await this.workspacesRepository.createMember(
  //       workspaceId,
  //       user.id,
  //       role,
  //     );
  //   } catch (error) {
  //     if (error instanceof WorkspaceMemberAlreadyExistsError) {
  //       throw new AppException({
  //         code: 'WORKSPACE_MEMBER_ALREADY_EXISTS',
  //         message: 'This user is already a member of the workspace.',
  //         status: HttpStatus.CONFLICT,
  //       });
  //     }

  //     throw error;
  //   }

  //   await this.redisService.invalidateTrackedCache(
  //     `workspace:${workspaceId}:cache-keys`,
  //   );

  //   await this.redisService.deleteCache(`workspaces:user:${user.id}`);

  //   return member;
  // }

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

  async createInvitation(
    workspaceId: string,
    actorId: string,
    dto: CreateWorkspaceInvitationDto,
  ) {
    // 1. Verify the actor's workspace membership.
    const actorMembership = await this.workspacesRepository.findMembership(
      workspaceId,
      actorId,
    );

    if (!actorMembership) {
      throw new AppException(WORKSPACE_NOT_FOUND);
    }

    // 2. Only owners and administrators can invite members.
    if (
      actorMembership.role !== WorkspaceRole.OWNER &&
      actorMembership.role !== WorkspaceRole.ADMIN
    ) {
      throw new AppException({
        ...INSUFFICIENT_PERMISSIONS,
        message: 'Only workspace owners and administrators can invite members.',
      });
    }

    // 3. Normalize the email address.
    const normalizedEmail = dto.email.trim().toLowerCase();

    // 4. Determine the invitation role.
    const role = dto.role ?? WorkspaceRole.VIEWER;

    if (role === WorkspaceRole.OWNER) {
      throw new AppException({
        code: 'OWNER_ROLE_ASSIGNMENT_NOT_ALLOWED',
        message: 'The owner role cannot be assigned through an invitation.',
        status: HttpStatus.FORBIDDEN,
      });
    }

    // Only the owner can invite administrators.
    if (
      role === WorkspaceRole.ADMIN &&
      actorMembership.role !== WorkspaceRole.OWNER
    ) {
      throw new AppException({
        ...INSUFFICIENT_PERMISSIONS,
        message: 'Only the workspace owner can invite administrators.',
      });
    }

    // 5. Fetch the workspace and inviter.
    const [workspace, actor, invitedUser] = await Promise.all([
      this.workspacesRepository.findWorkspaceForInvitation(workspaceId),
      this.workspacesRepository.findUserById(actorId),
      this.workspacesRepository.findUserByEmail(normalizedEmail),
    ]);

    if (!workspace) {
      throw new AppException(WORKSPACE_NOT_FOUND);
    }

    if (!actor) {
      throw new AppException({
        code: 'INVITER_NOT_FOUND',
        message: 'The inviting user could not be found.',
        status: HttpStatus.NOT_FOUND,
      });
    }

    // 6. Prevent inviting an existing member.
    if (invitedUser) {
      const existingMember = await this.workspacesRepository.findMember(
        workspaceId,
        invitedUser.id,
      );

      if (existingMember) {
        throw new AppException({
          code: 'WORKSPACE_MEMBER_ALREADY_EXISTS',
          message: 'This user is already a member of the workspace.',
          status: HttpStatus.CONFLICT,
        });
      }
    }

    // 7. Prevent duplicate active invitations.
    const existingInvitation =
      await this.workspacesRepository.findPendingInvitation(
        workspaceId,
        normalizedEmail,
      );

    if (existingInvitation) {
      throw new AppException({
        code: 'WORKSPACE_INVITATION_ALREADY_PENDING',
        message: 'An active invitation already exists for this email.',
        status: HttpStatus.CONFLICT,
      });
    }

    // 8. Generate the invitation token using TokenService.
    const rawToken = await this.tokenService.generateRandomToken(32);
    const tokenHash = await this.tokenService.hashToken(rawToken);

    const encryptedToken = await this.encryptionService.encrypt(rawToken);

    // Invitations expire after seven days.
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 9. Build the email payload.
    const outboxPayload = {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      email: normalizedEmail,
      inviterName: actor.name,
      role,
      token: encryptedToken,
      expiresAt: expiresAt.toISOString(),
    };

    // 10. Persist invitation and outbox event atomically.
    const invitation = await this.workspacesRepository.createInvitation(
      {
        workspaceId: workspace.id,
        email: normalizedEmail,
        invitedById: actorId,
        invitedUserId: invitedUser?.id ?? null,
        role,
        tokenHash,
        expiresAt,
      },
      outboxPayload,
    );

    return invitation;
  }

  async acceptInvitation(token: string, userId: string) {
    if (!token?.trim()) {
      throw new AppException({
        code: 'WORKSPACE_INVITATION_TOKEN_REQUIRED',
        message: 'An invitation token is required.',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    // 1. Hash the raw token before looking up the invitation.
    const tokenHash = await this.tokenService.hashToken(token);

    const invitation =
      await this.workspacesRepository.findInvitationByTokenHash(tokenHash);

    if (!invitation) {
      throw new AppException({
        code: 'WORKSPACE_INVITATION_NOT_FOUND',
        message: 'Invitation not found or the token is invalid.',
        status: HttpStatus.NOT_FOUND,
      });
    }

    // 2. Check invitation state before starting the transaction.
    if (invitation.status !== WorkspaceInvitationStatus.PENDING) {
      throw new AppException({
        code: 'WORKSPACE_INVITATION_NOT_PENDING',
        message: 'This invitation is no longer pending.',
        status: HttpStatus.CONFLICT,
      });
    }

    // if (invitation.expiresAt <= new Date()) {
    //   throw new AppException({
    //     code: 'WORKSPACE_INVITATION_EXPIRED',
    //     message: 'This invitation has expired.',
    //     status: HttpStatus.GONE,
    //   });
    // }

    // 3. Ensure the authenticated user owns the invited email address.
    const user = await this.workspacesRepository.findUserById(userId);

    if (
      !user ||
      user.email.trim().toLowerCase() !== invitation.email.toLowerCase()
    ) {
      throw new AppException({
        code: 'WORKSPACE_INVITATION_EMAIL_MISMATCH',
        message: 'This invitation belongs to a different email address.',
        status: HttpStatus.FORBIDDEN,
      });
    }

    // 4. Atomically accept the invitation and create workspace membership.
    const result = await this.workspacesRepository.acceptInvitation(
      invitation.id,
      userId,
    );

    if ('expired' in result && result.expired) {
      throw new AppException({
        code: 'INVITATION_EXPIRED',
        message: 'This invitation has expired.',
        status: HttpStatus.GONE,
      });
    }

    return result;
  }

  async revokeInvitation(
    workspaceId: string,
    invitationId: string,
    actorId: string,
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
          'Only workspace owners and administrators can revoke invitations.',
      });
    }

    const invitation = await this.workspacesRepository.revokeInvitation(
      workspaceId,
      invitationId,
    );

    if (!invitation) {
      throw new AppException({
        code: 'WORKSPACE_INVITATION_NOT_REVOCABLE',
        message: 'Invitation not found or is no longer pending.',
        status: HttpStatus.CONFLICT,
      });
    }

    return invitation;
  }

  async rejectInvitation(token: string, userId: string) {
    if (!token?.trim()) {
      throw new AppException({
        code: 'INVALID_INVITATION_TOKEN',
        message: 'Invitation token is required.',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    // 1. Find invitation using the hashed token
    const tokenHash = await this.tokenService.hashToken(token);

    const invitation =
      await this.workspacesRepository.findInvitationByTokenHash(tokenHash);

    if (!invitation) {
      throw new AppException({
        code: 'INVITATION_NOT_FOUND',
        message: 'Invitation not found.',
        status: HttpStatus.NOT_FOUND,
      });
    }

    // 2. Verify invitation status
    if (invitation.status !== WorkspaceInvitationStatus.PENDING) {
      throw new AppException({
        code: 'INVITATION_NOT_PENDING',
        message: 'This invitation is no longer pending.',
        status: HttpStatus.CONFLICT,
      });
    }

    // 3. Verify expiration
    if (invitation.expiresAt <= new Date()) {
      throw new AppException({
        code: 'INVITATION_EXPIRED',
        message: 'This invitation has expired.',
        status: HttpStatus.GONE,
      });
    }

    // 4. Verify the authenticated user's email
    const user = await this.workspacesRepository.findUserById(userId);

    if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new AppException({
        code: 'INVITATION_EMAIL_MISMATCH',
        message: 'This invitation does not belong to your account.',
        status: HttpStatus.FORBIDDEN,
      });
    }

    // 5. Reject invitation
    const rejectedInvitation = await this.workspacesRepository.rejectInvitation(
      invitation.id,
      userId,
    );

    if (!rejectedInvitation) {
      throw new AppException({
        code: 'INVITATION_RESPONSE_FAILED',
        message:
          'Invitation could not be rejected. It may have already been responded to.',
        status: HttpStatus.CONFLICT,
      });
    }

    return rejectedInvitation;
  }

  async getWorkspaceInvitations(workspaceId: string, actorId: string) {
    // 1. Verify workspace membership
    const actorMembership = await this.workspacesRepository.findMembership(
      workspaceId,
      actorId,
    );

    if (!actorMembership) {
      throw new AppException(WORKSPACE_NOT_FOUND);
    }

    // 2. Only OWNER and ADMIN can view invitations
    if (
      actorMembership.role !== WorkspaceRole.OWNER &&
      actorMembership.role !== WorkspaceRole.ADMIN
    ) {
      throw new AppException({
        ...INSUFFICIENT_PERMISSIONS,
        message:
          'Only workspace owners and administrators can view invitations.',
      });
    }

    // 3. Fetch invitations
    return this.workspacesRepository.findWorkspaceInvitations(workspaceId);
  }
}
