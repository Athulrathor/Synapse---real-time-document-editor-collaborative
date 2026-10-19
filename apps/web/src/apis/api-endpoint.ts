export const API_ENDPOINTS = {
  auth: {
    register: "/auth/register",
    verifyEmail: "/auth/verify/email",
    login: "/auth/login",
    me: "/auth/me",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    logoutAll: "/auth/logout/all",
    forgotPassword: "/auth/forgot/password",
    verifyPasswordResetOtp: "/auth/verify/otp",
    resetPassword: "/auth/reset/password",
    google: "/auth/google",
    googleCallback: "/auth/google/callback",
  },

  workspaces: {
    list: "/workspaces",
    create: "/workspaces",
    detail: (workspaceId: string) => `/workspaces/${workspaceId}`,
    update: (workspaceId: string) => `/workspaces/${workspaceId}`,
    delete: (workspaceId: string) => `/workspaces/${workspaceId}`,

    members: (workspaceId: string) => `/workspaces/${workspaceId}/members`,
    member: (workspaceId: string, userId: string) =>
      `/workspaces/${workspaceId}/members/${userId}`,

    documents: (workspaceId: string) => `/workspaces/${workspaceId}/documents`,
  },

  document: {
    // Workspace-scoped routes
    create: (workspaceId: string) => `/workspaces/${workspaceId}/documents`,

    listByWorkspace: (workspaceId: string) =>
      `/workspaces/${workspaceId}/documents`,

    // Document routes
    detail: (documentId: string) => `/documents/${documentId}`,

    search: "/documents/search",

    update: (documentId: string) => `/documents/${documentId}`,

    versions: (documentId: string) => `/documents/${documentId}/versions`,

    restoreVersion: (documentId: string, versionNumber: number) =>
      `/documents/${documentId}/versions/${versionNumber}/restore`,

    archive: (documentId: string) => `/documents/${documentId}/archive`,

    restore: (documentId: string) => `/documents/${documentId}/restore`,

    delete: (documentId: string) => `/documents/${documentId}`,
  },

  notifications: {
    list: "/notifications",

    unreadCount: "/notifications/unread-count",

    markAsRead: (id: string) => `/notifications/${id}/read`,

    markAllAsRead: "/notifications/read-all",

    delete: (id: string) => `/notifications/${id}`,
  },

  users: {
    create: "/users",

    list: "/users",

    detail: (id: string) => `/users/${id}`,

    update: (id: string) => `/users/${id}`,

    delete: (id: string) => `/users/${id}`,
  },
} as const;
