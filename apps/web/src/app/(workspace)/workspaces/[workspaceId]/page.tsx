"use client";

import { useParams } from "next/navigation";
import { useWorkspaceDetail } from "@/hooks/use-workspace";

export default function WorkspaceOverviewPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const { data: workspace, isLoading, isError } =
    useWorkspaceDetail(workspaceId);

  if (isLoading) {
    return <div>Loading workspace...</div>;
  }

  if (isError || !workspace) {
    return <div>Unable to load workspace.</div>;
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{workspace.name}</h1>
        <p className="text-muted-foreground">
          {workspace.description || "No workspace description"}
        </p>
      </div>
    </section>
  );
}