"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings2,
  UserRound,
  UserCog,
  ShieldCheck,
  Monitor,
  Bell,
  Users,
  X,
  ArrowLeft,
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

const settingsMenu = [
  // {
  //   label: "General",
  //   href: "/settings",
  //   icon: Settings2,
  // },
  {
    label: "Profile",
    href: "/settings/profile",
    icon: UserRound,
  },
  {
    label: "Account",
    href: "/settings/account",
    icon: UserCog,
  },
  {
    label: "Appearance",
    href: "/settings/appearences",
    icon: Monitor,
  },
  {
    label: "Notifications",
    href: "/settings/notification",
    icon: Bell,
  },
  {
    label: "Security",
    href: "/settings/security",
    icon: ShieldCheck,
  },
  // {
  //   label: "Workspaces",
  //   href: "/settings/workspaces",
  //   icon: Users,
  // },
];

export function SettingsSidebar() {
  const pathname = usePathname();
  const { state, toggleSidebar,isMobile } = useSidebar();

  const isActiveRoute = (href: string) =>
    href === "/settings"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

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
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="flex gap-3 py-3 sm:hidden">
        <SidebarMenu>
          <SidebarMenuItem className="flex h-11 items-center gap-2">
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip="Settings"
              className="flex"
            >
              <Link href="/settings">
                <Settings2 className="size-5 shrink-0" />
                <span className="truncate text-base font-semibold">
                  Settings
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

      <SidebarContent className="px-2 mt-4 sm:mt-20">
        <SidebarMenu className="gap-2">
          {settingsMenu.map(({ label, href, icon: Icon }) => {
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
              <Link href="/dashboard">
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
