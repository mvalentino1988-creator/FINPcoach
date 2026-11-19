import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      { find: /^\.\.\/data\/records\.json$/, replacement: 'src/data/records.json' },
      { find: /^\.\.\/data\/regolamenti\.json$/, replacement: 'src/data/regolamenti.json' },
      { find: /^\.\.\/data\/calendario\.json$/, replacement: 'src/data/calendario.json' }
    ]
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
    // 4 CPU: file in sequenza per non gonfiare i budget di prestazione
    // (i test di stress misurano performance.now e sono sensibili alla contesa).
    fileParallelism: false,
    testTimeout: 30000,
  }
});
