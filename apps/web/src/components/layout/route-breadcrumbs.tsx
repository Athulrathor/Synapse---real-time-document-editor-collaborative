"use client";

import { usePathname } from "next/navigation";
import { PageBreadcrumbBar } from "@/components/shared/page-breadcrumb-bar";
import type { BreadcrumbItemData } from "@/components/layout/page-breadcrumb";

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  discussions: "Discussions",
  documents: "Documents",
  invitations: "Invitations",
  notifications: "Notifications",
  recent: "Recent",
  search: "Search",
  starred: "Starred",
  trash: "Trash",
  workspace: "Workspaces",
};

export function RouteBreadcrumbs() {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);

  const items: BreadcrumbItemData[] = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;

    return {
      label: routeLabels[segment] ?? "Details",
      href: index < segments.length - 1 ? href : undefined,
    };
  });

  if (items.length === 0) {
    items.push({ label: "Dashboard" });
  }

  return <PageBreadcrumbBar items={items} />;
}