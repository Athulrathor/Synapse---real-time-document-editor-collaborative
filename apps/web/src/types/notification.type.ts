export type NotificationType =
  | "DOCUMENT_SHARED"
  | "DOCUMENT_COMMENTED"
  | "COMMENT_MENTIONED"
  | "COMMENT_REPLIED"
  | "WORKSPACE_INVITATION"
  | "PERMISSION_CHANGED";

export interface NotificationActor {
  id: string;
  name: string;
  avatar?: string | null;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  actor?: NotificationActor | null;
  entityId?: string | null;
  entityType?: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface NotificationsResponse {
  data: Notification[];
  pagination: NotificationPagination;
}

export type UnreadCountResponse = number;
