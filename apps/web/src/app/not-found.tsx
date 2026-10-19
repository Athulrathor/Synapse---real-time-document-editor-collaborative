import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="mb-6 flex size-16 items-center justify-center rounded-2xl border bg-muted">
          <FileQuestion className="size-8 text-muted-foreground" />
        </div>

        <p className="text-sm font-medium text-primary">404 Error</p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Page not found
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It may
          have been moved or doesn&apos;t exist.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
      </div>
    </main>
  );
}