// ─────────────────────────────────────────────────────────────────────────────
// Workspace Store (Zustand)
// Ported from doc_maanagement/src/store/workspace-store.ts
// Adds: workspace bootstrap gate (auto-create if none), AsyncStorage persistence
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workspace } from '../types';
import { fetchWorkspaces, createWorkspace, deleteWorkspace as apiDeleteWorkspace } from '../api/workspaces';

const ACTIVE_WS_KEY = 'intellidoc_active_workspace';

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  isLoading: boolean;
  isBootstrapping: boolean;
  error: string | null;

  loadWorkspaces: () => Promise<void>;
  setActiveWorkspace: (id: string) => void;
  createAndSetWorkspace: (name: string) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
  bootstrapWorkspace: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  isLoading: false,
  isBootstrapping: false,
  error: null,

  loadWorkspaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const workspaces = await fetchWorkspaces();
      set({ workspaces });

      // Restore previously selected workspace from AsyncStorage
      const stored = await AsyncStorage.getItem(ACTIVE_WS_KEY);
      const { activeWorkspaceId } = get();

      if (!activeWorkspaceId) {
        if (stored && workspaces.some((w) => w.id === stored)) {
          set({ activeWorkspaceId: stored });
        } else if (workspaces.length > 0) {
          set({ activeWorkspaceId: workspaces[0].id });
          await AsyncStorage.setItem(ACTIVE_WS_KEY, workspaces[0].id);
        }
      }
    } catch (e: any) {
      set({ error: e?.message ?? 'Failed to load workspaces' });
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveWorkspace: async (id) => {
    set({ activeWorkspaceId: id });
    await AsyncStorage.setItem(ACTIVE_WS_KEY, id);
  },

  createAndSetWorkspace: async (name) => {
    const ws = await createWorkspace(name);
    set((s) => ({
      workspaces: [ws, ...s.workspaces],
      activeWorkspaceId: ws.id,
    }));
    await AsyncStorage.setItem(ACTIVE_WS_KEY, ws.id);
    return ws;
  },

  deleteWorkspace: async (id) => {
    await apiDeleteWorkspace(id);
    const { workspaces, activeWorkspaceId } = get();
    const newWorkspaces = workspaces.filter(w => w.id !== id);
    set({ workspaces: newWorkspaces });
    
    if (activeWorkspaceId === id) {
      if (newWorkspaces.length > 0) {
        set({ activeWorkspaceId: newWorkspaces[0].id });
        await AsyncStorage.setItem(ACTIVE_WS_KEY, newWorkspaces[0].id);
      } else {
        set({ activeWorkspaceId: null });
        await AsyncStorage.removeItem(ACTIVE_WS_KEY);
      }
    }
  },

  /**
   * Workspace bootstrap gate (P4 from the implementation plan):
   * - Load workspaces
   * - If none → auto-create "My Workspace" silently
   * Called after login, before rendering the main app tabs.
   */
  bootstrapWorkspace: async () => {
    if (get().isBootstrapping) return;
    set({ isBootstrapping: true });
    try {
      const { loadWorkspaces, createAndSetWorkspace } = get();
      await loadWorkspaces();
      const { workspaces } = get();
      if (workspaces.length === 0) {
        await createAndSetWorkspace('My Workspace');
      }
    } finally {
      set({ isBootstrapping: false });
    }
  },
}));
