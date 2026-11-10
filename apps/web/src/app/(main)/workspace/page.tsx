import { WorkspaceOverview } from "@/components/workspace/workspace-overview";

export default function WorkspacesPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Workspaces</h1>
        <p className="text-sm text-muted-foreground">
          Select a workspace to continue collaborating.
        </p>
      </div>

      <WorkspaceOverview />
    </section>
  );
}