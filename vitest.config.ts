import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const json = (name: string) => fileURLToPath(new URL(`./src/data/${name}`, import.meta.url));
const publicJson = (name: string) => fileURLToPath(new URL(`./public/data/${name}`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^\.\.\/data\/records\.json$/, replacement: publicJson('records.json') },
      { find: /^\.\.\/data\/regolamenti\.json$/, replacement: publicJson('regolamenti.json') },
      { find: /^\.\.\/data\/calendario\.json$/, replacement: json('calendario.json') }
    ]
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
    // 4 CPU: file in sequenza per non gonfiare i budget di prestazione
    // (i test di stress misurano performance.now e sono sensibili alla contesa).
    fileParallelism: false,
    // globals: attiva afterEach globale -> auto-cleanup di @testing-library/react.
    globals: true,
    testTimeout: 30000,
  }
});
