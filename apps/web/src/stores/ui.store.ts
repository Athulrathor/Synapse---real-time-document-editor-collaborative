
import { create } from "zustand";

interface UIState {
  mobileSidebarOpen: boolean;
  sidebarCollapsed: boolean;
  activeWorkspaceId: string | null;

  toggleSidebar: () => void;
  setActiveWorkspace: (workspaceId: string | null) => void;
  toggleMobileSidebar: () => void;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;

  isCreateWorkspaceOpen: boolean;
  openCreateWorkspace: () => void;
  closeCreateWorkspace: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  mobileSidebarOpen: false,
  sidebarCollapsed: false,
  activeWorkspaceId: null,

  isCreateWorkspaceOpen: false,

  toggleMobileSidebar: () =>
    set((state) => ({
      mobileSidebarOpen: !state.mobileSidebarOpen,
    })),

  openMobileSidebar: () => set({ mobileSidebarOpen: true }),

  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),

  toggleSidebar: () =>
    set((state) => ({
      sidebarCollapsed: !state.sidebarCollapsed,
    })),

  setActiveWorkspace: (workspaceId) =>
    set({
      activeWorkspaceId: workspaceId,
    }),

      openCreateWorkspace: () => set({ isCreateWorkspaceOpen: true }),

  closeCreateWorkspace: () => set({ isCreateWorkspaceOpen: false }),

}));
