"use client";

import { useParams } from "next/navigation";

import { useDocument } from "@/hooks/use-document";
import { PageBreadcrumbBar } from "@/components/shared/page-breadcrumb-bar";
import type { BreadcrumbItemData } from "@/components/layout/page-breadcrumb";

export function EditorRouteBreadcrumbs() {
  const params = useParams<{
    workspaceId: string;
    documentId: string;
  }>();

  const { data: document, isPending } = useDocument(params.documentId);

  const items: BreadcrumbItemData[] = [
    {
      label: "Dashboard",
      href: "/dashboard",
    },
    {
      label: document?.workspace?.name ?? "Workspace",
      href: `/workspaces/${params.workspaceId}`,
    },
    {
      label: "Documents",
      href: `/workspaces/${params.workspaceId}/documents`,
    },
    {
      label: isPending ? "Loading document..." : document?.title ?? "Document",
    },
  ];

  return <PageBreadcrumbBar items={items} />;
}