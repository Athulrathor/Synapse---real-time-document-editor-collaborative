// "use client";

// import type { ReactNode } from "react";
// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import { useAuthStore } from "@/stores/auth-store-ui";
// import { WorkspaceLoadingScreen } from "../animations/loading-main";

// interface ProtectedRouteProps {
//   children: ReactNode;
// }

// const MIN_LOADING_DURATION = 3500;

// export function ProtectedRoute({ children }: ProtectedRouteProps) {
//   const router = useRouter();
//   const status = useAuthStore((state) => state.status);

//   const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false);

//   useEffect(() => {
//     const timer = window.setTimeout(() => {
//       setMinimumTimeElapsed(true);
//     }, MIN_LOADING_DURATION);

//     return () => window.clearTimeout(timer);
//   }, []);

//   useEffect(() => {
//     if (status === "unauthenticated") {
//       router.replace("/login");
//     }
//   }, [status, router]);

//   if (status === "loading" || !minimumTimeElapsed) {
//     return <WorkspaceLoadingScreen />;
//   }

//   if (status !== "authenticated") {
//     return null;
//   }

//   return <>{children}</>;
// }

"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/stores/auth-store-ui";
import { WorkspaceLoadingScreen } from "../animations/loading-main";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return <WorkspaceLoadingScreen />;
  }

  if (status !== "authenticated") {
    return null;
  }

  return <>{children}</>;
}