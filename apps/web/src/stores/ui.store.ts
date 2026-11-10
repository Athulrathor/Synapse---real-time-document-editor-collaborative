
import { create } from "zustand";

interface UIState {
  activeWorkspaceId: string | null;

  setActiveWorkspace: (workspaceId: string | null) => void;

  isCreateWorkspaceOpen: boolean;
  openCreateWorkspace: () => void;
  closeCreateWorkspace: () => void;
}

export const useUIStore = create<UIState>((set) => ({

  activeWorkspaceId: null,

  isCreateWorkspaceOpen: false,

  setActiveWorkspace: (workspaceId) =>
    set({
      activeWorkspaceId: workspaceId,
    }),

      openCreateWorkspace: () => set({ isCreateWorkspaceOpen: true }),

  closeCreateWorkspace: () => set({ isCreateWorkspaceOpen: false }),

}));
