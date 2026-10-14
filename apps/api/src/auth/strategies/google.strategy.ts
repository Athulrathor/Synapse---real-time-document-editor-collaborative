import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../common/exceptions/app.exception.js';

export interface GoogleUserProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('auth.googleClientId'),
      clientSecret: configService.getOrThrow<string>('auth.googleClientSecret'),
      callbackURL: configService.getOrThrow<string>('auth.googleCallbackUrl'),
      scope: ['openid', 'email', 'profile'],
      passReqToCallback: false,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<GoogleUserProfile> {
    const email = profile.emails?.[0]?.value?.trim().toLowerCase();

    if (!profile.id || !email) {
      throw new AppException({
        code: "GOOGLE_AUTH_ERROR.",
        message: "Google account did not provide a valid identity.",
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    return {
      googleId: profile.id,
      email,
      name: profile.displayName?.trim() || email.split('@')[0],
      avatarUrl: profile.photos?.[0]?.value ?? null,
      emailVerified:
        (profile._json as { email_verified?: boolean }).email_verified === true,
    };
  }
}
