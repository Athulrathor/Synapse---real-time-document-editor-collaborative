"use client";

import type { ComponentProps } from "react";
import { useParams } from "next/navigation";

import { MemberList } from "@/components/workspace/member/member-list";
import { useWorkspaceDetail } from "@/hooks/use-workspace";
import { useAuthStore } from "@/stores/auth-store-ui";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { InviteMemberDialog } from "@/components/workspace/member/invite-member-dialog";
import { InvitationList } from "@/components/workspace/member/invitations-list";

export default function WorkspaceMembersPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;

  const userId = useAuthStore((state) => state.user?.id);

  const {
    data: workspace,
    isLoading,
    isError,
    error,
    refetch,
  } = useWorkspaceDetail(workspaceId);

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-60 flex-col items-center justify-center gap-3">
        <p className="text-sm text-destructive">
          {error instanceof Error
            ? error.message
            : "Unable to load workspace members."}
        </p>

        <button
          type="button"
          onClick={() => refetch()}
          className="text-sm font-medium underline underline-offset-4"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex min-h-60 items-center justify-center">
        <p className="text-sm text-muted-foreground">Workspace not found.</p>
      </div>
    );
  }

  const currentMember = workspace.members.find(
    (member) => member.userId === userId,
  );

  if (!currentMember) {
    return (
      <div className="flex min-h-60 items-center justify-center">
        <p className="text-sm text-muted-foreground">
          You are not a member of this workspace.
        </p>
      </div>
    );
  }

  
const canManageInvitations =
  currentMember.role === "OWNER" || currentMember.role === "ADMIN";

return (
  <div className="w-full space-y-6">
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Members
        </h1>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {workspace._count.members} members
          </span>

          {canManageInvitations && (
            <InviteMemberDialog workspaceId={workspaceId} />
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Manage the people who have access to {workspace.name}.
      </p>
    </div>

    <Tabs defaultValue="members" className="w-full">
      <TabsList>
        <TabsTrigger value="members">Members</TabsTrigger>

        {canManageInvitations && (
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="members" className="mt-4">
        <MemberList
          WorkspaceId={workspaceId}
          members={workspace.members as ComponentProps<typeof MemberList>["members"]}
          currentUserId={userId!}
          currentUserRole={currentMember.role}
        />
      </TabsContent>

      {canManageInvitations && (
        <TabsContent value="invitations" className="mt-4">
          <InvitationList workspaceId={workspaceId} />
        </TabsContent>
      )}
    </Tabs>
  </div>
);

}
