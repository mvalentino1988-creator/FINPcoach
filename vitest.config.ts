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
    include: ['src/**/*.test.ts'],
    environment: 'node'
  }
});
