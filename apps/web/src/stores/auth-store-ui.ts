import { ApiError, refreshAccessToken } from "@/apis/api-client";
import { authService } from "@/apis/auth-api";
import { create } from "zustand";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: {
    id: string;
    fileId: string;
    path: string;
    name: string;
  } | null;
}

type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "unavailable";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  status: AuthStatus;

  setSession: (user: AuthUser, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: AuthUser) => void;
  setStatus: (status: AuthStatus) => void;
  clearSession: () => void;

  initializeAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  status: "loading",

  setSession: (user, accessToken) =>
    set({
      user,
      accessToken,
      status: "authenticated",
    }),

  setAccessToken: (accessToken) => set({ accessToken }),

  setUser: (user) => set({ user }),

  setStatus: (status) => set({ status }),

  clearSession: () =>
    set({
      user: null,
      accessToken: null,
      status: "unauthenticated",
    }),

  initializeAuth: async () => {
    set({ status: "loading" });

    try {
      const data = await refreshAccessToken();

      const accessToken = data.accessToken;

      const currentUser = data.user ?? get().user;

      if (!currentUser) {
        // Refresh response must provide a user, or obtain it via /auth/me.
        const session = await authService.getMe();

        get().setSession(session.user, accessToken);
        return;
      }

      get().setSession(currentUser, accessToken);
    } catch (error) {
      if (
        error instanceof Error &&
        "status" in error &&
        ((error as ApiError).status === 401 ||
          (error as ApiError).status === 403)
      ) {
        get().clearSession();
        return;
      }

      console.error("Auth initialization failed:", error);
      set({ status: "unavailable" });
    }
  },

  login: async (email, password) => {
    const session = await authService.login({ email, password });
    get().setSession(session.user, session.accessToken);
  },

  logout: async () => {
    try {
      await authService.logout();
    } finally {
      get().clearSession();
    }
  },

  changePassword: async (currentPassword, newPassword, confirmPassword) => {
    await authService.changePassword({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    get().clearSession();
  },
}));
