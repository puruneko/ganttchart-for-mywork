// playwright.config.ts
import { defineConfig } from "@playwright/test"

const testPort = 5176
const timeoutSecond = 60

export default defineConfig({
    workers: 1,
    testDir: "./tests/e2e",
    webServer: {
        command: "npm run test:e2e:preview",
        port: testPort,
        timeout: timeoutSecond * 1000,
        reuseExistingServer: !process.env.CI,
    },
    use: {
        baseURL: `http://localhost:${testPort}`,
        headless: true,
    },
    timeout: timeoutSecond * 1000,
    expect: {
        timeout: 10 * 1000,
    },
})
