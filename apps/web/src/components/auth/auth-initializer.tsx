
"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store-ui";

export function AuthInitializer() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  return null;
}
