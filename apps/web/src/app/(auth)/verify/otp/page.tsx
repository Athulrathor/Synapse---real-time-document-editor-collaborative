"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/apis/auth-api";

export default function VerifyOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const submittingRef = useRef(false);

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current) return;

    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Enter the email address associated with your account.");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the six-digit code from your email.");
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      const result = await authService.verifyPasswordResetOtp({
        email: normalizedEmail,
        otp,
      }) as {resetToken: string};

      if (!result?.resetToken) {
        throw new Error(
          "The verification response did not contain a reset token. Please try again.",
        );
      }

      // Never put the OTP or reset token in the URL.
      sessionStorage.setItem(
        "synapse-password-reset-token",
        result.resetToken,
      );

      sessionStorage.setItem(
        "synapse-password-reset-email",
        normalizedEmail,
      );

      setSuccess("Code verified. Taking you to the password reset page...");

      window.setTimeout(() => {
        router.replace("/reset-password");
      }, 900);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't verify the code. Please try again.",
      );
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          Verify reset code
        </h1>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Enter the email address and six-digit code you received. The code
          expires after five minutes.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email address
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
              className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="otp" className="text-sm font-medium">
              Six-digit code
            </label>

            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              pattern="[0-9]{6}"
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              disabled={loading}
              placeholder="000000"
              className="h-12 w-full rounded-lg border bg-background px-3 text-center text-lg tracking-[0.35em] outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            />
          </div>

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
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Verifying code..." : "Verify code"}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-3 text-center text-sm">
          <Link
            href={`/forgot-password?email=${encodeURIComponent(email.trim())}`}
            className="font-medium text-primary hover:underline"
          >
            Request another reset code
          </Link>

          <Link
            href="/login"
            className="text-muted-foreground hover:underline"
          >
            Return to sign in
          </Link>
        </div>
      </section>
    </main>
  );
}