import {type AuthUser } from "@/stores/auth-store-ui";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface ResetPasswordInput {
  resetToken: string;
  password: string;
  newPassword: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface VerifyOtpInput {
  email: string;
  otp: string;
}


export interface AuthSessionResponse {
  user: AuthUser;
  accessToken: string;
}