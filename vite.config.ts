import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  test: {
    globals: true,
    environment: 'jsdom'
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'SvelteGanttLib',
      fileName: 'index'
    },
    rollupOptions: {
      external: ['svelte', 'luxon'],
      output: {
        globals: {
          svelte: 'Svelte',
          luxon: 'luxon'
        }
      }
    }
  }
});
