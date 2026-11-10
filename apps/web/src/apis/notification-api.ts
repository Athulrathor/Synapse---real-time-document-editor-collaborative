import { apiRequest as apiClient } from "@/apis/api-client";
import { API_ENDPOINTS } from "@/apis/api-endpoint";

import type {
  Notification,
  NotificationsResponse,
  UnreadCountResponse,
} from "@/types/notification.type";

export const notificationService = {
  fetchNotifications(
    page = 1,
    limit = 20,
    unreadOnly = false,
  ): Promise<NotificationsResponse> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      unreadOnly: String(unreadOnly),
    });

    return apiClient<NotificationsResponse>(
      `${API_ENDPOINTS.notifications.list}?${params}`,
    );
  },

  fetchUnreadCount(): Promise<UnreadCountResponse> {
    return apiClient<UnreadCountResponse>(
      API_ENDPOINTS.notifications.unreadCount,
    );
  },

  markAsRead(id: string): Promise<Notification> {
    return apiClient<Notification>(API_ENDPOINTS.notifications.markAsRead(id), {
      method: "PATCH",
    });
  },

  markAllAsRead(): Promise<void> {
    return apiClient<void>(API_ENDPOINTS.notifications.markAllAsRead, {
      method: "PATCH",
    });
  },

  deleteNotification(id: string): Promise<void> {
    return apiClient<void>(API_ENDPOINTS.notifications.delete(id), {
      method: "DELETE",
    });
  },
};
