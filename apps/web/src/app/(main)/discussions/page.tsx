import Link from "next/link";
import { ArrowLeft, MessagesSquare, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function DiscussionsPage() {
  return (
    <main className="flex min-h-[calc(100svh-4rem)] items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        {/* Icon */}
        <div className="relative mb-6 flex size-20 items-center justify-center rounded-3xl border border-border bg-muted/50">
          <MessagesSquare className="size-9 text-muted-foreground" />

          <span className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
        </div>

        {/* Content */}
        <span className="mb-3 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Currently unavailable
        </span>

        <h1 className="text-2xl font-semibold tracking-tight">
          Discussions
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Discussions are not available yet. We&apos;re working on bringing
          collaborative conversations to Synapse Workspace.
        </p>

        {/* Action */}
        <Button asChild className="mt-7 gap-2">
          <Link href="/dashboard">
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
        </Button>
      </div>
    </main>
  );
}