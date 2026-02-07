import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    // Svelte 5-ready settings
    // Using conservative settings that work in both Svelte 4 and 5
  }
};
