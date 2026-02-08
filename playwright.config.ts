// playwright.config.ts
import { defineConfig } from "@playwright/test"

export default defineConfig({
    testDir: "./tests/e2e",
    use: {
        baseURL: "http://localhost:5177",
        headless: true,
    },
    timeout: 60 * 1000,
    expect: {
        timeout: 10000,
    },
    webServer: {
        command: 'npm run dev',
        port: 5177,
        timeout: 120 * 1000,
        reuseExistingServer: !process.env.CI,
    },
})
