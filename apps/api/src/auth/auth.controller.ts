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
} from '@nestjs/common';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user-decorator.js';

import { AuthService } from './auth.service.js';

import { RegisterDto } from './dto/register.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import {
  RefreshTokenDto,
  RefreshTokenResponseDto,
} from './dto/refreshToken.dto.js';

import { AppException } from '../common/exceptions/app.exception.js';

import { type Request, type Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.registerUser(dto);
  }

  @Post('verify-email')
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
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshTokenResponseDto> {
    const result = await this.authService.refreshToken(dto);

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });

    return result;
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
}
