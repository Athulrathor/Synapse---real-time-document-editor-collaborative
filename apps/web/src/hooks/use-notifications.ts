"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { notificationService } from "@/apis/notification-api";

const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};

export function useNotifications() {
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: notificationKeys.lists(),
    queryFn: () => notificationService.fetchNotifications(),
    staleTime: 30_000,
  });

  const unreadCountQuery = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationService.fetchUnreadCount(),
    staleTime: 30_000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),

    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: notificationKeys.all,
      }),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),

    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: notificationKeys.all,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationService.deleteNotification(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: notificationKeys.all,
      }),
  });

  return {
    notifications: notificationsQuery.data?.data ?? [],
    pagination: notificationsQuery.data?.pagination,
    unreadCount: unreadCountQuery.data ?? 0,

    isLoading: notificationsQuery.isPending,
    isError: notificationsQuery.isError,

    markAsRead: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
    deleteNotification: deleteMutation.mutateAsync,

    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isDeleting: deleteMutation.isPending,

    refetch: notificationsQuery.refetch,
  };
}
