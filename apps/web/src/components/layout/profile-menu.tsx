"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { ChevronDown, LogOut, Settings2, UserRound } from "lucide-react";

// import { useDismissable } from "@/hooks/use-dismissable";

const user = { name: "Athul Rathor", plan: "Personal account" };

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const dismiss = useCallback((reason: "outside" | "escape") => {
    setOpen(false);
    if (reason === "escape") triggerRef.current?.focus();
  }, []);
//   useDismissable(rootRef, open, dismiss);

  const close = useCallback(() => setOpen(false), []);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open profile menu"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="profile-menu"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-2 rounded-xl px-1.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-2"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15">
          <UserRound className="size-4" aria-hidden="true" />
        </span>
        <span className="hidden max-w-28 text-left sm:block">
          <span className="block truncate text-xs font-medium">{user.name}</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {user.plan}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`hidden size-3.5 text-muted-foreground transition-transform sm:block ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          id="profile-menu"
          role="menu"
          aria-label="Profile menu"
          className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl animate-fade-in"
        >
          <div className="border-b border-border px-3 py-3">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {user.plan}
            </p>
          </div>

          <Link
            href="/settings"
            role="menuitem"
            onClick={close}
            className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-accent"
          >
            <Settings2 className="size-4" aria-hidden="true" />
            Settings
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={close /* TODO: call your sign-out action */}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}