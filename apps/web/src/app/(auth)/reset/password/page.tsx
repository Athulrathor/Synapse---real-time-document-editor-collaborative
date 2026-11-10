"use client";

import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authService } from "@/apis/auth-api";
import { ResetPasswordInput } from "@/types/auth.type";

const TOKEN_LOADING = "__synapse_reset_token_loading__";

function subscribeToResetToken(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getResetToken() {
  return sessionStorage.getItem("synapse-password-reset-token");
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const submittingRef = useRef(false);

  const resetToken = useSyncExternalStore(
    subscribeToResetToken,
    getResetToken,
    () => TOKEN_LOADING,
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current || !resetToken) return;

    setError("");

    if (newPassword.length < 8) {
      setError("Your new password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      await authService.resetPassword({
        resetToken,
        newPassword,
      } as ResetPasswordInput);

      // The reset token should not be reused after a successful reset.
      sessionStorage.removeItem("synapse-password-reset-token");
      sessionStorage.removeItem("synapse-password-reset-email");

      setSuccess(true);

      window.setTimeout(() => {
        router.replace("/login?passwordReset=success");
      }, 1500);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't reset your password. Please try again.",
      );
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  if (resetToken === TOKEN_LOADING) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
        <p role="status" className="text-sm text-muted-foreground">
          Checking your reset session...
        </p>
      </main>
    );
  }

  if (!resetToken) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground">
        <section className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">
            Reset session expired
          </h1>

          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Your reset token is missing from this browser tab. Verify your
            code again or request a new password-reset code.
          </p>

          <Link
            href="/forgot-password"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Request a new code
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create a new password
        </h1>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Choose a strong password you haven&apos;t used for this account before.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div className="space-y-2">
            <label htmlFor="newPassword" className="text-sm font-medium">
              New password
            </label>

            <input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={loading || success}
              className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              placeholder="Enter new password"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm new password
            </label>

            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={loading || success}
              className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              placeholder="Confirm new password"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
              disabled={loading || success}
              className="size-4 accent-primary"
            />
            Show passwords
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          {success && (
            <p
              role="status"
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm"
            >
              Your password has been reset successfully. Redirecting to sign in...
            </p>
          )}

          <button
            type="submit"
            disabled={loading || success}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Resetting password..."
              : success
                ? "Password reset"
                : "Reset password"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered your password?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}