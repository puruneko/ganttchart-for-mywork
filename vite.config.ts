import { defineConfig } from "vite"
import { svelte } from "@sveltejs/vite-plugin-svelte"

const basePort = 5177
const testPort = 5177

export default defineConfig({
    plugins: [svelte()],
    server: {
        port: basePort,
        strictPort: true,
    },
    preview: {
        port: testPort,
        strictPort: true,
    },
    test: {
        globals: true,
        environment: "jsdom",
        exclude: ["**/node_modules/**", "**/dist/**", "**/test/e2e/**"],
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
