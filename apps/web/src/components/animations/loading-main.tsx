"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface WorkspaceLoadingScreenProps {
  onComplete?: () => void;
}

export function WorkspaceLoadingScreen({
  onComplete,
}: WorkspaceLoadingScreenProps) {
    const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!onComplete) return;

    const timer = window.setTimeout(() => {
        setVisible(false)
        onComplete()
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="synapse-loading fixed inset-0 z-[100] flex min-h-svh items-center justify-center overflow-hidden bg-background text-foreground">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="synapse-glow absolute left-1/2 top-1/2 size-[min(80vw,320px)] -translate-x-1/2 -translate-y-[90%] rounded-full bg-primary/10 blur-[100px]" />

        <div className="synapse-glow synapse-glow-delay absolute left-1/2 top-1/2 size-[min(70vw,280px)] -translate-x-1/2 translate-y-[15%] rounded-full bg-primary/10 blur-[100px]" />
      </div>

      {/* Main content */}
      <div className="relative flex w-full max-w-md flex-col items-center px-4 sm:px-6">
        {/* Logo — no circles */}
        <div className="synapse-logo relative mb-8 flex size-32 items-center justify-center sm:mb-10 sm:size-40 md:size-48">
          <div className="synapse-logo-pulse relative size-28 sm:size-36 md:size-40">
            <Image
              src="/Synapse.svg"
              alt="Synapse"
              fill
              priority
              sizes="(max-width: 640px) 112px, (max-width: 768px) 144px, 160px"
              className="object-contain"
            />
          </div>
        </div>

        {/* Brand title */}
        <h1 className="flex flex-wrap items-center justify-center gap-x-2 text-center font-heading text-2xl tracking-tight sm:text-3xl md:text-4xl">
          <span className="font-semibold">Synapse</span>

          <span className="font-light text-muted-foreground">Workspace</span>

          <span
            aria-hidden="true"
            className="synapse-caret h-7 w-0.5 shrink-0 rounded-full bg-primary sm:h-9"
          />
        </h1>

        {/* Animated dots */}
        <div
          className="mt-8 flex items-center gap-3 sm:mt-10"
          aria-hidden="true"
        >
          <span className="synapse-dot bg-primary" />
          <span className="synapse-dot bg-primary/70" />
          <span className="synapse-dot bg-primary/40" />
        </div>

        {/* Typing message */}
        <p
          role="status"
          aria-live="polite"
          className="mt-5 min-h-5 max-w-full text-center font-sans text-xs tracking-[0.12em] text-muted-foreground sm:text-sm sm:tracking-[0.18em]"
        >
          <span className="synapse-typing">Preparing your workspace</span>
        </p>

        {/* Progress bar */}
        <div className="mt-8 h-1 w-full max-w-xs overflow-hidden rounded-full bg-muted sm:mt-10 sm:max-w-sm">
          <div className="synapse-progress h-full rounded-full bg-[image:var(--synapse-gradient)]" />
        </div>
      </div>
    </div>
  );
}
