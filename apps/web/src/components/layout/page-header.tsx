import type { ReactNode } from "react";
import {
  PageBreadcrumb,
  type BreadcrumbItemData,
} from "@/components/layout/page-breadcrumb";

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItemData[];
  actions?: ReactNode;
}

export function PageHeader({
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  return (
    <header className="flex min-w-0 items-center justify-between gap-3 w-full px-0 md:px-3 py-3 sm:px-2">
      <div className="min-w-0 flex-1">
        <PageBreadcrumb items={breadcrumbs} />
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}