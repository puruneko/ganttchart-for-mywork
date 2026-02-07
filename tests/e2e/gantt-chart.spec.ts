import { test, expect } from '@playwright/test';

/**
 * ガントチャートのE2Eテスト
 * 
 * テスト対象:
 * - ガントチャートが表示されること
 * - タスクバーが表示されること
 * - セクショングループが表示されること
 * - ドラッグ&ドロップ操作が動作すること
 * - ツリーペインの表示/非表示が切り替わること
 */

test.describe('ガントチャート', () => {
  test.beforeEach(async ({ page }) => {
    // デモページに移動
    await page.goto('http://localhost:5177/', { waitUntil: 'networkidle' });
    
    // ガントチャートが読み込まれるまで待機
    await page.waitForSelector('.gantt-container', { timeout: 30000 });
  });

  test('ガントチャートが表示されること', async ({ page }) => {
    // ガントチャートコンテナが存在することを確認
    const ganttContainer = page.locator('.gantt-container');
    await expect(ganttContainer).toBeVisible();
    
    // タイムラインSVGが存在することを確認
    const timeline = page.locator('.gantt-timeline');
    await expect(timeline).toBeVisible();
    
    // ツリーペインが存在することを確認
    const treePane = page.locator('.gantt-left-pane');
    await expect(treePane).toBeVisible();
  });

  test('タスクバーが表示されること', async ({ page }) => {
    // タスクバーが存在することを確認
    const taskBars = page.locator('.gantt-bar--task');
    const count = await taskBars.count();
    expect(count).toBeGreaterThan(0);
    
    // タスク名ラベルが表示されることを確認
    const taskLabels = page.locator('.gantt-task-label');
    await expect(taskLabels.first()).toBeVisible();
  });

  test('セクショングループが表示されること', async ({ page }) => {
    // セクションバーが存在することを確認
    const sectionBars = page.locator('.gantt-section-bar--section');
    const count = await sectionBars.count();
    expect(count).toBeGreaterThan(0);
    
    // グループ背景が存在することを確認
    const groupBg = page.locator('.gantt-group-bg');
    await expect(groupBg.first()).toBeVisible();
  });

  test('日時未設定タスクが表示されること', async ({ page }) => {
    // 日時未設定タスク（破線バー）が存在することを確認
    const unsetTasks = page.locator('.gantt-bar--unset');
    const count = await unsetTasks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('ツリーノードをクリックして折り畳み/展開できること', async ({ page }) => {
    // 折り畳みアイコンをクリック
    const collapseIcon = page.locator('.gantt-tree-node-icon').first();
    await collapseIcon.click();
    
    // イベントログが更新されることを確認
    const eventLog = page.locator('.log-entry');
    await expect(eventLog.first()).toBeVisible();
    
    // もう一度クリックして展開
    await collapseIcon.click();
    
    // イベントログが更新されることを確認
    const logCount = await eventLog.count();
    expect(logCount).toBeGreaterThan(1);
  });

  test('タスクバーをドラッグして移動できること', async ({ page }) => {
    // タスクバーを取得
    const taskBar = page.locator('.gantt-bar--task').first();
    const boundingBox = await taskBar.boundingBox();
    
    if (boundingBox) {
      // タスクバーの中央をドラッグ
      await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
      await page.mouse.down();
      
      // 右に100pxドラッグ
      await page.mouse.move(boundingBox.x + boundingBox.width / 2 + 100, boundingBox.y + boundingBox.height / 2);
      await page.mouse.up();
      
      // イベントログにドラッグイベントが記録されることを確認
      const dragEvent = page.locator('.log-entry').filter({ hasText: 'Dragged' });
      await expect(dragEvent.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('タスクバーの右端をドラッグして終了日をリサイズできること', async ({ page }) => {
    // タスクバーを取得
    const taskBar = page.locator('.gantt-bar--task').first();
    const boundingBox = await taskBar.boundingBox();
    
    if (boundingBox) {
      // タスクバーの右端をドラッグ（リサイズハンドル）
      await page.mouse.move(boundingBox.x + boundingBox.width - 4, boundingBox.y + boundingBox.height / 2);
      await page.mouse.down();
      
      // 右に50pxドラッグ
      await page.mouse.move(boundingBox.x + boundingBox.width + 50, boundingBox.y + boundingBox.height / 2);
      await page.mouse.up();
      
      // イベントログにドラッグイベントが記録されることを確認
      await page.waitForTimeout(500);
      const dragEvent = page.locator('.log-entry').filter({ hasText: 'Dragged' });
      await expect(dragEvent.first()).toBeVisible();
    }
  });

  test('セクショングループをドラッグして全体移動できること', async ({ page }) => {
    // グループ背景を取得
    const groupBg = page.locator('.gantt-group-bg').first();
    const boundingBox = await groupBg.boundingBox();
    
    if (boundingBox) {
      // グループ背景の中央をドラッグ
      await page.mouse.move(boundingBox.x + 50, boundingBox.y + 50);
      await page.mouse.down();
      
      // 右に100pxドラッグ
      await page.mouse.move(boundingBox.x + 150, boundingBox.y + 50);
      await page.mouse.up();
      
      // イベントログにグループドラッグイベントが記録されることを確認
      await page.waitForTimeout(500);
      const groupDragEvent = page.locator('.log-entry').filter({ hasText: 'Group dragged' });
      await expect(groupDragEvent.first()).toBeVisible();
    }
  });

  test('デバッグパネルが表示されること', async ({ page }) => {
    // デバッグパネルが存在することを確認
    const debugPanel = page.locator('.gantt-debug-panel');
    await expect(debugPanel).toBeVisible();
    
    // デバッグパネルにノード数が表示されることを確認
    const debugHeader = page.locator('.gantt-debug-header');
    await expect(debugHeader).toContainText('nodes');
  });
});
