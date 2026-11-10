export type PresenceStatus = "VIEWING" | "EDITING";

export interface CollaboratorPresence {
  userId: string;
  name?: string;
  avatarPath?: string | null;
  status: PresenceStatus;
  isTyping: boolean;
  isOnline?: boolean;
  cursorPosition: number | null;
  selectionEnd: number | null;
  lastActiveAt: string | number;
}

export interface DocumentPresence {
  documentId: string;
  totalActiveUsers: number;
  users: CollaboratorPresence[];
}

export interface TypingUser {
  userId: string;
  status: "viewing" | "editing";
}

export interface TypingUpdate {
  documentId: string;
  typingUsers: TypingUser[];
}