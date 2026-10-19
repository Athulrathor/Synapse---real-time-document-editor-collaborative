"use client";

import { memo, useCallback, useMemo, useRef, useState } from "react";
import { Bell, Check } from "lucide-react";

// import { useDismissable } from "@/hooks/use-dismissable";

type NotificationItem = {
  id: number;
  title: string;
  description: string;
  time: string;
  unread: boolean;
};

const initialNotifications: NotificationItem[] = [
  {
    id: 1,
    title: "Document shared with you",
    description: "A teammate shared Product Requirements with you.",
    time: "5 min ago",
    unread: true,
  },
  {
    id: 2,
    title: "Comment added",
    description: "Someone commented on Engineering Roadmap.",
    time: "30 min ago",
    unread: true,
  },
  {
    id: 3,
    title: "Workspace invitation",
    description: "You have a new workspace invitation.",
    time: "2 hours ago",
    unread: false,
  },
];

const NotificationRow = memo(function NotificationRow({
  item,
  onRead,
}: {
  item: NotificationItem;
  onRead: (id: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onRead(item.id)}
      className="flex w-full gap-3 border-b border-border p-4 text-left last:border-b-0 hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none"
    >
      <span className="mt-1.5 flex size-2.5 shrink-0 items-center justify-center">
        {item.unread && <span className="size-2 rounded-full bg-primary" />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium">{item.title}</span>
          {item.unread && (
            <span className="shrink-0 text-[10px] text-primary">New</span>
          )}
        </span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
          {item.description}
        </span>
        <span className="mt-2 block text-[11px] text-muted-foreground">
          {item.time}
        </span>
      </span>
    </button>
  );
});

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initialNotifications);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const unreadCount = useMemo(
    () => items.filter((n) => n.unread).length,
    [items],
  );

  const dismiss = useCallback((reason: "outside" | "escape") => {
    setOpen(false);
    if (reason === "escape") triggerRef.current?.focus();
  }, []);
//   useDismissable(rootRef, open, dismiss);

  const markRead = useCallback((id: number) => {
    setItems((cur) => cur.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setItems((cur) => cur.map((n) => ({ ...n, unread: false })));
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="notifications-panel"
        onClick={() => setOpen((o) => !o)}
        className="relative flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="size-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 flex min-w-4.5 items-center justify-center rounded-full border-2 border-background bg-destructive px-1 text-[10px] font-semibold leading-4 text-white"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notifications-panel"
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Notifications</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {unreadCount} unread
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-accent"
              >
                <Check className="size-3.5" aria-hidden="true" />
                Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {items.map((item) => (
                <NotificationRow key={item.id} item={item} onRead={markRead} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}