-- AlterTable
ALTER TABLE "yjs_document_states" ADD COLUMN     "lastEditedAt" TIMESTAMP(3),
ADD COLUMN     "pendingActorIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
