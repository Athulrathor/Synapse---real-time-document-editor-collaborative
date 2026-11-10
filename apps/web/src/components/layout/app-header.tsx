"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Menu } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { ProfileMenu } from "@/components/layout/profile-menu";

import { Button } from "../ui/button";
import { useSidebarOptional } from "@/components/ui/sidebar";

import logo from "../../../public/Synapse.svg";
import { usePathname, useRouter } from "next/navigation";

// interface AppHeaderProps {
//   showSidebarToggle?: boolean;
// }

export function AppHeader() {
  const sidebar = useSidebarOptional();
  const router = useRouter();
  const pathname = usePathname();

  const isEditorPage =
    pathname.includes("/documents/") &&
    pathname.split("/documents/")[1]?.length > 0;

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/90 px-3 backdrop-blur-xl sm:px-2">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="flex flex-row gap-3">
          {isEditorPage ? (
            <Button variant="ghost" size="lg" onClick={() => router.back()}>
              <ArrowLeft size={18} />
            </Button>
          ) : sidebar ? (
            <Button variant="ghost" size="lg" onClick={sidebar.toggleSidebar}>
              <Menu size={18} />
            </Button>
          ) : null}

          <Link
            href="/dashboard"
            className="hidden min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex"
          >
            <Image
              src={logo}
              alt="Synapse logo"
              width={36}
              height={36}
              priority
              className="size-9 shrink-0 rounded-lg"
            />
            <span className="truncate text-lg font-semibold tracking-tight">
              Synapse
            </span>
          </Link>
        </div>

        <Link
          href="/dashboard"
          className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          <Image
            src={logo}
            alt="Synapse logo"
            width={36}
            height={36}
            priority
            className="size-9 shrink-0 rounded-lg"
          />
          <span className="truncate text-lg font-semibold tracking-tight max-sm:hidden">
            Synapse
          </span>
        </Link>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <NotificationsMenu />
        <ThemeToggle />
        <ProfileMenu />
      </div>
    </header>
  );
}
