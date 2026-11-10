import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './repositories/user.repository.js';
import { UpdateProfileDto } from './dto/update-profile-dto.js';
import { ImageKitService } from '../common/imagekit/imagekit.service.js';
import { AppException } from '../common/exceptions/app.exception.js';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly imageKitService: ImageKitService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.usersRepository.findProfileById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.usersRepository.findProfileById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.usersRepository.updateProfile(userId, dto.name);
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new AppException({
        code: 'CLOUD_UPLOAD_FAILED!',
        message: 'Avatar file is required',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    // 1. Upload the new image to ImageKit.
    const uploaded = (await this.imageKitService.uploadAvatar(
      file.buffer,
      file.originalname,
    )) as { fileId: string; name: string; filePath: string };

    try {
      // 2. Save the new avatar in the database.
      const previousAvatar =
        await this.usersRepository.findAvatarByUserId(userId);

      const avatar = await this.usersRepository.createOrUpdateAvatar(userId, {
        name: uploaded.name,
        fileId: uploaded.fileId,
        path: uploaded.filePath,
      });

      // 3. Delete the previous image only after DB success.
      if (previousAvatar && previousAvatar.fileId !== uploaded.fileId) {
        try {
          await this.imageKitService.deleteImage(previousAvatar.fileId);
        } catch (error) {
          // Log for retry; don't fail the successful profile update.
          console.error('Previous avatar cleanup failed:', error);
        }
      }

      return avatar;
    } catch (error) {
      // Compensate if the database operation fails.
      try {
        await this.imageKitService.deleteImage(uploaded.fileId);
      } catch (cleanupError) {
        console.error('New avatar cleanup failed:', cleanupError);
      }

      throw error;
    }
  }

  async removeAvatar(userId: string) {
    const avatar = await this.usersRepository.findAvatarByUserId(userId);

    if (!avatar) {
      throw new NotFoundException('Avatar not found');
    }

    // Delete the database record first.
    await this.usersRepository.deleteAvatar(userId);

    // Then delete the remote ImageKit file.
    try {
      await this.imageKitService.deleteImage(avatar.fileId);
    } catch (error) {
      console.error('Avatar cleanup failed:', error);
      // Log for retry; the database removal has already succeeded.
    }

    return { message: 'Avatar removed successfully' };
  }
}
