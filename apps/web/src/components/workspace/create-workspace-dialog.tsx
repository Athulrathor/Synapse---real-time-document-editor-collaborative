"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";

import { workspaceService } from "@/apis/workspace-api";
import { useWorkspaceUIStore } from "@/stores/workspace-ui.store";

const MIN = 2;
const MAX = 40;

interface CreateWorkspaceDialogProps {
  close: () => void;
}

export function CreateWorkspaceDialog({ close }: CreateWorkspaceDialogProps) {
  const workspaces = useWorkspaceUIStore((state) => state.workspaces);
  const setWorkspaces = useWorkspaceUIStore((state) => state.setWorkspaces);
  const setActiveWorkspace = useWorkspaceUIStore(
    (state) => state.setActiveWorkspace,
  );
  const setError = useWorkspaceUIStore((state) => state.setError);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [touched, setTouched] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  const nameId = useId();
  const errorId = useId();
  const submitErrorId = useId();

  // Open dialog when mounted.
  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog || dialog.open) return;

    dialog.showModal();
    inputRef.current?.focus();
  }, []);

  const trimmed = name.trim();

  const error =
    trimmed.length < MIN
      ? `Name must be at least ${MIN} characters.`
      : trimmed.length > MAX
        ? `Name must be ${MAX} characters or fewer.`
        : workspaces.some(
              (workspace) =>
                workspace.name.toLowerCase() === trimmed.toLowerCase(),
            )
          ? "A workspace with this name already exists."
          : null;

  const showError = touched && Boolean(error);

  function resetForm() {
    setName("");
    setDescription("");
    setTouched(false);
    setSubmitError(null);
    setError(null);
  }

  function handleClosed() {
    resetForm();
    close();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (submittingRef.current) return;

    setTouched(true);
    setSubmitError(null);
    setError(null);

    if (error) {
      inputRef.current?.focus();
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const createdWorkspace = await workspaceService.create({
        name: trimmed,
        description: description.trim() || undefined,
      });

      setWorkspaces([
        createdWorkspace,
        ...workspaces.filter(
          (workspace) => workspace.id !== createdWorkspace.id,
        ),
      ]);

      setActiveWorkspace(createdWorkspace.id);

      dialogRef.current?.close();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to create workspace. Please try again.";

      setSubmitError(message);
      setError(message);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClosed}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submittingRef.current) {
          dialogRef.current?.close();
        }
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
            disabled={isSubmitting}
            onClick={() => dialogRef.current?.close()}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div>
            <label
              htmlFor={nameId}
              className="mb-1.5 block text-sm font-medium"
            >
              Workspace name
            </label>

            <input
              ref={inputRef}
              id={nameId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              maxLength={MAX + 10}
              autoComplete="off"
              placeholder="e.g. Marketing"
              aria-invalid={showError || Boolean(submitError)}
              aria-describedby={
                [showError ? errorId : null, submitError ? submitErrorId : null]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive"
            />

            {showError && (
              <p
                id={errorId}
                role="alert"
                className="mt-1.5 text-xs text-destructive"
              >
                {error}
              </p>
            )}

            <div>
              <label
                htmlFor={`${nameId}-description`}
                className="mb-1.5 block text-sm font-medium"
              >
                Description
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (Optional)
                </span>
              </label>

              <textarea
                id={`${nameId}-description`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                rows={3}
                placeholder="What is this workspace about?"
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />

              <p className="mt-1 text-right text-xs text-muted-foreground">
                {description.length}/200
              </p>
            </div>

            {submitError && (
              <p
                id={submitErrorId}
                role="alert"
                className="mt-1.5 text-xs text-destructive"
              >
                {submitError}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            disabled={isSubmitting}
            className="h-10 rounded-xl px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
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
