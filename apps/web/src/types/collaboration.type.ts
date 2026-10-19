export interface JoinDocumentPayload {
  documentId: string;
}

export interface LeaveDocumentPayload {
  documentId: string;
}

export interface CollaborationErrorPayload {
  message: string;
}