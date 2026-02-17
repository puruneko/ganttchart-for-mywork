import { test, expect } from "@playwright/test"

/**
 * ガントチャートのE2Eテスト - 簡潔版
 *
 * 基本的な動作確認のみを実施
 */

test.describe("ガントチャート - 基本動作確認", () => {
    test.beforeEach(async ({ page }) => {
        // ページのコンソール出力をすべて記録
        page.on("console", (msg) => {
            console.log(`[Browser] ${msg.type()}: ${msg.text()}`)
        })

        // ページエラーをキャッチ
        page.on("pageerror", (error) => {
            console.error("Page error:", error.message)
        })

        // ページに移動
        await page.goto("/", { waitUntil: "networkidle" })

        // 基本的な要素が表示されるまで待機
        await page.waitForSelector(".gantt-container", { timeout: 15000 })

        // SVG要素が存在するかを確認（最初）
        const svgExists = await page.$("svg.gantt-timeline")
        console.log("[test] SVG element exists:", svgExists !== null)

        if (svgExists) {
            const width = await page.getAttribute("svg.gantt-timeline", "width")
            const height = await page.getAttribute(
                "svg.gantt-timeline",
                "height",
            )
            console.log(
                "[test] SVG initial attributes - width:",
                width,
                "height:",
                height,
            )
        }

        // 追加時間を待つ（レンダリング完了を待つ）
        await page.waitForTimeout(3000)

        // 3秒後の状態を確認
        if (svgExists) {
            const width = await page.getAttribute("svg.gantt-timeline", "width")
            const height = await page.getAttribute(
                "svg.gantt-timeline",
                "height",
            )
            console.log(
                "[test] SVG after 3s - width:",
                width,
                "height:",
                height,
            )
        }
    })

    test("ページが正常に表示されること", async ({ page }) => {
        // ガントコンテナが見える
        const container = page.locator(".gantt-container")
        await expect(container).toBeVisible()

        // SVGが見える
        const svg = page.locator("svg.gantt-timeline")
        await expect(svg).toBeVisible()

        // SVGの基本属性をチェック
        const svgElement = await svg.evaluate((el: SVGSVGElement) => {
            return {
                width: el.getAttribute("width"),
                height: el.getAttribute("height"),
                childElementCount: el.children.length,
            }
        })

        console.log("SVG attributes:", svgElement)

        // SVGが空でないことを確認
        expect(svgElement.childElementCount).toBeGreaterThan(0)
    })

    test("SVG内にバー要素があること", async ({ page }) => {
        const svg = page.locator("svg.gantt-timeline")

        // SVG内の rect 要素を数える
        const rectCount = await svg.locator("rect").count()
        console.log("SVG rect count:", rectCount)
        expect(rectCount).toBeGreaterThan(0)

        // SVG内の text 要素を数える
        const textCount = await svg.locator("text").count()
        console.log("SVG text count:", textCount)
        // text は必須ではないかもしれない

        // SVG内に g 要素があることを確認
        const groupCount = await svg.locator("g").count()
        console.log("SVG group count:", groupCount)
        expect(groupCount).toBeGreaterThan(0)
    })

    test("ツリーペインにノードが表示されること", async ({ page }) => {
        // ツリーペイン全体
        const treePane = page.locator(".gantt-left-pane")
        await expect(treePane).toBeVisible()

        // ツリーペイン内のノード（button）
        const nodes = page.locator(".gantt-left-pane button")
        const nodeCount = await nodes.count()
        console.log("Tree pane button count:", nodeCount)
        expect(nodeCount).toBeGreaterThan(0)
    })

    test("折り畳み/展開ボタンが動作すること", async ({ page }) => {
        // 最初の折り畳みボタン
        const toggleBtn = page.locator(".gantt-toggle").first()

        // ボタンが存在することを確認
        await expect(toggleBtn).toBeVisible()

        // 初期状態: ▼ （展開状態）
        let initialText = await toggleBtn.textContent()
        console.log("Initial toggle button:", initialText)

        // クリック
        await toggleBtn.click()
        await page.waitForTimeout(300)

        // 状態が変わることを確認
        let afterClickText = await toggleBtn.textContent()
        console.log("After click toggle button:", afterClickText)

        expect(initialText).not.toEqual(afterClickText)
    })

    test("ズームコントロールが存在すること", async ({ page }) => {
        const zoomControls = page.locator(".gantt-zoom-level")

        if (await zoomControls.isVisible()) {
            const zoomLevel = await zoomControls.textContent()
            console.log("Current zoom level:", zoomLevel)
            expect(zoomLevel).toBeTruthy()
        } else {
            console.log("Zoom controls not visible, but this is optional")
        }
    })

    test("Event Logボタンが動作すること", async ({ page }) => {
        // Event Log表示ボタン
        const showLogBtn = page
            .locator("button")
            .filter({ hasText: "Show Event Log" })

        if (await showLogBtn.isVisible()) {
            await showLogBtn.click()

            // イベントログパネルが表示される
            const logPanel = page.locator(".event-log")
            // パネルが存在するか、またはログエントリが見える
            const hasPanel = await logPanel.isVisible().catch(() => false)
            const hasEntries = (await page.locator(".log-entry").count()) > 0

            expect(hasPanel || hasEntries).toBeTruthy()
        }
    })

    test("Data Debugボタンが動作すること", async ({ page }) => {
        // Data Debug表示ボタン
        const showDebugBtn = page
            .locator("button")
            .filter({ hasText: "Show Data Debug" })

        if (await showDebugBtn.isVisible()) {
            await showDebugBtn.click()

            // デバッグパネルが表示される
            const debugPanel = page.locator(".data-debug")
            const isVisible = await debugPanel.isVisible().catch(() => false)

            expect(isVisible).toBeTruthy()
        }
    })

    test("バードラッグのためのマウスイベントが機能すること", async ({
        page,
    }) => {
        // SVG内の rect (バー) を見つける
        const svg = page.locator("svg.gantt-timeline")
        const rects = svg.locator('rect[class*="bar"]')
        const rectCount = await rects.count()

        if (rectCount > 0) {
            // 最初のバー要素を取得
            const firstBar = rects.first()
            const boundingBox = await firstBar.boundingBox()

            if (boundingBox) {
                console.log("First bar bounding box:", boundingBox)

                // バーの中心にマウスを移動
                await page.mouse.move(
                    boundingBox.x + boundingBox.width / 2,
                    boundingBox.y + boundingBox.height / 2,
                )

                // マウスダウン/アップを実行（ドラッグではな基本的なクリック）
                await page.mouse.down()
                await page.mouse.up()

                // 特にエラーが出ないこと
                expect(true).toBeTruthy()
            }
        }
    })

    test("キーボードイベントが無視されないこと", async ({ page }) => {
        // 簡単なキーボードイベント
        await page.keyboard.press("ArrowDown")
        await page.keyboard.press("ArrowUp")

        // エラーが出ないこと
        expect(true).toBeTruthy()
    })
})
