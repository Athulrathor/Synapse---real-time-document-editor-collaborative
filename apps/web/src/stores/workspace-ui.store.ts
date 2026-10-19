
import { create } from "zustand";

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

interface WorkspaceUIState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  isLoading: boolean;
  error: string | null;

  setWorkspaces: (workspaces: Workspace[]) => void;
  setActiveWorkspace: (workspaceId: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useWorkspaceUIStore = create<WorkspaceUIState>((set) => ({
  workspaces: [],
  activeWorkspaceId: null,
  isLoading: false,
  error: null,

  setWorkspaces: (workspaces) =>
    set((state) => ({
      workspaces,
      activeWorkspaceId:
        state.activeWorkspaceId &&
        workspaces.some(
          (workspace) => workspace.id === state.activeWorkspaceId,
        )
          ? state.activeWorkspaceId
          : (workspaces[0]?.id ?? null),
    })),

  setActiveWorkspace: (activeWorkspaceId) =>
    set({ activeWorkspaceId }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));
