"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store-ui";
import Image from "next/image";

import Synapse from "../../../../public/Synapse.svg";
import { Eye, EyeClosed } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await login(normalizedEmail, password);

      console.log(res);
      router.replace("/");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl text-lg font-bold text-primary-foreground">
            <Image src={Synapse} alt="Synapse" />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to Synapse
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to continue to your workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>

            <div className="flex h-11 rounded-lg border focus-within:ring-2 focus-within:ring-ring">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="min-w-0 flex-1 rounded-lg bg-background px-3 text-sm outline-none"
              />

              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="px-3 text-sm text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeClosed /> : <Eye/>}
              </button>
            </div>
            <div className="text-right">
              <Link
                href={`/forget/password`}
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">
            OR CONTINUE WITH
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <a
          href={`${process.env.NEXT_PUBLIC_API_URL}/auth/google`}
          className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border bg-background text-sm font-medium transition hover:bg-muted"
        >
          <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5">
            <path
              fill="#EA4335"
              d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.5 13.3l7.8 6.1C12.2 13.6 17.6 9.5 24 9.5Z"
            />
            <path
              fill="#4285F4"
              d="M46.1 24.5c0-1.6-.2-3.2-.5-4.7H24v9h12.4c-.6 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-16.9Z"
            />
            <path
              fill="#FBBC05"
              d="M10.3 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.8-6.1C.9 16.8 0 20.3 0 24s.9 7.2 2.5 10.7l7.8-6.1Z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.2 0 11.5-2 15.3-6.6l-7.4-5.7c-2 1.4-4.6 2.3-7.9 2.3-6.4 0-11.8-4.1-13.7-9.9l-7.8 6.1C6.5 42.6 14.6 48 24 48Z"
            />
          </svg>
          Continue with Google
        </a>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create account
          </Link>
        </p>
      </section>
    </main>
  );
}
