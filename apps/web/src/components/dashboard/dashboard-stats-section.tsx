import {
  Bell,
  FileText,
  Users,
  Workflow,
} from "lucide-react";

import { DashboardStatCard } from "@/components/dashboard/dashboard-stats-card";

interface DashboardStatsProps {
  totalDocuments: number;
  totalWorkspaces: number;
  unreadNotifications: number;
  totalMembers: number;
  isLoading?: boolean;
}

export function DashboardStats({
  totalDocuments,
  totalWorkspaces,
  unreadNotifications,
  totalMembers,
  isLoading = false,
}: DashboardStatsProps) {
  const stats = [
    {
      title: "Total Documents",
      value: totalDocuments,
      description: "Documents you can access",
      icon: FileText,
    },
    {
      title: "Workspaces",
      value: totalWorkspaces,
      description: "Workspaces you belong to",
      icon: Workflow,
    },
    {
      title: "Unread Notifications",
      value: unreadNotifications,
      description: "Notifications waiting for you",
      icon: Bell,
    },
    {
      title: "Workspace Members",
      value: totalMembers,
      description: "Members across your workspaces",
      icon: Users,
    },
  ];

  return (
    <section
      aria-label="Workspace statistics"
      className="grid w-full min-w-0 grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {stats.map((stat) => (
        <DashboardStatCard
          key={stat.title}
          {...stat}
          isLoading={isLoading}
        />
      ))}
    </section>
  );
}