-- AlterTable
ALTER TABLE "yjs_document_updates" ADD COLUMN     "actorId" TEXT;

-- CreateIndex
CREATE INDEX "yjs_document_updates_actorId_idx" ON "yjs_document_updates"("actorId");

-- AddForeignKey
ALTER TABLE "yjs_document_updates" ADD CONSTRAINT "yjs_document_updates_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
