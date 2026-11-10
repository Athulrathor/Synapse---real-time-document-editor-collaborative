import { HttpStatus, Injectable } from '@nestjs/common';
import {
  Prisma,
  WorkspaceInvitationStatus,
  WorkspaceRole,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { PrismaTransaction } from '../../database/prisma.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { NotificationRepository } from '../../notification/repository/notification.repository.js';

export interface WorkspaceInvitationEmailPayload {
  invitationId: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  inviterName: string;
  role: WorkspaceRole;
  token: string;
  expiresAt: string;
}

@Injectable()
export class WorkspacesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationRepository: NotificationRepository,
  ) {}

  private isPrismaError(
    error: unknown,
    code: string,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === code
    );
  }

  findMine(userId: string) {
    return this.prisma.workspace.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        members: {
          where: { userId },
          select: {
            role: true,
            joinedAt: true,
          },
        },
        _count: {
          select: {
            members: true,
            documents: true,
          },
        },
      },
    });
  }

  findOneForMember(workspaceId: string, userId: string) {
    return this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        members: {
          some: { userId },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        members: {
          select: {
            userId: true,
            role: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: {
                  select: {
                    path: true,
                  },
                },
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: {
          select: {
            members: true,
            documents: true,
          },
        },
      },
    });
  }

  findMembership(workspaceId: string, userId: string) {
    return this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      select: { role: true },
    });
  }

  createWorkspaceWithOwner(
    userId: string,
    data: { name: string; description: string | null },
  ) {
    return this.prisma.$transaction(async (tx: PrismaTransaction) => {
      const workspace = await tx.workspace.create({
        data: {
          name: data.name,
          description: data.description,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: WorkspaceRole.OWNER,
        },
      });

      return workspace;
    });
  }

  updateWorkspace(
    workspaceId: string,
    data: {
      name?: string;
      description?: string | null;
    },
  ) {
    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data,
    });
  }

  deleteWorkspace(workspaceId: string) {
    return this.prisma.workspace.delete({
      where: { id: workspaceId },
    });
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email: email.trim().toLowerCase(),
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
  }

  async findPendingInvitation(workspaceId: string, email: string) {
    return await this.prisma.workspaceInvitation.findFirst({
      where: {
        workspaceId,
        email: email.trim().toLowerCase(),
        status: WorkspaceInvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
      },
    });
  }

  async createInvitation(
    data: {
      workspaceId: string;
      email: string;
      invitedById: string;
      invitedUserId: string | null;
      role: WorkspaceRole;
      tokenHash: string;
      expiresAt: Date;
    },
    outboxPayload: {
      workspaceId: string;
      workspaceName: string;
      email: string;
      inviterName: string;
      role: WorkspaceRole;
      token: string;
      expiresAt: string;
    },
  ) {
    return this.prisma.$transaction(async (tx: PrismaTransaction) => {
      // 1. Create the invitation.
      const invitation = await tx.workspaceInvitation.create({
        data,
        select: {
          id: true,
          workspaceId: true,
          invitedUserId: true,
          email: true,
          role: true,
          status: true,
          expiresAt: true,
          createdAt: true,
        },
      });

      // 2. Create the email event in the same transaction.
      if (invitation.invitedUserId) {
        await tx.outboxEvent.create({
          data: {
            eventType: 'WORKSPACE_INVITATION_NOTIFICATION_REQUESTED',
            aggregateId: invitation.id,
            payload: {
              recipientId: invitation.invitedUserId,
              actorId: data.invitedById,
              invitationId: invitation.id,
              workspaceId: invitation.workspaceId,
              workspaceName: outboxPayload.workspaceName,
              role: invitation.role,
            } satisfies Prisma.InputJsonObject,
          },
        });
      }

      // 3. Create the email event in the same transaction.
      await tx.outboxEvent.create({
        data: {
          eventType: 'WORKSPACE_INVITATION_EMAIL_REQUESTED',
          aggregateId: invitation.id,
          payload: outboxPayload as Prisma.InputJsonValue,
        },
      });

      return invitation;
    });
  }

  async findMember(workspaceId: string, userId: string) {
    return this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      select: {
        userId: true,
        role: true,
        joinedAt: true,
      },
    });
  }

  // async createMember(workspaceId: string, userId: string, role: WorkspaceRole) {
  //   try {
  //     return await this.prisma.workspaceMember.create({
  //       data: {
  //         workspaceId,
  //         userId,
  //         role,
  //       },
  //     });
  //   } catch (error: unknown) {
  //     if (this.isPrismaError(error, 'P2002')) {
  //       // The unique constraint handles concurrent duplicate requests.
  //       throw new WorkspaceMemberAlreadyExistsError();
  //     }

  //     throw new AppException({
  //       code: 'WORKSPACES_MEMBER_ALREADY_EXISTS_ERROR.',
  //       message: 'Workspace member already exists.',
  //       status: HttpStatus.INTERNAL_SERVER_ERROR,
  //       details: new WorkspaceMemberAlreadyExistsError(),
  //     });
  //   }
  // }

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ) {
    return this.prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      data: { role },
    });
  }

  async deleteMember(workspaceId: string, userId: string) {
    return this.prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });
  }

  findMemberIds(workspaceId: string): Promise<{ userId: string }[]> {
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { userId: true },
    });
  }

  findWorkspaceForInvitation(workspaceId: string) {
    return this.prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  async findWorkspaceInvitations(workspaceId: string) {
    return this.prisma.workspaceInvitation.findMany({
      where: {
        workspaceId,
      },
      select: {
        id: true,
        workspaceId: true,
        email: true,
        invitedById: true,
        invitedUserId: true,
        role: true,
        status: true,
        expiresAt: true,
        acceptedAt: true,
        rejectedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  }

  findInvitationByTokenHash(tokenHash: string) {
    return this.prisma.workspaceInvitation.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        workspaceId: true,
        email: true,
        invitedUserId: true,
        role: true,
        status: true,
        expiresAt: true,
      },
    });
  }

  async acceptInvitation(invitationId: string, userId: string) {
    return this.prisma.$transaction(async (tx: PrismaTransaction) => {
      const invitation = await tx.workspaceInvitation.findUnique({
        where: { id: invitationId },
        select: {
          id: true,
          workspaceId: true,
          email: true,
          invitedUserId: true,
          role: true,
          status: true,
          expiresAt: true,
        },
      });

      if (!invitation) {
        throw new AppException({
          code: 'WORKSPACE_INVITATION_NOT_FOUND',
          message: 'Invitation not found.',
          status: HttpStatus.NOT_FOUND,
        });
      }

      if (invitation.status !== WorkspaceInvitationStatus.PENDING) {
        throw new AppException({
          code: 'WORKSPACE_INVITATION_NOT_PENDING',
          message: 'This invitation is no longer pending.',
          status: HttpStatus.CONFLICT,
        });
      }

      if (invitation.expiresAt <= new Date()) {
        await tx.workspaceInvitation.updateMany({
          where: {
            id: invitationId,
            status: WorkspaceInvitationStatus.PENDING,
          },
          data: {
            status: WorkspaceInvitationStatus.EXPIRED,
          },
        });

        return {
          expired: true as const,
        };
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
      });

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

      // Conditional update ensures only one concurrent request can accept it.
      const updated = await tx.workspaceInvitation.updateMany({
        where: {
          id: invitation.id,
          status: WorkspaceInvitationStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
        data: {
          status: WorkspaceInvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
          invitedUserId: userId,
        },
      });

      if (updated.count !== 1) {
        throw new AppException({
          code: 'WORKSPACE_INVITATION_ALREADY_PROCESSED',
          message: 'This invitation has already been processed or has expired.',
          status: HttpStatus.CONFLICT,
        });
      }

      const membership = await tx.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId,
          role: invitation.role,
        },
      });

      await this.notificationRepository.resolveWorkspaceInvitation(
        tx,
        invitation.id,
        userId,
      );

      return {
        invitationId: invitation.id,
        workspaceId: invitation.workspaceId,
        membership,
        status: WorkspaceInvitationStatus.ACCEPTED,
      };
    });
  }

  async revokeInvitation(workspaceId: string, invitationId: string) {
    return this.prisma.$transaction(async (tx: PrismaTransaction) => {
      const invitation = await tx.workspaceInvitation.findFirst({
        where: {
          id: invitationId,
          workspaceId,
          status: WorkspaceInvitationStatus.PENDING,
        },
        select: {
          id: true,
          invitedUserId: true,
        },
      });

      if (!invitation) {
        return null;
      }

      const result = await tx.workspaceInvitation.updateMany({
        where: {
          id: invitationId,
          workspaceId,
          status: WorkspaceInvitationStatus.PENDING,
        },
        data: {
          status: WorkspaceInvitationStatus.REVOKED,
        },
      });

      if (result.count !== 1) {
        return null;
      }

      if (invitation.invitedUserId) {
        await this.notificationRepository.resolveWorkspaceInvitation(
          tx,
          invitationId,
          invitation.invitedUserId,
        );
      }

      return tx.workspaceInvitation.findUnique({
        where: { id: invitationId },
        select: {
          id: true,
          workspaceId: true,
          email: true,
          role: true,
          status: true,
          updatedAt: true,
        },
      });
    });
  }

  async rejectInvitation(invitationId: string, userId: string) {
    return this.prisma.$transaction(async (tx: PrismaTransaction) => {
      const invitation = await tx.workspaceInvitation.findUnique({
        where: { id: invitationId },
        select: {
          id: true,
          workspaceId: true,
          email: true,
          invitedUserId: true,
          role: true,
          status: true,
          expiresAt: true,
        },
      });

      if (!invitation) {
        return null;
      }

      if (invitation.status !== WorkspaceInvitationStatus.PENDING) {
        return null;
      }

      if (invitation.expiresAt <= new Date()) {
        const expired = await tx.workspaceInvitation.updateMany({
          where: {
            id: invitationId,
            status: WorkspaceInvitationStatus.PENDING,
          },
          data: {
            status: WorkspaceInvitationStatus.EXPIRED,
          },
        });

        if (expired.count === 1) {
          await this.notificationRepository.resolveWorkspaceInvitation(
            tx,
            invitationId,
            userId,
          );
        }

        return null;
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
        },
      });

      if (
        !user ||
        user.email.trim().toLowerCase() !==
          invitation.email.trim().toLowerCase()
      ) {
        return null;
      }

      const result = await tx.workspaceInvitation.updateMany({
        where: {
          id: invitationId,
          status: WorkspaceInvitationStatus.PENDING,
          expiresAt: { gt: new Date() },
          OR: [{ invitedUserId: userId }, { invitedUserId: null }],
        },
        data: {
          status: WorkspaceInvitationStatus.REJECTED,
          rejectedAt: new Date(),
          invitedUserId: userId,
        },
      });

      if (result.count !== 1) {
        return null;
      }

      await this.notificationRepository.resolveWorkspaceInvitation(
        tx,
        invitationId,
        userId,
      );

      return {
        ...invitation,
        status: WorkspaceInvitationStatus.REJECTED,
      };
    });
  }
}

export class WorkspaceMemberAlreadyExistsError extends Error {
  constructor() {
    super('Workspace member already exists.');
    this.name = 'WorkspaceMemberAlreadyExistsError';
  }
}
