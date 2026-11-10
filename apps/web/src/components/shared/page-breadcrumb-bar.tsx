"use client";

import { PageBreadcrumb, type BreadcrumbItemData } from "@/components/layout/page-breadcrumb";

interface PageBreadcrumbBarProps {
  items: BreadcrumbItemData[];
}

export function PageBreadcrumbBar({
  items,
}: PageBreadcrumbBarProps) {
  if (!items.length) return null;

  return (
    <div className="flex h-8 items-center border-b min-h-0 w-full max-w-7xl text-muted-foreground py-2 sm:px-2 px-3 mx-auto">
      <PageBreadcrumb items={items} />
    </div>
  );
}