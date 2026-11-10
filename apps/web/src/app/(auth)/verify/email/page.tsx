"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/apis/auth-api";

type VerificationStatus =
  | "checking"
  | "loading"
  | "success"
  | "error";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "We couldn't verify your email. Please try again.";
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token")?.trim() ?? "";

  const [status, setStatus] = useState<VerificationStatus>(
    token ? "checking" : "checking",
  );

  const [message, setMessage] = useState(
    token
      ? "Verifying your email address..."
      : "Check your inbox for the verification link.",
  );

  const [attempt, setAttempt] = useState(0);

  // Prevent duplicate requests caused by React Strict Mode.
  const requestKeyRef = useRef<string | null>(null);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;

    return () => {
      activeRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    const requestKey = `${token}:${attempt}`;

    if (requestKeyRef.current === requestKey) {
      return;
    }

    requestKeyRef.current = requestKey;

    let cancelled = false;

    async function verifyEmail() {
      try {
        await authService.verifyEmail({ token });

        if (cancelled || !activeRef.current) return;

        setStatus("success");
        setMessage(
          "Your email has been verified successfully. Redirecting you to sign in...",
        );

        // Give the user time to read the successful result.
        window.setTimeout(() => {
          if (!cancelled && activeRef.current) {
            router.replace("/login?verified=1");
          }
        }, 1500);
      } catch (error: unknown) {
        if (cancelled || !activeRef.current) return;

        setStatus("error");
        setMessage(getErrorMessage(error));
      }
    }

    void verifyEmail();

    return () => {
      cancelled = true;
    };
  }, [token, attempt, router]);

  function retryVerification() {
    if (!token || status === "loading" || status === "success") {
      return;
    }

    // Permit one new attempt after a failed request.
    requestKeyRef.current = null;
    setStatus("loading");
    setMessage("Verifying your email address...");
    setAttempt((current) => current + 1);
  }

  if (!token) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground">
        <section className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-2xl">
            ✉
          </div>

          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            Check your email
          </h1>

          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            If your registration was successful, we&apos;ve queued a verification
            email for your address. Open that email and follow its
            verification link to activate your account.
          </p>

          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Check your spam folder if the email doesn&apos;t arrive. The link may
            expire, so use the latest verification email you received.
          </p>

          <div className="mt-7 flex flex-col gap-3">
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Go to sign in
            </Link>

            <Link
              href="/register"
              className="inline-flex h-11 items-center justify-center rounded-lg border px-4 text-sm font-medium hover:bg-muted"
            >
              Back to registration
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const isLoading = status === "loading" || status === "checking";
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div
          className={`mx-auto flex size-14 items-center justify-center rounded-full text-2xl ${
            isSuccess
              ? "bg-emerald-500/10 text-emerald-600"
              : isError
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary"
          }`}
          aria-hidden="true"
        >
          {isSuccess ? "✓" : isError ? "!" : "✉"}
        </div>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          {isSuccess
            ? "Email verified"
            : isError
              ? "Verification unsuccessful"
              : "Verifying your email"}
        </h1>

        <p
          role={isError ? "alert" : "status"}
          aria-live="polite"
          className="mt-3 text-sm leading-6 text-muted-foreground"
        >
          {message}
        </p>

        {isLoading && (
          <div className="mt-6 flex justify-center" aria-hidden="true">
            <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary motion-reduce:animate-none" />
          </div>
        )}

        {isError && (
          <div className="mt-7 flex flex-col gap-3">
            <button
              type="button"
              onClick={retryVerification}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Try verification again
            </button>

            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-lg border px-4 text-sm font-medium hover:bg-muted"
            >
              Return to sign in
            </Link>
          </div>
        )}

        {isSuccess && (
          <Link
            href="/login?verified=1"
            className="mt-7 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Continue to sign in
          </Link>
        )}
      </section>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
          <p className="text-sm text-muted-foreground">
            Loading email verification...
          </p>
        </main>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}