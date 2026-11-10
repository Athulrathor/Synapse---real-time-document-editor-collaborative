"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Activity,
  Star,
  Trash2,
  ArrowLeft,
  X,
} from "lucide-react";

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

export function WorkspacesSidebar() {

  const pathname = usePathname();
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const { state, toggleSidebar, isMobile } = useSidebar();

  const basePath = `/workspaces/${workspaceId}`;

  const menu = [
    {
      label: "Documents",
      href: `${basePath}/documents`,
      icon: FileText,
    },
    {
      label: "Members",
      href: `${basePath}/members`,
      icon: Users,
    },
    {
      label: "Activity",
      href: `${basePath}/activity`,
      icon: Activity,
    },
    {
      label: "Favorites",
      href: `${basePath}/favourites`,
      icon: Star,
    },
    {
      label: "Trash",
      href: `${basePath}/trash`,
      icon: Trash2,
    },
  ];

  const isActiveRoute = (href: string) => pathname === href;

  const handleNavigation = () => {
    if (isMobile && state === "expanded") {
      toggleSidebar();
    }
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="flex gap-3 py-3 sm:hidden">
        <SidebarMenu>
          <SidebarMenuItem className="flex h-11 items-center gap-2">
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip="Workspace"
              className="flex"
            >
              <Link href={`${basePath}/overview`} onClick={handleNavigation}>
                <LayoutDashboard className="size-5 shrink-0" />
                <span className="truncate text-base font-semibold">
                  Workspace
                </span>
              </Link>
            </SidebarMenuButton>

            <SidebarMenuButton
              onClick={toggleSidebar}
              aria-label="Close sidebar"
              className="!size-8 !min-h-8 !min-w-8 shrink-0 justify-center p-0"
            >
              <X className="size-4" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="mt-4 px-2 sm:mt-20">
        <SidebarMenu className="gap-2">
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
                      ? "bg-synapse-gradient py-2 text-white hover:bg-synapse-gradient hover:text-white data-[active=true]:bg-synapse-gradient data-[active=true]:text-white md:py-4"
                      : "py-2 md:py-4"
                  }
                >
                  <Link
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={handleNavigation}
                  >
                    <Icon className="size-4 shrink-0 sm:mr-3" />
                    <span>{label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Back to Dashboard">
              <Link href="/dashboard" onClick={handleNavigation}>
                <ArrowLeft className="size-4" />
                <span>Back to Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}