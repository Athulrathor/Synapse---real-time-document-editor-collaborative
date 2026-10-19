export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
        <p className="text-sm text-muted-foreground">
          Loading Synapse Workspace...
        </p>
      </div>
    </main>
  );
}