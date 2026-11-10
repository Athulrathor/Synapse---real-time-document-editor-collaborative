import { NewDocumentButton } from "@/components/documents/documentPage/document-button";

interface DocumentsPageProps {
  workspaceId: string;
}

export default function DocumentsHeader({
  workspaceId,
}: DocumentsPageProps) {
  return (
    <section className="w-full space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground">
            Create, manage, and collaborate on your workspace documents.
          </p>
        </div>

        <NewDocumentButton workspaceId={workspaceId} />
      </header>
    </section>
  );
}
