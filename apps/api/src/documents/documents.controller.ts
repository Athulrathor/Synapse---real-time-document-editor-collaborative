import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { DocumentsService } from './documents.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { UUID } from 'crypto';
import { ListDocumentsQueryDto } from './dto/list-documents-query.dto.js';
import { WorkspaceRole } from '@prisma/client';
import { WorkspaceRoleGuard } from '../common/guards/workspace-role.guard.js';
import { Roles } from '../common/decorators/role.decorator.js';
import { DocumentRoleGuard } from '../common/guards/document-role.guard.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';
import { AppException } from '../common/exceptions/app.exception.js';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post(':workspaceId/documents')
  @UseGuards(WorkspaceRoleGuard)
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.EDITOR)
  @ResponseMessage('Document created successfully.')
  create(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.documentsService.create(
      workspaceId as UUID,
      req.user.userId as UUID,
      dto,
    );
  }

  @Get(':workspaceId/documents')
  @UseGuards(WorkspaceRoleGuard)
  @Roles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.EDITOR,
    WorkspaceRole.VIEWER,
  )
  @ResponseMessage('Workspace documents retrieved successfully.')
  findWorkspaceDocuments(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Req() req: AuthenticatedRequest,
    @Query() query: ListDocumentsQueryDto,
  ) {
    return this.documentsService.findWorkspaceDocuments(
      workspaceId as UUID,
      req.user.userId as UUID,
      query.page,
      query.limit,
    );
  }

  @Get(':documentId')
  @UseGuards(DocumentRoleGuard)
  @Roles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.EDITOR,
    WorkspaceRole.VIEWER,
  )
  @ResponseMessage('Document retrieved successfully.')
  findOne(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.documentsService.findByDocumentId(
      documentId as UUID,
      req.user.userId as UUID,
    );
  }

  @Get('search')
  @ResponseMessage('Documents searched successfully.')
  search(@Req() req: AuthenticatedRequest, @Query('q') q: string = '') {
    return this.documentsService.search(req.user.userId as UUID, q);
  }

  @Patch(':documentId')
  @UseGuards(DocumentRoleGuard)
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.EDITOR)
  @ResponseMessage('Document updated successfully.')
  update(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(
      documentId as UUID,
      req.user.userId as UUID,
      dto,
    );
  }

  @Get(':documentId/versions')
  @UseGuards(DocumentRoleGuard)
  @Roles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.EDITOR,
    WorkspaceRole.VIEWER,
  )
  @ResponseMessage('Document versions retrieved successfully.')
  findVersions(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.documentsService.findVersions(
      documentId as UUID,
      req.user.userId as UUID,
    );
  }

  @Post(':documentId/versions/:versionNumber/restore')
  @UseGuards(DocumentRoleGuard)
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.EDITOR)
  @ResponseMessage('Document version restored successfully.')
  restoreVersion(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Param('versionNumber') versionNumberParam: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const versionNumber = Number(versionNumberParam);

    if (!Number.isSafeInteger(versionNumber) || versionNumber < 1) {
      throw new AppException({
        code: 'INVALID_VERSION_NUMBER',
        message: 'Version number must be a positive integer.',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return this.documentsService.restoreVersion(
      documentId as UUID,
      versionNumber,
      req.user.userId as UUID,
    );
  }

  @Patch(':documentId/archive')
  @UseGuards(DocumentRoleGuard)
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Document archived successfully.')
  archive(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.documentsService.archiveDocument(
      documentId as UUID,
      req.user.userId as UUID,
    );
  }

  @Patch(':documentId/restore')
  @UseGuards(DocumentRoleGuard)
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Document restored successfully.')
  restore(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.documentsService.restore(
      documentId as UUID,
      req.user.userId as UUID,
    );
  }

  @Delete(':documentId')
  @UseGuards(DocumentRoleGuard)
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Document deleted successfully.')
  remove(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.documentsService.remove(
      documentId as UUID,
      req.user.userId as UUID,
    );
  }
}
