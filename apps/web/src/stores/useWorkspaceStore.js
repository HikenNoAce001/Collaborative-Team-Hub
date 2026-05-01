'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * @typedef {object} WorkspaceState
 * @property {string|null} currentWorkspaceId
 * @property {(id: string) => void} setCurrentWorkspace
 * @property {() => void} clearWorkspace
 */

export const useWorkspaceStore = create(
  persist(
    (set) => ({
      currentWorkspaceId: /** @type {string|null} */ (null),
      setCurrentWorkspace: (/** @type {string} */ id) =>
        set({ currentWorkspaceId: id }),
      clearWorkspace: () => set({ currentWorkspaceId: null }),
    }),
    {
      name: 'team-hub-workspace',
    },
  ),
);
