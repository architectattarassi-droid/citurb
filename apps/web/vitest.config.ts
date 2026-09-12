import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Même résolution qu'au build (cf. vite.config.ts) : les tests exercent
      // les sources du paquet de tarification, pas un dist compilé.
      '@citurbarea/pricing-cnoa': fileURLToPath(new URL('../../packages/pricing-cnoa/src/index.ts', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.test.tsx',
      ],
    },
  },
});
