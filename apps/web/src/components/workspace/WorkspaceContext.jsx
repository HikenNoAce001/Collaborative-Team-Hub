'use client';

import { createContext, useContext } from 'react';

/**
 * @typedef {Object} WorkspaceContextValue
 * @property {{ id: string, name: string, accentColor: string, myRole: 'ADMIN'|'MEMBER', description?: string|null }} workspace
 * @property {Set<string>} online
 * @property {boolean} isAdmin
 */

/** @type {import('react').Context<WorkspaceContextValue|null>} */
const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ value, children }) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

/** @returns {WorkspaceContextValue} */
export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return ctx;
}
