"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

import { useAuthStore } from "@/stores/auth-store-ui";
import { Button } from "@/components/ui/button";
import {
  useAcceptWorkspaceInvitation,
  useRejectWorkspaceInvitation,
} from "@/hooks/use-workspace";

type InvitationAction = "accept" | "reject";

export default function InvitationsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const authStatus = useAuthStore((state) => state.status);

  const [loading, setLoading] = useState<InvitationAction | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token = searchParams.get("token");

  const acceptMutation = useAcceptWorkspaceInvitation();
  const rejectMutation = useRejectWorkspaceInvitation();

  const isSubmitting = acceptMutation.isPending || rejectMutation.isPending;

  const handleInvitation = async (action: InvitationAction) => {
    if (!token || isSubmitting) return;

    setLoading(action);
    setError("");
    setMessage("");

    try {
      const input = { token };

      if (action === "accept") {
        await acceptMutation.mutateAsync(input);
        setMessage("Invitation accepted successfully.");
      } else {
        await rejectMutation.mutateAsync(input);
        setMessage("Invitation rejected successfully.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Unable to ${action} invitation. Please try again.`,
      );
    } finally {
      setLoading(null);
    }
  };

  if (authStatus === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Checking your session...
        </p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">
          Invitation token is missing or invalid.
        </p>
      </div>
    );
  }

  if (!user || !accessToken) {
    const returnUrl = `/invitations?token=${encodeURIComponent(token)}`;

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="space-y-3 text-center">
          <h1 className="text-xl font-semibold">Sign in to continue</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with the email address that received this invitation.
          </p>
          <Button asChild>
            <Link href={`/login?returnUrl=${encodeURIComponent(returnUrl)}`}>
              Sign in
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border bg-card p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl">
            ✉
          </div>

          <h1 className="text-xl font-semibold tracking-tight">
            Workspace invitation
          </h1>

          <p className="text-sm text-muted-foreground">
            You have been invited to join a workspace. Review your invitation
            before responding.
          </p>
        </div>

        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <p className="text-muted-foreground">Signed in as</p>
          <p className="mt-1 font-medium">{user.email}</p>
          <p className="mt-3 text-muted-foreground">Invitation token</p>
          <p className="mt-1 break-all font-mono text-xs">
            {`${token.slice(0, 8)}••••••••`}
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {message && (
          <p role="status" className="text-sm text-green-600">
            {message}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Button
            className="w-full"
            disabled={loading !== null || !!message}
            onClick={() => handleInvitation("accept")}
          >
            {loading === "accept" ? "Accepting..." : "Accept invitation"}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            disabled={loading !== null || !!message}
            onClick={() => handleInvitation("reject")}
          >
            {loading === "reject" ? "Rejecting..." : "Reject invitation"}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Accepting or rejecting this invitation requires your confirmation.
        </p>
      </div>
    </div>
  );
}
