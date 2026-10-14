import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator.js';

import { AuthService } from './auth.service.js';

import { RegisterDto } from './dto/register.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import {
  RefreshTokenDto,
  RefreshTokenResponseDto,
} from './dto/refreshToken.dto.js';

import { AppException } from '../common/exceptions/app.exception.js';

import {type Express, type Request, type Response } from 'express';
import { VerifyPasswordResetOtpDto } from './dto/otp-verification.dto.js';
import { ForgotPasswordDto } from './dto/forget-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { EmailQueue } from '../jobs/email/email.queue.js';

import { AuthGuard } from '@nestjs/passport';
import type { GoogleUserProfile } from './strategies/google.strategy.js';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailQueue: EmailQueue,
  ) {}

  @Post('register')
  @UseInterceptors(FileInterceptor('avatar'))
  register(
    @Body() dto: RegisterDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 2 * 1024 * 1024,
          }),
          new FileTypeValidator({
            fileType: /^image\/(jpeg|png|webp)$/,
          }),
        ],
        fileIsRequired: true,
      }),
    )
    avatar: Express.Multer.File,
  ) {
    return this.authService.registerUser(dto, avatar);
  }

  @Post('verify/email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('login')
  async login(
    @Body() dto: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const userAgent = req.headers['user-agent'] || '';

    let deviceName = 'Unknown Device';

    if (/iphone/i.test(userAgent)) {
      deviceName = 'iPhone';
    } else if (/ipad/i.test(userAgent)) {
      deviceName = 'iPad';
    } else if (/android/i.test(userAgent)) {
      deviceName = 'Android Device';
    } else if (/macintosh/i.test(userAgent)) {
      deviceName = 'Macintosh (Mac)';
    } else if (/windows/i.test(userAgent)) {
      deviceName = 'Windows PC';
    } else if (/linux/i.test(userAgent)) {
      deviceName = 'Linux PC';
    }

    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string);

    const result = await this.authService.loginUser(
      dto,
      ipAddress,
      userAgent,
      deviceName,
    );

    if (!result) {
      throw new AppException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    // res.cookie('access_token', result.accessToken, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === 'production',
    //   sameSite: 'lax',
    //   maxAge: 10 * 60 * 1000,
    //   path: '/',
    // });

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });

    return {
      success: true,
      accessToken: result?.accessToken,
      user: result?.user,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      user: {
        id: user.userId,
        email: user.email,
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Omit<RefreshTokenResponseDto, 'refreshToken'>> {
    const refreshToken = req.cookies?.refresh_token || dto.refreshToken;

    if (!refreshToken) {
      throw new AppException({
        code: 'REFRESH_TOKEN_MISSING',
        message: 'Refresh token is required.',
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    const result = await this.authService.refreshToken({
      refreshToken,
    });

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });

    return {
      success: result.success,
      message: result.message,
      accessToken: result.accessToken,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: AuthenticatedUser & { sessionId: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logoutCurrentSession(
      user.userId,
      user.sessionId,
    );

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
    });

    return result;
  }

  @Post('logout/all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logoutAllSessions(user.userId);

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
    });

    return result;
  }

  @Post('forgot/password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgetPassword(dto);
  }

  @Post('verify/otp')
  @HttpCode(HttpStatus.OK)
  verifyPasswordResetOtp(@Body() dto: VerifyPasswordResetOtpDto) {
    return this.authService.verifyResetPasswordOtp(dto);
  }

  @Post('reset/password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin(): void {
    // Passport redirects the user to Google.
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: Request & { user: GoogleUserProfile },
    @Res() res: Response,
  ) {
    const userAgent = req.headers['user-agent'] || '';

    let deviceName = 'Unknown Device';

    if (/iphone/i.test(userAgent)) {
      deviceName = 'iPhone';
    } else if (/ipad/i.test(userAgent)) {
      deviceName = 'iPad';
    } else if (/android/i.test(userAgent)) {
      deviceName = 'Android Device';
    } else if (/macintosh/i.test(userAgent)) {
      deviceName = 'Macintosh (Mac)';
    } else if (/windows/i.test(userAgent)) {
      deviceName = 'Windows PC';
    } else if (/linux/i.test(userAgent)) {
      deviceName = 'Linux PC';
    }

    const forwardedFor = req.headers['x-forwarded-for'];
    const ipAddress =
      req.ip ||
      (typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0].trim()
        : '');

    const result = await this.authService.loginWithGoogle(
      req.user,
      ipAddress,
      userAgent,
      deviceName,
    );

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });

    // Do not put access or refresh tokens in the redirect URL.
    // Return the access token in the response body for the frontend.
    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Google login successful.',
      accessToken: result.accessToken,
      user: result.user,
    });
  }
}
