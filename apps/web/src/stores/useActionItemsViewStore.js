'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * @typedef {'kanban'|'list'} ActionItemsView
 *
 * @typedef {object} ActionItemsViewState
 * @property {ActionItemsView} view
 * @property {(v: ActionItemsView) => void} setView
 */

export const useActionItemsViewStore = create(
  persist(
    (set) => ({
      view: /** @type {ActionItemsView} */ ('kanban'),
      setView: (v) => set({ view: v }),
    }),
    { name: 'team-hub-action-items-view' },
  ),
);
