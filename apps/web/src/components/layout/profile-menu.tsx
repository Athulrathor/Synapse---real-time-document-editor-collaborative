"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChevronDown,
  LoaderCircle,
  LogOut,
  Settings2,
} from "lucide-react";

import { useAuthStore } from "@/stores/auth-store-ui";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { env } from "@/libs/env";

export function ProfileMenu() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const initials =
    user?.name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U";

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 min-w-0 gap-2 rounded-full px-1.5 py-4 sm:px-2"
          aria-label="Open profile menu"
        >
          <Avatar className="size-8 shrink-0 ring-2 ring-primary/20">
            {user?.avatar?.path && (
              <AvatarImage
                src={`${env.urls.ImagekitUrl}/${user.avatar.path}`}
                alt={user.name || "Profile picture"}
              />
            )}

            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>

          <span className="hidden min-w-0 max-w-32 text-left sm:block">
            <span className="block truncate text-xs font-medium">
              {user?.name || "My account"}
            </span>

            <span className="block truncate text-[11px] text-muted-foreground">
              {user?.email || "Account"}
            </span>
          </span>

          <ChevronDown
            className="hidden size-3.5 shrink-0 text-muted-foreground sm:block"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className="w-[min(17rem,calc(100vw-1.5rem))] rounded-lg"
      >
        <DropdownMenuLabel className="p-3 font-normal">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-10 shrink-0">
              {user?.avatar?.path && (
                <AvatarImage
                  src={`${env.urls.ImagekitUrl}/${user.avatar.path}`}
                  alt={user.name || "Profile picture"}
                />
              )}

              <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {user?.name || "My account"}
              </p>

              <p className="truncate text-xs text-muted-foreground">
                {user?.email || ""}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={`/settings/profile`} className="cursor-pointer">
              <Settings2 className="size-4" />
              Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          disabled={isLoggingOut}
          onSelect={(event) => {
            event.preventDefault();
            void handleLogout();
          }}
          className="cursor-pointer"
        >
          {isLoggingOut ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" />
          )}

          {isLoggingOut ? "Signing out..." : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}