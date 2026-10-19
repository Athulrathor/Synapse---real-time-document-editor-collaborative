export interface DocumentCreatedEvent {
  outboxEventId: string;
  documentId: string;
  workspaceId: string;
  createdById: string;
  title: string;
}