"use client";

import { useEffect } from "react";
import {
  Check,
  ChevronDown,
  FolderKanban,
  Plus,
  RefreshCw,
} from "lucide-react";

import { useUIStore } from "@/stores/ui.store";
import { useWorkspaces } from "@/hooks/use-workspace";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function WorkspaceSwitcher() {
  const storedWorkspaceId = useUIStore((state) => state.activeWorkspaceId);

  const setActiveWorkspace = useUIStore((state) => state.setActiveWorkspace);

  const openCreateWorkspace = useUIStore((state) => state.openCreateWorkspace);

  const { state } = useSidebar();

  const {
    data: workspaces = [],
    isPending,
    isError,
    refetch,
  } = useWorkspaces();

  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === storedWorkspaceId) ??
    workspaces[0] ??
    null;

  useEffect(() => {
    if (!workspaces.length) {
      if (storedWorkspaceId !== null) {
        setActiveWorkspace(null);
      }

      return;
    }

    const selectedWorkspaceExists = workspaces.some(
      (workspace) => workspace.id === storedWorkspaceId,
    );

    if (!selectedWorkspaceExists && activeWorkspace) {
      setActiveWorkspace(activeWorkspace.id);
    }
  }, [workspaces, storedWorkspaceId, activeWorkspace, setActiveWorkspace]);

  const triggerLabel = isPending
    ? "Loading workspaces..."
    : isError
      ? "Unable to load workspaces"
      : (activeWorkspace?.name ?? "No workspace");

  return (
    <SidebarMenu className="my-4">
      {" "}
      <SidebarMenuItem>
        {" "}
        <DropdownMenu>
          {" "}
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={triggerLabel}
              disabled={isPending || isError || !activeWorkspace}
              className="border border-sidebar-border bg-background"
            >
              {" "}
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {" "}
                <FolderKanban className="size-4" />{" "}
              </span>
              <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{triggerLabel}</span>

                {activeWorkspace && (
                  <span className="truncate text-xs text-muted-foreground">
                    {activeWorkspace._count.members}{" "}
                    {activeWorkspace._count.members === 1
                      ? "member"
                      : "members"}
                  </span>
                )}
              </span>
              <ChevronDown className="ml-auto size-4 shrink-0" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="flex max-h-[min(24rem,60vh)] w-60 flex-col overflow-hidden p-1">
  {/* Scrollable list */}
  <div className="workspace-scrollbar min-h-0 flex-1 overflow-y-auto">
    {workspaces.map((workspace) => (
      <DropdownMenuItem
        key={workspace.id}
        onSelect={() => setActiveWorkspace(workspace.id)}
      >
        <FolderKanban className="size-4" />
        <span className="flex-1 truncate">{workspace.name}</span>

        {workspace.id === activeWorkspace?.id && (
          <Check className="size-4 text-primary" />
        )}
      </DropdownMenuItem>
    ))}
  </div>

  {/* Fixed button */}
  <div className="shrink-0 border-t pt-1">
    <DropdownMenuItem onSelect={openCreateWorkspace}>
      <Plus className="size-4" />
      <span>Create workspace</span>
    </DropdownMenuItem>
  </div>
</DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
