import { defineConfig, devices } from "@playwright/test"

const port = 5176

export default defineConfig({
    workers: 1,
    testDir: "./tests/e2e",

    webServer: {
        command: "npm run dev",
        port: port,
        timeout: 30 * 1000,
        reuseExistingServer: !process.env.CI,
    },

    use: {
        baseURL: `http://localhost:${port}`,
        headless: true,
    },

    timeout: 30 * 1000,

    expect: {
        timeout: 10 * 1000,
    },

    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
})
