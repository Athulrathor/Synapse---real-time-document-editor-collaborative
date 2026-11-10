"use client";

import { useParams, usePathname } from "next/navigation";

import { useWorkspaceDetail } from "@/hooks/use-workspace";
import { PageBreadcrumbBar } from "@/components/shared/page-breadcrumb-bar";
import type { BreadcrumbItemData } from "@/components/layout/page-breadcrumb";

const routeLabels: Record<string, string> = {
  activity: "Activity",
  documents: "Documents",
  favourites: "Favorites",
  members: "Members",
  trash: "Trash",
};

export function WorkspaceRouteBreadcrumbs() {
  const pathname = usePathname();
  const params = useParams<{ workspaceId: string }>();

  const workspaceId = params.workspaceId;
  const { data: workspace, isPending } = useWorkspaceDetail(workspaceId);

  const segments = pathname.split("/").filter(Boolean);
  const currentSection = segments[2];

  const workspaceName = isPending
    ? "Loading workspace..."
    : workspace?.name ?? "Workspace";

  const items: BreadcrumbItemData[] = [
    { label: "Dashboard", href: "/dashboard" },
    {
      label: workspaceName,
      href: `/workspaces/${workspaceId}`,
    },
    {
      label: routeLabels[currentSection] ?? "Overview",
    },
  ];

  return <PageBreadcrumbBar items={items} />;
}