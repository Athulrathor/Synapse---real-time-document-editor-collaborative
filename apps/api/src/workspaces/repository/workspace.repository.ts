import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { PrismaTransaction } from '../../database/prisma.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { UUID } from 'crypto';

@Injectable()
export class WorkspacesRepository {
  constructor(private readonly prisma: PrismaService) {};

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
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: {
          select: {
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

  async createMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ) {
    try {
      return await this.prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId,
          role,
        },
      });
    } catch (error: unknown) {
      if (this.isPrismaError(error, 'P2002')) {
        // The unique constraint handles concurrent duplicate requests.
        throw new WorkspaceMemberAlreadyExistsError();
      }

      throw new AppException({
        code: "WORKSPACES_MEMBER_ALREADY_EXISTS_ERROR.",
        message: "Workspace member already exists.",
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        details: new WorkspaceMemberAlreadyExistsError()
      });
    }
  }

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
}

export class WorkspaceMemberAlreadyExistsError extends Error {
  constructor() {
    super('Workspace member already exists.');
    this.name = 'WorkspaceMemberAlreadyExistsError';
  }
}
