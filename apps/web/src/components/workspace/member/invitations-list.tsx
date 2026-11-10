
"use client";

import { useState } from "react";

import type { WorkspaceInvitation } from "@/types/workspace.type";
import {
  useRevokeWorkspaceInvitation,
  useWorkspaceInvitations,
} from "@/hooks/use-workspace";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";

interface InvitationListProps {
  workspaceId: string;
}

export function InvitationList({ workspaceId }: InvitationListProps) {
  const { data, isLoading, isError, error, refetch } =
    useWorkspaceInvitations(workspaceId);

  const revokeInvitation = useRevokeWorkspaceInvitation(workspaceId);

  const [selectedInvitation, setSelectedInvitation] =
    useState<WorkspaceInvitation | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-2 py-6 text-center">
        <p className="text-sm text-destructive">
          {error instanceof Error
            ? error.message
            : "Unable to load invitations."}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const invitations = data ?? [];
  const pendingInvitations = invitations.filter(
    (invitation) => invitation.status === "PENDING",
  );

  if (pendingInvitations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-10 text-center">
        <p className="font-medium">No pending invitations</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Invitations you send will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pendingInvitations.map((invitation) => (
        <div
          key={invitation.id}
          className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 space-y-1">
            <p className="truncate font-medium">{invitation.email}</p>

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{invitation.role}</Badge>
              <span>Expires {new Date(invitation.expiresAt).toLocaleDateString("en-IN")}</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={revokeInvitation.isPending}
            onClick={() => setSelectedInvitation(invitation)}
          >
            Revoke
          </Button>
        </div>
      ))}

      <AlertDialog
        open={!!selectedInvitation}
        onOpenChange={(open) => {
          if (!open && !revokeInvitation.isPending) {
            setSelectedInvitation(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              The invitation sent to{" "}
              <strong>{selectedInvitation?.email}</strong> will no longer be
              usable.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeInvitation.isPending}>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={revokeInvitation.isPending}
              onClick={(event) => {
                event.preventDefault();

                if (!selectedInvitation) return;

                revokeInvitation.mutate(selectedInvitation.id, {
                  onSuccess: () => setSelectedInvitation(null),
                });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeInvitation.isPending ? "Revoking..." : "Revoke invitation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
