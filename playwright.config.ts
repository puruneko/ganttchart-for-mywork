// playwright.config.ts
import { defineConfig } from "@playwright/test"

export default defineConfig({
    testDir: "./tests/e2e",
    use: {
        baseURL: "http://localhost:5177",
        headless: true,
    },
    timeout: 15 * 1000, //60000,
    expect: {
        timeout: 10000,
    },
})
