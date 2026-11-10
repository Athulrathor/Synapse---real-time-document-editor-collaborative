import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-google-oauth20';

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

  authorizationParams(options: any): any {
    return {
      ...super.authorizationParams(options),
      prompt: 'select_account',
    };
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<GoogleUserProfile> {
    const email = profile.emails?.[0]?.value;
    const emailVerified =
      (profile._json as { email_verified?: boolean }).email_verified === true;

    if (!profile.id || !email || !emailVerified) {
      throw new Error('Google account has no verified email.');
    }

    const name = profile.displayName || email;

    return {
      googleId: profile.id,
      email: email.toLowerCase(),
      name,
      avatarUrl: profile.photos?.[0]?.value ?? null,
      emailVerified,
    };
  }
}
