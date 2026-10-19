"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { useUIStore } from "@/stores/ui.store";

import logo from "../../../public/Synapse.svg"
import Image from "next/image";

export function AppHeader({ title }: { title?: string }) {
  const toggleMobileSidebar = useUIStore((s) => s.toggleMobileSidebar);
  const mobileSidebarOpen = useUIStore((s) => s.mobileSidebarOpen);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/90 px-3 backdrop-blur-xl sm:px-5">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {/* Same breakpoint as the desktop sidebar (lg), so there is no gap
            where neither the sidebar nor the hamburger is visible. */}
        <button
          type="button"
          aria-label={
            mobileSidebarOpen
              ? "Close navigation sidebar"
              : "Open navigation sidebar"
          }
          aria-controls="mobile-sidebar"
          aria-expanded={mobileSidebarOpen}
          onClick={toggleMobileSidebar}
          className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>

        {/* Desktop (lg+): collapse / expand the sidebar */}
        <button
          type="button"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={sidebarCollapsed}
          onClick={toggleSidebar}
          className="hidden size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex"
        >
          {sidebarCollapsed ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
        </button>

        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg  text-white">
            <Image
              src={logo}
              alt="Synapse logo"
              width={36}
              height={36}
              priority
              className="size-9 shrink-0 rounded-lg"
            />
          </span>
          <span className="truncate text-lg font-semibold tracking-tight">
            Synapse
          </span>
        </Link>

        {title && (
          <h1 className="hidden truncate text-lg font-semibold tracking-tight lg:block">
            {title}
          </h1>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <NotificationsMenu />
        <ThemeToggle />
        <ProfileMenu />
      </div>
    </header>
  );
}
