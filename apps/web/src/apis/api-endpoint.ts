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
    changePassword: "change/password",
    google: "/auth/google",
    googleCallback: "/auth/google/callback",
    googleExchange: "/auth/google/exchange",
  },

  activity: {
    list: "/activity",
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

    // Workspace invitations
    invitations: (workspaceId: string) =>
      `/workspaces/${workspaceId}/invitations`,

    revokeInvitation: (workspaceId: string, invitationId: string) =>
      `/workspaces/${workspaceId}/invitations/${invitationId}`,

    acceptInvitation: "/workspaces/invitations/accept",
    rejectInvitation: "/workspaces/invitations/reject",

    // Documents
    documents: (workspaceId: string) => `/documents/${workspaceId}/documents`,
  },

  document: {
    create: (workspaceId: string) => `/documents/${workspaceId}/documents`,

    listByWorkspace: (workspaceId: string) =>
      `/documents/${workspaceId}/documents`,

    detail: (documentId: string) => `/documents/${documentId}`,

    search: "/documents/search",

    update: (documentId: string) => `/documents/${documentId}`,

    versions: (documentId: string) => `/documents/${documentId}/versions`,

    restoreVersion: (documentId: string, versionNumber: number) =>
      `/documents/${documentId}/versions/${versionNumber}/restore`,

    archive: (documentId: string) => `/documents/${documentId}/archive`,

    restore: (documentId: string) => `/documents/${documentId}/restore`,

    delete: (documentId: string) => `/documents/${documentId}`,

    recent: `/documents/recent`,

    starred: "/documents/starred",

    trash: "/documents/trash",

    restoreFromTrash: (documentId: string) =>
      `/documents/${documentId}/trash/restore`,

    permanentlyDelete: (documentId: string) =>
      `/documents/${documentId}/permanent`,

    star: (documentId: string) => `/documents/${documentId}/star`,
  },

  notifications: {
    list: "/notifications",

    unreadCount: "/notifications/unread/count",

    markAsRead: (id: string) => `/notifications/${id}/read`,

    markAllAsRead: "/notifications/read/all",

    delete: (id: string) => `/notifications/${id}`,
  },

  users: {
    create: "/users",
    list: "/users",
    detail: "/users/me",
    update: "/users/me",
    delete: (id: string) => `/users/${id}`,
  },
} as const;
