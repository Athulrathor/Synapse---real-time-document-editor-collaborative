import { apiRequest } from "@/apis/api-client";
import { API_ENDPOINTS } from "@/apis/api-endpoint";
import type { AuthUser } from "@/stores/auth-store-ui";
import {
  LoginInput,
  AuthSessionResponse,
  VerifyEmailInput,
  VerifyOtpInput,
  ResetPasswordInput,
} from "@/types/auth.type";

export const authService = {
  login(input: LoginInput): Promise<AuthSessionResponse> {
    return apiRequest<AuthSessionResponse>(API_ENDPOINTS.auth.login, {
      method: "POST",
      json: input,
    });
  },

  register(formData: FormData): Promise<unknown> {
    return apiRequest<unknown>(API_ENDPOINTS.auth.register, {
      method: "POST",
      body: formData,
    });
  },

  verifyEmail(input: VerifyEmailInput): Promise<unknown> {
    return apiRequest<unknown>(API_ENDPOINTS.auth.verifyEmail, {
      method: "POST",
      json: input,
    });
  },

  verifyPasswordResetOtp(input: VerifyOtpInput): Promise<unknown> {
    return apiRequest<unknown>(API_ENDPOINTS.auth.verifyPasswordResetOtp, {
      method: "POST",
      json: input,
    });
  },

  getMe(): Promise<AuthUser> {
    return apiRequest<AuthUser>(API_ENDPOINTS.auth.me);
  },

  forgotPassword(email: string): Promise<unknown> {
    return apiRequest<unknown>(API_ENDPOINTS.auth.forgotPassword, {
      method: "POST",
      json: { email },
    });
  },

  resetPassword(input: ResetPasswordInput): Promise<unknown> {
    return apiRequest<unknown>(API_ENDPOINTS.auth.resetPassword, {
      method: "POST",
      json: input,
    });
  },

  refresh(): Promise<AuthSessionResponse> {
    return apiRequest<AuthSessionResponse>(API_ENDPOINTS.auth.refresh, {
      method: "POST",
    });
  },

  logout(): Promise<unknown> {
    return apiRequest<unknown>(API_ENDPOINTS.auth.logout, {
      method: "POST",
    });
  },
};
