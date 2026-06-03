import { AsyncLocalStorage } from 'async_hooks';

// Stores the current tenant schema for the active request context
// so it can be accessed anywhere in the same async execution flow.
export const tenantStorage = new AsyncLocalStorage<string>();