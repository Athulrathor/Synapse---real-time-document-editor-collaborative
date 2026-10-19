
export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  members: {
    role: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";
    joinedAt: string;
  }[];
  _count: {
    members: number;
    documents: number;
  };
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
}
