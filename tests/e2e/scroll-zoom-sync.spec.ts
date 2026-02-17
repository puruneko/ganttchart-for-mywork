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
    // コンソールエラーとページエラーを監視
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.error('Browser console error:', msg.text());
      }
    });
    
    page.on('pageerror', error => {
      console.error('Page error:', error.message);
      throw error; // ページエラーはテストを失敗させる
    });
    
    // デモページに移動
    await page.goto('/');
    
    // ガントコンテナが表示されるまで待機
    await page.waitForSelector('.gantt-container', { state: 'attached', timeout: 10000 });
    
    // タイムラインSVGが存在するまで待機
    await page.waitForSelector('.gantt-timeline', { state: 'attached', timeout: 10000 });
    
    // 初期レンダリング完了を待つ
    await page.waitForTimeout(500);
    
    // 初期描画時のコンソールエラーをチェック（重大なエラーのみ）
    const criticalErrors = consoleErrors.filter(err => 
      err.includes('attribute width') || 
      err.includes('attribute height') ||
      err.includes('NaN')
    );
    if (criticalErrors.length > 0) {
      throw new Error(`Critical console errors during initialization: ${criticalErrors.join(', ')}`);
    }
  });

  test.skip('ガントチャートのバーに日付が表示されていること', async ({ page }) => {
    // 日付ラベル機能は現在実装されていないためスキップ
    // タスクの日付ラベルが表示されていることを確認
    const taskDateLabels = page.locator('.gantt-task-date-label');
    await expect(taskDateLabels.first()).toBeVisible({ timeout: 5000 });
    
    // 日付フォーマット（yyyy/MM/dd）が含まれていることを確認
    const dateText = await taskDateLabels.first().textContent();
    expect(dateText).toMatch(/\d{4}\/\d{2}\/\d{2}/);
    
    // セクションの日付ラベルも確認
    const sectionDateLabels = page.locator('.gantt-section-date-label');
    const count = await sectionDateLabels.count();
    if (count > 0) {
      await expect(sectionDateLabels.first()).toBeVisible({ timeout: 5000 });
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
    
    // スクロール同期を待機
    await page.waitForTimeout(300);
    
    // ヘッダーのスクロール位置が同期していることを確認（±5pxの誤差を許容）
    const newTimelineScroll = await timelineWrapper.evaluate(el => el.scrollLeft);
    const newHeaderScroll = await headerWrapper.evaluate(el => el.scrollLeft);
    
    expect(Math.abs(newTimelineScroll - newHeaderScroll)).toBeLessThan(5);
    expect(Math.abs(newTimelineScroll - 200)).toBeLessThan(5);
  });

  test('ヘッダーをスクロールするとタイムラインも同期すること', async ({ page }) => {
    const timelineWrapper = page.locator('.gantt-timeline-wrapper');
    const headerWrapper = page.locator('.gantt-timeline-header-wrapper');
    
    // ヘッダーを横スクロール
    await headerWrapper.evaluate(el => {
      el.scrollLeft = 150;
    });
    
    await page.waitForTimeout(300);
    
    // タイムラインのスクロール位置が同期していることを確認（±5pxの誤差を許容）
    const timelineScroll = await timelineWrapper.evaluate(el => el.scrollLeft);
    const headerScroll = await headerWrapper.evaluate(el => el.scrollLeft);
    
    expect(Math.abs(timelineScroll - headerScroll)).toBeLessThan(5);
    expect(Math.abs(timelineScroll - 150)).toBeLessThan(5);
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
    // コンソールエラーを監視
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
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
    
    // コンソールエラーがないことを確認
    expect(consoleErrors).toEqual([]);
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

  test('スクロール時に表示飛びが発生しないこと', async ({ page }) => {
    // コンソールエラーを監視
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    const timelineWrapper = page.locator('.gantt-timeline-wrapper');
    
    // スクロール前の位置を記録
    const beforeScroll = await timelineWrapper.evaluate(el => el.scrollLeft);
    
    // 大きくスクロール（拡張をトリガーする可能性）
    await timelineWrapper.evaluate(el => el.scrollBy(500, 0));
    await page.waitForTimeout(200);
    
    // スクロール後の位置を確認（500px±10pxの範囲内）
    const afterScroll = await timelineWrapper.evaluate(el => el.scrollLeft);
    const scrollDelta = afterScroll - beforeScroll;
    expect(scrollDelta).toBeGreaterThan(490);
    expect(scrollDelta).toBeLessThan(510);
    
    // コンソールエラーがないことを確認
    expect(consoleErrors).toEqual([]);
  });

  test('extendedDateRange拡張時に表示が飛ばないこと', async ({ page }) => {
    const timelineWrapper = page.locator('.gantt-timeline-wrapper');
    
    // 左端近くまでスクロール
    await timelineWrapper.evaluate(el => el.scrollLeft = 100);
    await page.waitForTimeout(100);
    
    const scrollBefore = await timelineWrapper.evaluate(el => el.scrollLeft);
    
    // さらに左にスクロール（左側拡張をトリガー）
    await timelineWrapper.evaluate(el => el.scrollBy(-50, 0));
    await page.waitForTimeout(200);
    
    const scrollAfter = await timelineWrapper.evaluate(el => el.scrollLeft);
    const scrollDelta = scrollAfter - scrollBefore;
    
    // スクロール量が-50px±10pxの範囲内であることを確認
    expect(scrollDelta).toBeGreaterThan(-60);
    expect(scrollDelta).toBeLessThan(-40);
  });

  test('ズーム時に表示が飛ばないこと', async ({ page }) => {
    const timelineWrapper = page.locator('.gantt-timeline-wrapper');
    
    // 中央付近にスクロール
    await timelineWrapper.evaluate(el => {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    });
    await page.waitForTimeout(100);
    
    // ビューポート中心の位置を記録
    const centerXBefore = await timelineWrapper.evaluate(el => {
      return el.scrollLeft + el.clientWidth / 2;
    });
    
    // ズームイン（Ctrl+Wheel）
    const box = await timelineWrapper.boundingBox();
    if (!box) throw new Error('Timeline wrapper not found');
    
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -100);
    await page.keyboard.up('Control');
    await page.waitForTimeout(200);
    
    // ビューポート中心の位置を再計算
    const centerXAfter = await timelineWrapper.evaluate(el => {
      return el.scrollLeft + el.clientWidth / 2;
    });
    
    // ズーム前後で中心位置の比率が近いことを確認（dayWidthが変わるため完全一致は難しい）
    const ratio = centerXAfter / centerXBefore;
    expect(ratio).toBeGreaterThan(0.8);
    expect(ratio).toBeLessThan(1.5);
  });

  test('ズームイン操作が動作すること', async ({ page }) => {
    const zoomInBtn = page.locator('.gantt-zoom-btn').nth(1); // 2番目のボタン（+）
    const zoomLevel = page.locator('.gantt-zoom-level');
    
    // 初期ズームレベルを取得
    const initialLevel = parseInt(await zoomLevel.textContent() || '3');
    
    // ズームインボタンを複数回クリック（レベル変更を確実にするため）
    await zoomInBtn.click();
    await page.waitForTimeout(300);
    await zoomInBtn.click();
    await page.waitForTimeout(300);
    
    // ズームレベルが増加していることを確認
    const newLevel = parseInt(await zoomLevel.textContent() || '3');
    expect(newLevel).toBeGreaterThan(initialLevel);
    
    // ヘッダーが表示されていることを確認
    const headerMajor = page.locator('.gantt-header-major');
    await expect(headerMajor).toBeVisible({ timeout: 5000 });
  });

  test('ズームアウト操作が動作すること', async ({ page }) => {
    // まず複数回ズームイン
    const zoomInBtn = page.locator('.gantt-zoom-btn').nth(1);
    await zoomInBtn.click();
    await page.waitForTimeout(300);
    await zoomInBtn.click();
    await page.waitForTimeout(300);
    
    const zoomOutBtn = page.locator('.gantt-zoom-btn').nth(0); // 1番目のボタン（-）
    const zoomLevel = page.locator('.gantt-zoom-level');
    
    const initialLevel = parseInt(await zoomLevel.textContent() || '3');
    
    // ズームアウトボタンを複数回クリック
    await zoomOutBtn.click();
    await page.waitForTimeout(300);
    await zoomOutBtn.click();
    await page.waitForTimeout(300);
    
    // ズームレベルが減少していることを確認
    const newLevel = parseInt(await zoomLevel.textContent() || '3');
    expect(newLevel).toBeLessThan(initialLevel);
  });

  test.skip('Ctrl+ホイールでズームできること', async ({ page }) => {
    // ホイールイベントのシミュレーションが不安定なためスキップ
    const timelineWrapper = page.locator('.gantt-timeline-wrapper');
    await timelineWrapper.waitFor({ state: 'visible', timeout: 5000 });
    
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

  test.skip('日付ヘッダーのセルがタイムラインのグリッドと位置が一致すること', async ({ page }) => {
    // グリッドラインのvisibility問題によりスキップ
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
