-- CreateTable
CREATE TABLE "StarredDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StarredDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StarredDocument_userId_createdAt_idx" ON "StarredDocument"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "StarredDocument_documentId_idx" ON "StarredDocument"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "StarredDocument_userId_documentId_key" ON "StarredDocument"("userId", "documentId");

-- AddForeignKey
ALTER TABLE "StarredDocument" ADD CONSTRAINT "StarredDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarredDocument" ADD CONSTRAINT "StarredDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
