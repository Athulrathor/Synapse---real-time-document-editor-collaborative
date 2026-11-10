"use client";

import { useState } from "react";
import { Bell, Check, Inbox, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/hooks/use-notifications";

import type { Notification } from "@/types/notification.type";

function formatNotificationTime(date: string): string {
  const timestamp = new Date(date).getTime();

  if (!Number.isFinite(timestamp)) return "";

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return new Date(date).toLocaleDateString();
}

function NotificationRow({
  item,
  onRead,
  isMarkingAsRead,
}: {
  item: Notification;
  onRead: (id: string) => void;
  isMarkingAsRead: boolean;
}) {
  const unread = !item.isRead;

  return (
    <button
      type="button"
      onClick={() => {
        if (unread) onRead(item.id);
      }}
      aria-label={`${item.title}${unread ? ", unread" : ""}`}
      className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none"
    >
      {" "}
      <span className="mt-1.5 flex size-2.5 shrink-0 items-center justify-center">
        {unread && <span className="size-2 rounded-full bg-primary" />}{" "}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
          <span
            className={`wrap-break-words text-sm ${
              unread ? "font-semibold" : "font-medium"
            }`}
          >
            {item.title}
          </span>

          {unread && (
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              New
            </span>
          )}
        </span>

        <span className="mt-1 block wrap-break-words text-xs leading-5 text-muted-foreground">
          {item.message}
        </span>

        <span className="mt-2 block text-[11px] text-muted-foreground">
          {formatNotificationTime(item.createdAt)}
        </span>
      </span>
      {unread && isMarkingAsRead && (
        <LoaderCircle
          className="mt-1 size-3.5 shrink-0 animate-spin text-muted-foreground"
          aria-label="Marking as read"
        />
      )}
    </button>
  );
}

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);

  const {
    notifications,
    unreadCount,
    isLoading,
    isError,
    markAsRead,
    markAllAsRead,
    isMarkingAsRead,
    isMarkingAllAsRead,
  } = useNotifications();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {" "}
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications, ${unreadCount} unread`}
          className="relative size-10 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
        >
          {" "}
          <Bell className="size-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-background bg-destructive px-1 text-[9px] font-semibold leading-none text-white"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={12}
        className="w-[calc(100vw-1.5rem)] max-w-95 overflow-hidden rounded-lg p-0 shadow-xl sm:w-95"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {unreadCount === 0
                ? "You're all caught up"
                : `${unreadCount} unread`}
            </p>
          </div>

          {unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isMarkingAllAsRead}
              onClick={() => {
                void markAllAsRead().catch(() => {});
              }}
              className="h-8 shrink-0 gap-1.5 px-2 text-xs text-primary"
            >
              {isMarkingAllAsRead ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              Mark all read
            </Button>
          )}
        </div>

        <Separator />

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Loading notifications...
          </div>
        ) : isError ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium">Couldn&apos;t load notifications</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Check your connection and try again.
            </p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-muted">
              <Inbox className="size-5 text-muted-foreground" />
            </span>
            <p className="text-sm font-medium">No notifications</p>
            <p className="mt-1 text-xs text-muted-foreground">
              New updates will appear here.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[min(420px,calc(100dvh-12rem))]">
            <div className="divide-y divide-border">
              {notifications.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  isMarkingAsRead={isMarkingAsRead}
                  onRead={(id) => {
                    void markAsRead(id).catch(() => {});
                  }}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        <Separator />

        <div className="bg-muted/30 px-4 py-2.5">
          <p className="text-center text-[11px] text-muted-foreground">
            Workspace notifications
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
