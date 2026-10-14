import {
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { AppException } from '../exceptions/app.exception.js';

import ImageKit, { toFile } from '@imagekit/nodejs';

import { ConfigService } from '@nestjs/config';

@Injectable()
export class ImageKitService {
  private readonly imagekit: ImageKit;

  constructor(private readonly configService: ConfigService) {
    this.imagekit = new ImageKit({
      privateKey: this.configService.getOrThrow<string>('imagekit.imagekitPrivateKey'),
    });
  }

  async uploadAvatar(buffer: Buffer, fileName: string) {
    try {
      const file = await toFile(buffer, fileName);

      const result = await this.imagekit.files.upload({
        file,
        fileName,
        folder: '/Synapse-workspace/profile-images',
        useUniqueFileName: true,
      });

      return {
        url: result.url,
        fileId: result.fileId,
        filePath: result.filePath,
        name: result.name,
      };
    } catch (error) {
      console.error('ImageKit avatar upload failed:', error);

      throw new AppException({
        code: "IMAGEKIT_UPLOAD_FAILED",
        message: "Avatar upload failed.",
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        details: error
      });
    }
  }

  async deleteImage(fileId: string): Promise<void> {
    try {
      await this.imagekit.files.delete(fileId);
    } catch (error) {
      console.error('ImageKit image deletion failed:', error);

      throw new AppException({
        code: 'IMAGEKIT_DELETE_FAILED',
        message: 'Image deletion failed.',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        details: error,
      });
    }
  }
}
