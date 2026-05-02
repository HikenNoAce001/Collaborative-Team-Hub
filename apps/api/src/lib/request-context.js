// Per-request context that survives across async boundaries via AsyncLocalStorage.
// Used by the audit log to capture the actor's IP without plumbing `req` through
// every service signature. Anything else request-scoped (trace id, etc.) can ride
// the same store.

import { AsyncLocalStorage } from 'node:async_hooks';

/** @typedef {{ ip?: string|null }} RequestContext */

/** @type {AsyncLocalStorage<RequestContext>} */
const storage = new AsyncLocalStorage();

/** @returns {RequestContext} */
export function getRequestContext() {
  return storage.getStore() ?? {};
}

export function withRequestContext(req, _res, next) {
  storage.run({ ip: req.ip ?? null }, () => next());
}
