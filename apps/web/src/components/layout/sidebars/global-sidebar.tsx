"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  MessagesSquare,
  Mail,
  Settings2,
  Plus,
  X,
} from "lucide-react";

import Synapse from "../../../../public/Synapse.svg";

import { useUIStore } from "@/stores/ui.store";
import { useAuthStore } from "@/stores/auth-store-ui";
import { env } from "@/libs/env";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useState } from "react";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";

const menu = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Workspaces",
    href: "/workspace",
    icon: FolderKanban,
  },
  {
    label: "Discussions",
    href: "/discussions",
    icon: MessagesSquare,
  },
  {
    label: "Invitations",
    href: "/invitations",
    icon: Mail,
  },
];

export function GlobalSidebar() {
  const [openWorkspaceDialog, setOpenWorkspaceDialog] =
    useState<boolean>(false);

  const pathname = usePathname();

  const { state, toggleSidebar, isMobile } = useSidebar();

  const user = useAuthStore((state) => state.user);

  const initials =
    user?.name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "U";

  const isActiveRoute = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const handleNavigation = () => {
    if (isMobile) {
      toggleSidebar();
    } else {
      // Collapse only if currently expanded
      if (state === "expanded") {
        toggleSidebar();
      }
    }
  };

  return (
    <>
      <Sidebar collapsible="icon" variant="sidebar" className="h-svh">
        {/* Brand */}
        <SidebarHeader className="flex gap-3 py-3 sm:hidden">
          <SidebarMenu>
            <SidebarMenuItem className="flex h-11 flex-row items-center gap-2">
              <SidebarMenuButton
                asChild
                size="lg"
                tooltip="Synapse Workspace"
                className="flex"
              >
                <Link href="/dashboard">
                  <Image
                    src={Synapse}
                    alt="Synapse"
                    width={36}
                    height={36}
                    priority
                    className="size-8 shrink-0 rounded-lg"
                  />

                  <span className="truncate text-base font-semibold tracking-tight">
                    Synapse
                  </span>
                </Link>
              </SidebarMenuButton>

              <SidebarMenuButton
                onClick={toggleSidebar}
                aria-label="Close sidebar"
                className={`!size-8 !min-h-8 !min-w-8 shrink-0 justify-center p-0 ${
                  state === "collapsed" ? "hidden max-md:flex" : "flex"
                }`}
              >
                <X className="size-4" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* Global Navigation */}
        <SidebarContent className="px-2 mt-4 sm:mt-20">
          <SidebarMenu className="gap-2 ">
            {menu.map(({ label, href, icon: Icon }) => {
              const isActive = isActiveRoute(href);

              return (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={label}
                    className={
                      isActive
                        ? "bg-synapse-gradient py-2 text-white hover:bg-synapse-gradient hover:text-white data-[active=true]:bg-synapse-gradient data-[active=true]:text-white md:py-3"
                        : "py-2 md:py-3"
                    }
                  >
                    <Link
                      href={href}
                      aria-current={isActive ? "page" : undefined}
                      onClick={handleNavigation}
                      className=""
                    >
                      <Icon className="size-4 shrink-0 sm:mr-3" />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>

          {/* Create Workspace */}
          <div className="mt-auto py-2 md:py-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
              onClick={() => setOpenWorkspaceDialog(true)}
            >
              <Plus className="size-4 shrink-0" />

              <span className="truncate group-data-[collapsible=icon]:hidden">
                Create workspace
              </span>
            </Button>
          </div>
        </SidebarContent>

        {/* Account */}
        <SidebarFooter className="border-t border-sidebar-border p-2">
          <SidebarMenu className="gap-2">
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Settings">
                <Link href="/settings">
                  <Settings2 className="size-4" />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                size="lg"
                tooltip={user?.name || "My account"}
                className="rounded-full"
              >
                <Link href="/settings/profile">
                  <Avatar className="size-8 shrink-0">
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

                  <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {user?.name || "My account"}
                    </span>

                    <span className="truncate text-xs text-muted-foreground">
                      {user?.email || ""}
                    </span>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>
      {openWorkspaceDialog && (
        <CreateWorkspaceDialog close={() => setOpenWorkspaceDialog(false)} />
      )}
    </>
  );
}
