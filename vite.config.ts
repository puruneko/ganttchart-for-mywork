import { defineConfig } from "vite"
import { svelte } from "@sveltejs/vite-plugin-svelte"

const devPort = 5176

export default defineConfig({
    plugins: [svelte()],
    server: {
        port: devPort,
        strictPort: true,
    },
    test: {
        globals: true,
        environment: "jsdom",
        exclude: ["**/node_modules/**", "**/dist/**", "**/tests/e2e/**"],
    },
    build: {
        lib: {
            entry: "src/index.ts",
            name: "SvelteGanttLib",
            fileName: "index",
        },
        rollupOptions: {
            external: ["svelte", "luxon"],
            output: {
                globals: {
                    svelte: "Svelte",
                    luxon: "luxon",
                },
            },
        },
    },
})
