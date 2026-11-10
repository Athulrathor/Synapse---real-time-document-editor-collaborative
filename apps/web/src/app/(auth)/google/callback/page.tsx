"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get("status");
  const reason = searchParams.get("reason");

  useEffect(() => {
    if (status === "success") {
      router.replace("/");
    }
  }, [status, router]);

  const message =
    reason === "google_account_link_required"
      ? "An account with this email already exists. Please sign in using your existing method."
      : "Google sign-in failed. Please try again.";

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      {status === "error" ? (
        <div
          role="alert"
          className="w-full max-w-md rounded-xl border p-6 text-center"
        >
          <h1 className="text-xl font-semibold">
            Google sign-in failed
          </h1>

          <p className="mt-3 text-sm text-muted-foreground">
            {message}
          </p>

          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="mt-6 rounded-md bg-primary px-4 py-2 text-primary-foreground"
          >
            Back to login
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Completing Google sign-in...
        </p>
      )}
    </main>
  );
}