-- CreateTable
CREATE TABLE "yjs_document_states" (
    "documentId" TEXT NOT NULL,
    "snapshot" BYTEA,
    "snapshotVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yjs_document_states_pkey" PRIMARY KEY ("documentId")
);

-- CreateTable
CREATE TABLE "yjs_document_updates" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "update" BYTEA NOT NULL,
    "sequence" BIGSERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "yjs_document_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "yjs_document_updates_documentId_sequence_idx" ON "yjs_document_updates"("documentId", "sequence");

-- AddForeignKey
ALTER TABLE "yjs_document_states" ADD CONSTRAINT "yjs_document_states_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yjs_document_updates" ADD CONSTRAINT "yjs_document_updates_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "yjs_document_states"("documentId") ON DELETE CASCADE ON UPDATE CASCADE;
