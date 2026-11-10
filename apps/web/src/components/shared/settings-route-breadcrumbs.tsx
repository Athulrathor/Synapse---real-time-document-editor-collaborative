"use client";

import { usePathname } from "next/navigation";

import { PageBreadcrumbBar } from "@/components/shared/page-breadcrumb-bar";
import type { BreadcrumbItemData } from "@/components/layout/page-breadcrumb";

const settingsLabels: Record<string, string> = {
  settings: "Settings",
  account: "Account",
  appearences: "Appearance",
  notification: "Notifications",
  profile: "Profile",
  security: "Security",
  workspaces: "Workspaces",
};

export function SettingsRouteBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const items: BreadcrumbItemData[] = segments.map((segment, index) => ({
    label: settingsLabels[segment] ?? "Details",
    href:
      index < segments.length - 1
        ? `/${segments.slice(0, index + 1).join("/")}`
        : undefined,
  }));

  return <PageBreadcrumbBar items={items} />;
}