import { EditorClient } from "@/components/documents/editor/component/editor-client";

interface DocumentEditorPageProps {
  params: Promise<{
    workspaceId: string;
    documentId: string;
  }>;
}

export default async function DocumentEditorPage({
  params,
}: DocumentEditorPageProps) {
  const { workspaceId, documentId } = await params;

  return (
    <section className="flex min-h-0 w-full flex-1 flex-col">
      {/* Editor header */}
      <EditorClient workspaceId={workspaceId} documentId={documentId} />
      {/* Formatting toolbar */}
      {/* Editor workspace */}
      {/* Collaboration interface */}
    </section>
  );
}