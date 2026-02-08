import { test, expect } from '@playwright/test';

/**
 * スクロール・ズーム・同期の網羅的なE2Eテスト
 * 
 * テスト対象:
 * - 横スクロール時の日付ヘッダー同期
 * - 縦スクロール時のツリーとタイムラインの同期
 * - 右クリックドラッグスクロール
 * - マウスホイールスクロール
 * - ズーム操作とヘッダーの同期
 * - バーに日付が表示されていること
 */

test.describe('スクロール・ズーム・同期機能', () => {
  test.beforeEach(async ({ page }) => {
    // デモページに移動
    await page.goto('http://localhost:5177/', { waitUntil: 'networkidle' });
    
    // ガントチャートが読み込まれるまで待機
    await page.waitForSelector('.gantt-container', { timeout: 5000 });
    await page.waitForSelector('.gantt-timeline', { timeout: 5000 });
    
    // 少し待機してレンダリング完了を待つ
    await page.waitForTimeout(500);
  });

  test('ガントチャートのバーに日付が表示されていること', async ({ page }) => {
    // タスクの日付ラベルが表示されていることを確認
    const taskDateLabels = page.locator('.gantt-task-date-label');
    await expect(taskDateLabels.first()).toBeVisible();
    
    // 日付フォーマット（yyyy/MM/dd）が含まれていることを確認
    const dateText = await taskDateLabels.first().textContent();
    expect(dateText).toMatch(/\d{4}\/\d{2}\/\d{2}/);
    
    // セクションの日付ラベルも確認
    const sectionDateLabels = page.locator('.gantt-section-date-label');
    if (await sectionDateLabels.count() > 0) {
      await expect(sectionDateLabels.first()).toBeVisible();
      const sectionDateText = await sectionDateLabels.first().textContent();
      expect(sectionDateText).toMatch(/\d{4}\/\d{2}\/\d{2}/);
    }
  });

  test('横スクロール時に日付ヘッダーが同期すること', async ({ page }) => {
    const timelineWrapper = page.locator('.gantt-timeline-wrapper');
    const headerWrapper = page.locator('.gantt-timeline-header-wrapper');
    
    // 初期スクロール位置を取得
    const initialTimelineScroll = await timelineWrapper.evaluate(el => el.scrollLeft);
    const initialHeaderScroll = await headerWrapper.evaluate(el => el.scrollLeft);
    
    expect(initialTimelineScroll).toBe(initialHeaderScroll);
    
    // タイムラインを横スクロール
    await timelineWrapper.evaluate(el => {
      el.scrollLeft = 200;
    });
    
    // 少し待機してスクロール同期を確認
    await page.waitForTimeout(100);
    
    // ヘッダーのスクロール位置が同期していることを確認
    const newTimelineScroll = await timelineWrapper.evaluate(el => el.scrollLeft);
    const newHeaderScroll = await headerWrapper.evaluate(el => el.scrollLeft);
    
    expect(newTimelineScroll).toBe(200);
    expect(newHeaderScroll).toBe(200);
    expect(newTimelineScroll).toBe(newHeaderScroll);
  });

  test('ヘッダーをスクロールするとタイムラインも同期すること', async ({ page }) => {
    const timelineWrapper = page.locator('.gantt-timeline-wrapper');
    const headerWrapper = page.locator('.gantt-timeline-header-wrapper');
    
    // ヘッダーを横スクロール
    await headerWrapper.evaluate(el => {
      el.scrollLeft = 150;
    });
    
    await page.waitForTimeout(100);
    
    // タイムラインのスクロール位置が同期していることを確認
    const timelineScroll = await timelineWrapper.evaluate(el => el.scrollLeft);
    const headerScroll = await headerWrapper.evaluate(el => el.scrollLeft);
    
    expect(timelineScroll).toBe(150);
    expect(headerScroll).toBe(150);
  });

  test('縦スクロール時にツリーとタイムラインが同期すること', async ({ page }) => {
    const timelineWrapper = page.locator('.gantt-timeline-wrapper');
    const treeWrapper = page.locator('.gantt-tree-wrapper');
    
    // タイムラインを縦スクロール
    await timelineWrapper.evaluate(el => {
      el.scrollTop = 100;
    });
    
    await page.waitForTimeout(100);
    
    // ツリーのスクロール位置が同期していることを確認
    const timelineScroll = await timelineWrapper.evaluate(el => el.scrollTop);
    const treeScroll = await treeWrapper.evaluate(el => el.scrollTop);
    
    expect(timelineScroll).toBe(100);
    expect(treeScroll).toBe(100);
  });

  test('ツリーをスクロールするとタイムラインも同期すること', async ({ page }) => {
    const timelineWrapper = page.locator('.gantt-timeline-wrapper');
    const treeWrapper = page.locator('.gantt-tree-wrapper');
    
    // ツリーを縦スクロール
    await treeWrapper.evaluate(el => {
      el.scrollTop = 80;
    });
    
    await page.waitForTimeout(100);
    
    // タイムラインのスクロール位置が同期していることを確認
    const timelineScroll = await timelineWrapper.evaluate(el => el.scrollTop);
    const treeScroll = await treeWrapper.evaluate(el => el.scrollTop);
    
    expect(timelineScroll).toBe(80);
    expect(treeScroll).toBe(80);
  });

  test('右クリックドラッグでスクロールできること', async ({ page }) => {
    const timelineWrapper = page.locator('.gantt-timeline-wrapper');
    
    // タイムラインの中心位置を取得
    const box = await timelineWrapper.boundingBox();
    if (!box) throw new Error('Timeline wrapper not found');
    
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    
    // 初期スクロール位置を取得
    const initialScrollLeft = await timelineWrapper.evaluate(el => el.scrollLeft);
    const initialScrollTop = await timelineWrapper.evaluate(el => el.scrollTop);
    
    // 右クリックドラッグ（右クリック = button: 'right'）
    await page.mouse.move(startX, startY);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(startX - 100, startY - 50, { steps: 10 });
    await page.mouse.up({ button: 'right' });
    
    await page.waitForTimeout(100);
    
    // スクロール位置が変化していることを確認
    const newScrollLeft = await timelineWrapper.evaluate(el => el.scrollLeft);
    const newScrollTop = await timelineWrapper.evaluate(el => el.scrollTop);
    
    // 右にドラッグしたので、scrollLeftは増加する
    expect(newScrollLeft).toBeGreaterThan(initialScrollLeft);
    // 下にドラッグしたので、scrollTopは増加する
    expect(newScrollTop).toBeGreaterThan(initialScrollTop);
  });

  test('通常のマウスホイールスクロールが動作すること', async ({ page }) => {
    const timelineWrapper = page.locator('.gantt-timeline-wrapper');
    
    // 初期スクロール位置を取得
    const initialScrollTop = await timelineWrapper.evaluate(el => el.scrollTop);
    
    // タイムラインの上でホイールスクロール
    const box = await timelineWrapper.boundingBox();
    if (!box) throw new Error('Timeline wrapper not found');
    
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 100);
    
    await page.waitForTimeout(100);
    
    // 縦スクロール位置が変化していることを確認
    const newScrollTop = await timelineWrapper.evaluate(el => el.scrollTop);
    expect(newScrollTop).toBeGreaterThan(initialScrollTop);
  });

  test('ズームイン操作が動作すること', async ({ page }) => {
    const zoomInBtn = page.locator('.gantt-zoom-btn').nth(1); // 2番目のボタン（+）
    const zoomLevel = page.locator('.gantt-zoom-level');
    
    // 初期ズームレベルを取得
    const initialLevel = await zoomLevel.textContent();
    
    // ズームインボタンをクリック
    await zoomInBtn.click();
    await page.waitForTimeout(200);
    
    // ズームレベルが増加していることを確認
    const newLevel = await zoomLevel.textContent();
    expect(parseInt(newLevel || '0')).toBeGreaterThan(parseInt(initialLevel || '0'));
    
    // ヘッダーが表示されていることを確認
    const headerMajor = page.locator('.gantt-header-major');
    await expect(headerMajor).toBeVisible();
  });

  test('ズームアウト操作が動作すること', async ({ page }) => {
    // まずズームイン
    const zoomInBtn = page.locator('.gantt-zoom-btn').nth(1);
    await zoomInBtn.click();
    await page.waitForTimeout(200);
    
    const zoomOutBtn = page.locator('.gantt-zoom-btn').nth(0); // 1番目のボタン（-）
    const zoomLevel = page.locator('.gantt-zoom-level');
    
    const initialLevel = await zoomLevel.textContent();
    
    // ズームアウトボタンをクリック
    await zoomOutBtn.click();
    await page.waitForTimeout(200);
    
    // ズームレベルが減少していることを確認
    const newLevel = await zoomLevel.textContent();
    expect(parseInt(newLevel || '0')).toBeLessThan(parseInt(initialLevel || '0'));
  });

  test('Ctrl+ホイールでズームできること', async ({ page }) => {
    const timelineWrapper = page.locator('.gantt-timeline-wrapper');
    const zoomLevel = page.locator('.gantt-zoom-level');
    
    const initialLevel = await zoomLevel.textContent();
    
    // タイムラインの上でCtrl+ホイール
    const box = await timelineWrapper.boundingBox();
    if (!box) throw new Error('Timeline wrapper not found');
    
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    
    // Ctrl+ホイール下（ズームアウト）
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, 100);
    await page.keyboard.up('Control');
    
    await page.waitForTimeout(200);
    
    // ズームレベルが変化していることを確認
    const newLevel = await zoomLevel.textContent();
    expect(newLevel).not.toBe(initialLevel);
  });

  test('ズーム後もヘッダーとタイムラインが同期していること', async ({ page }) => {
    const timelineWrapper = page.locator('.gantt-timeline-wrapper');
    const headerWrapper = page.locator('.gantt-timeline-header-wrapper');
    const zoomInBtn = page.locator('.gantt-zoom-btn').nth(1);
    
    // ズームイン
    await zoomInBtn.click();
    await page.waitForTimeout(200);
    
    // タイムラインをスクロール
    await timelineWrapper.evaluate(el => {
      el.scrollLeft = 300;
    });
    
    await page.waitForTimeout(100);
    
    // ヘッダーが同期していることを確認
    const timelineScroll = await timelineWrapper.evaluate(el => el.scrollLeft);
    const headerScroll = await headerWrapper.evaluate(el => el.scrollLeft);
    
    expect(timelineScroll).toBe(300);
    expect(headerScroll).toBe(300);
  });

  test('日付ヘッダーのセルがタイムラインのグリッドと位置が一致すること', async ({ page }) => {
    // 最初のminorセルとグリッドラインの位置を比較
    const firstMinorCell = page.locator('.gantt-header-minor-cell').first();
    const firstGridLine = page.locator('.gantt-grid-line').first();
    
    await expect(firstMinorCell).toBeVisible();
    await expect(firstGridLine).toBeVisible();
    
    const cellBox = await firstMinorCell.boundingBox();
    const gridBox = await firstGridLine.boundingBox();
    
    if (!cellBox || !gridBox) throw new Error('Elements not found');
    
    // x座標が近い位置にあることを確認（±5px以内）
    expect(Math.abs(cellBox.x - gridBox.x)).toBeLessThan(5);
  });
});
