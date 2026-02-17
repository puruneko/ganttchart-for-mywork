import { defineConfig, devices } from "@playwright/test"

const port = 5176

export default defineConfig({
    workers: 1,
    testDir: "./tests/e2e",

    webServer: {
        command: "npm run dev -- --port 5176 --force",
        port: port,
        timeout: 120 * 1000,
        reuseExistingServer: !process.env.CI,
    },

    use: {
        baseURL: `http://localhost:${port}`,
        headless: true,
    },

    timeout: 120 * 1000,

    expect: {
        timeout: 60 * 1000,
    },

    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
})
