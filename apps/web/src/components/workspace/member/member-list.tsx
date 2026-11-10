"use client";

import type { WorkspaceMember } from "@/types/workspace.type";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useRemoveWorkspaceMember } from "@/hooks/use-workspace";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import { useUpdateWorkspaceMemberRole } from "@/hooks/use-workspace";

import { env } from "@/libs/env";

interface MemberListProps {
  members: WorkspaceMember[];
  currentUserId: string;
  currentUserRole: WorkspaceMember["role"];
  WorkspaceId: string;
}

function canManageMember(
  currentUserRole: WorkspaceMember["role"],
  memberRole: WorkspaceMember["role"],
  currentUserId: string,
  memberUserId: string,
) {
  if (currentUserId === memberUserId) return false;

  if (currentUserRole === "OWNER") {
    return memberRole !== "OWNER";
  }

  if (currentUserRole === "ADMIN") {
    return memberRole === "EDITOR" || memberRole === "VIEWER";
  }

  return false;
}

function MemberRoleBadge({ role }: { role: WorkspaceMember["role"] }) {
  const variants = {
    OWNER: "bg-primary/10 text-primary border-primary/20 select:none",
    ADMIN: "bg-purple-500/10 text-purple-600 border-purple-500/20 select:none",
    EDITOR: "bg-blue-500/10 text-blue-600 border-blue-500/20 select:none",
    VIEWER: "bg-muted text-muted-foreground border-border select:none",
  };

  return (
    <Badge variant="outline" className={variants[role]}>
      {role}
    </Badge>
  );
}

export function MemberList({
  WorkspaceId,
  members,
  currentUserId,
  currentUserRole,
}: MemberListProps) {
  const updateRole = useUpdateWorkspaceMemberRole(WorkspaceId);
  const removeMember = useRemoveWorkspaceMember(WorkspaceId);

  const [selectedMember, setSelectedMember] = useState<WorkspaceMember | null>(
    null,
  );

  return (
    <div className="space-y-3">
      {members.map((member) => (
        <div
          key={member.userId}
          className="flex items-center justify-between gap-4 rounded-lg border px-2 py-1 md:p-4 md:py-2"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage
                src={`${env.urls?.ImagekitUrl}/${member?.user?.avatar?.path}`}
                alt={member.user.name}
              />
              <AvatarFallback>
                {member.user.name
                  ?.split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <p className="truncate font-medium">{member.user.name}</p>

              <p className="truncate text-sm text-muted-foreground">
                {member.user.email}
              </p>

              <p className="truncate text-xs text-muted-foreground">
                Joined{" "}
                {new Date(member.joinedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          <MemberRoleBadge role={member.role} />

          {canManageMember(
            currentUserRole,
            member.role,
            currentUserId,
            member.userId,
          ) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                {(currentUserRole === "OWNER"
                  ? ["ADMIN", "EDITOR", "VIEWER"]
                  : ["EDITOR", "VIEWER"]
                )
                  .filter((role) => role !== member.role)
                  .map((role) => (
                    <DropdownMenuItem
                      key={role}
                      disabled={updateRole.isPending}
                      onSelect={() =>
                        updateRole.mutate({
                          userId: member.userId,
                          role: role as WorkspaceMember["role"],
                        })
                      }
                    >
                      Change to {role}
                    </DropdownMenuItem>
                  ))}
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => setSelectedMember(member)}
                >
                  Remove member
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ))}
      <AlertDialog
        open={!!selectedMember}
        onOpenChange={(open) => {
          if (!open && !removeMember.isPending) {
            setSelectedMember(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>

            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{selectedMember?.user.name}</strong> from this workspace?
              They will lose access to its resources.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMember.isPending}>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={removeMember.isPending}
              onClick={(event) => {
                event.preventDefault();

                if (!selectedMember) return;

                removeMember.mutate(selectedMember.userId, {
                  onSuccess: () => setSelectedMember(null),
                });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMember.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
