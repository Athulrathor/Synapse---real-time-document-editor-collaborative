
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/apis/auth-api";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (!token) {
        setStatus("error");
        setMessage("The verification token is missing or invalid.");
        return;
      }

      try {
        await authService.verifyEmail({ token });

        if (cancelled) return;

        setStatus("success");
        setMessage("Your email has been verified successfully.");

        router.replace("/login");
      } catch (error: unknown) {
        if (cancelled) return;

        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Email verification failed. Please request a new link.",
        );
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          Email verification
        </h1>

        <p
          role={status === "error" ? "alert" : "status"}
          className="mt-4 text-sm text-muted-foreground"
        >
          {message}
        </p>

        {status === "error" && (
          <Link
            href="/login"
            className="mt-6 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Return to sign in
          </Link>
        )}
      </section>
    </main>
  );
}
