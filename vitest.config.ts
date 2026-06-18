import { defineConfig, mergeConfig } from 'vitest/config';
import base from '@vpnsin-labs/devkit/vitest';

// Extend the shared devkit Vitest preset; component tests need a DOM, so swap the
// default `node` environment for jsdom and register the jest-dom matchers.
export default mergeConfig(
  base,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./test/setup.ts'],
    },
  })
);
