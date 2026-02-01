import { beforeEach, vi } from 'vitest';

// Vitest setup for backend tests
// Reset environment between tests
beforeEach(() => {
  // Clear module-level singleton state
  vi.resetModules();
});
