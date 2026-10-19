import { authService } from "@/apis/auth-api";
import { create } from "zustand";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
}

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

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
}

export const useAuthStore = create<AuthState>((set,get) => ({
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
      const session = await authService.refresh();

      get().setSession(session.user, session.accessToken);
    } catch {
      get().clearSession();
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
}));
