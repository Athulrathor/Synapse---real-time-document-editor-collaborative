import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStatCardProps {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  isLoading?: boolean;
}

export function DashboardStatCard({
  title,
  value,
  description,
  icon: Icon,
  isLoading = false,
}: DashboardStatCardProps) {
  return (
    <Card className="min-w-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>

        <Icon
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </CardHeader>

      <CardContent className="space-y-1">
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-32 max-w-full" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold tracking-tight">
              {value.toLocaleString()}
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}