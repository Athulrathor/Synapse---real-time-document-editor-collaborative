"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";

import { workspaceService } from "@/apis/workspace-api";
import { useWorkspaceUIStore } from "@/stores/workspace-ui.store";
import { useUIStore } from "@/stores/ui.store";

const COLORS = [
  { label: "Violet", value: "bg-violet-500" },
  { label: "Sky", value: "bg-sky-600" },
  { label: "Teal", value: "bg-teal-500" },
  { label: "Amber", value: "bg-amber-500" },
  { label: "Rose", value: "bg-rose-500" },
  { label: "Emerald", value: "bg-emerald-600" },
];

const MIN = 2;
const MAX = 40;

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "workspace"
  );
}

export function CreateWorkspaceDialog() {
  const open = useUIStore((state) => state.isCreateWorkspaceOpen);
  const closeStore = useUIStore((state) => state.closeCreateWorkspace);

  const workspaces = useWorkspaceUIStore((state) => state.workspaces);
  const setWorkspaces = useWorkspaceUIStore((state) => state.setWorkspaces);
  const setError = useWorkspaceUIStore((state) => state.setError);
  const setActiveWorkspace = useWorkspaceUIStore(
    (state) => state.setActiveWorkspace,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0].value);
  const [touched, setTouched] = useState(false);

  const nameId = useId();
  const errorId = useId();

  // Keep the native dialog in sync with the store
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      inputRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const trimmed = name.trim();
  const error =
    trimmed.length < MIN
      ? `Name must be at least ${MIN} characters.`
      : trimmed.length > MAX
        ? `Name must be ${MAX} characters or fewer.`
        : workspaces.some((w) => w.name.toLowerCase() === trimmed.toLowerCase())
          ? "A workspace with this name already exists."
          : null;
  const showError = touched && error;

  // Fires for Escape, the X button, backdrop click and programmatic close
  function handleClosed() {
    closeStore();
    setName("");
    setColor(COLORS[0].value);
    setTouched(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setTouched(true);
    setSubmitError(null);

    if (error) {
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const createdWorkspace = await workspaceService.create({
        name: trimmed,
      });

      setWorkspaces([createdWorkspace, ...workspaces]);
      setActiveWorkspace(createdWorkspace.id);

      dialogRef.current?.close();
    } catch (err) {
        console.log(err)
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Unable to create workspace. Please try again.",
      );
      setError(submitError as string);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClosed}
      onClick={(e) => {
        // Clicks on the ::backdrop target the <dialog> itself
        if (e.target === e.currentTarget) dialogRef.current?.close();
      }}
      aria-labelledby={`${nameId}-title`}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-border bg-popover p-0 text-popover-foreground shadow-xl backdrop:bg-black/50 backdrop:backdrop-blur-sm open:animate-in open:fade-in-0 open:zoom-in-95"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 id={`${nameId}-title`} className="text-base font-semibold">
              Create workspace
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Workspaces keep documents and teammates organised.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => dialogRef.current?.close()}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {/* Name */}
          <div>
            <label
              htmlFor={nameId}
              className="mb-1.5 block text-sm font-medium"
            >
              Workspace name
            </label>
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-base font-semibold text-white ${color}`}
              >
                {trimmed ? trimmed.charAt(0).toUpperCase() : "W"}
              </span>
              {submitError && (
                <p role="alert" className="text-sm text-destructive">
                  {submitError}
                </p>
              )}
              <input
                ref={inputRef}
                id={nameId}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => name && setTouched(true)}
                maxLength={MAX + 10}
                autoComplete="off"
                placeholder="e.g. Marketing"
                aria-invalid={showError ? true : undefined}
                aria-describedby={showError ? errorId : undefined}
                className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive"
              />
            </div>
            {showError && (
              <p
                id={errorId}
                role="alert"
                className="mt-1.5 text-xs text-destructive"
              >
                {error}
              </p>
            )}
          </div>

          {/* Colour */}
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Colour</legend>
            <div
              role="radiogroup"
              aria-label="Workspace colour"
              className="flex flex-wrap gap-2"
            >
              {COLORS.map((c) => {
                const selected = c.value === color;
                return (
                  <button
                    key={c.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={c.label}
                    title={c.label}
                    onClick={() => setColor(c.value)}
                    className={`size-8 rounded-full ${c.value} outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover ${
                      selected
                        ? "ring-2 ring-foreground ring-offset-2 ring-offset-popover"
                        : ""
                    }`}
                  />
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            disabled={isSubmitting}
            className="h-10 rounded-xl px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 rounded-xl bg-synapse-gradient px-4 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create workspace"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
