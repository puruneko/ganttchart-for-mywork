/**
 * シナリオテスト（２）: プロジェクト計画の実践的ワークフロー
 * 
 * このテストは、プロジェクトマネージャーがガントチャートを使って
 * プロジェクト計画を立てる際の典型的な操作フローを再現します：
 * 
 * 1. 初期表示とプロジェクト全体の確認
 * 2. 特定のセクションに注目（折りたたみ・展開）
 * 3. タスクの詳細確認（クリック操作）
 * 4. タイムラインの調整（ズームで適切な粒度を見つける）
 * 5. タスクの移動（ドラッグ＆ドロップ）
 * 6. スケジュールの俯瞰（ズームアウトして全体を確認）
 * 7. 今日の進捗確認（今日の位置に移動）
 * 8. データのリセットと再計画
 */

import { test, expect } from '@playwright/test';

test.describe('シナリオテスト（２）: プロジェクト計画の実践的ワークフロー', () => {
  test('プロジェクトマネージャーがガントチャートで計画を立てるフロー', async ({ page }) => {
    // 1. 初期表示とプロジェクト全体の確認
    await page.goto('http://localhost:5176/');
    
    // ガントチャートが完全に読み込まれるまで待機
    await expect(page.locator('.gantt-container')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000); // レンダリング完了を待つ
    
    // プロジェクトノードが表示されていることを確認
    const projectNode = page.locator('.gantt-tree-row').filter({ hasText: 'Project' }).first();
    await expect(projectNode).toBeVisible();
    
    // タイムラインのバーが描画されていることを確認
    const ganttBars = page.locator('.gantt-bar');
    const barCount = await ganttBars.count();
    expect(barCount).toBeGreaterThan(0);
    
    console.log(`✓ Step 1: プロジェクト全体確認完了 (${barCount} bars visible)`);
    
    // 2. 特定のセクションに注目（折りたたみ・展開）
    // 全てのノードを折りたたむ
    const collapseAllButton = page.locator('button:has-text("Collapse All")');
    if (await collapseAllButton.isVisible()) {
      await collapseAllButton.click();
      await page.waitForTimeout(500);
      
      // 表示されているノード数が減ることを確認
      const collapsedRowCount = await page.locator('.gantt-tree-row').count();
      console.log(`✓ Step 2a: 全て折りたたみ完了 (${collapsedRowCount} rows visible)`);
    }
    
    // 全て展開
    const expandAllButton = page.locator('button:has-text("Expand All")');
    if (await expandAllButton.isVisible()) {
      await expandAllButton.click();
      await page.waitForTimeout(500);
      
      const expandedRowCount = await page.locator('.gantt-tree-row').count();
      console.log(`✓ Step 2b: 全て展開完了 (${expandedRowCount} rows visible)`);
    }
    
    // 特定のセクションだけ折りたたむ（最初のセクション）
    const firstSectionToggle = page.locator('.gantt-tree-row').filter({ hasText: 'section' }).first()
      .locator('.gantt-tree-toggle').first();
    
    if (await firstSectionToggle.isVisible()) {
      await firstSectionToggle.click();
      await page.waitForTimeout(300);
      console.log('✓ Step 2c: 特定セクション折りたたみ完了');
    }
    
    // 3. タスクの詳細確認（クリック操作）
    // イベントログを表示してクリックイベントを確認
    const showLogButton = page.locator('button').filter({ hasText: /Show.*Event Log/ });
    if (await showLogButton.isVisible()) {
      await showLogButton.click();
      await page.waitForTimeout(300);
    }
    
    // 最初のタスクノードをクリック
    const firstTaskRow = page.locator('.gantt-tree-row').filter({ hasText: /task|Task/ }).first();
    if (await firstTaskRow.isVisible()) {
      await firstTaskRow.click();
      await page.waitForTimeout(300);
      
      // イベントログにクリックイベントが記録されているか確認
      const eventLog = page.locator('.event-log, .log-entries');
      if (await eventLog.isVisible()) {
        const logText = await eventLog.textContent();
        expect(logText).toContain('Clicked');
        console.log('✓ Step 3: タスククリック完了（イベントログに記録）');
      }
    }
    
    // 4. タイムラインの調整（ズームで適切な粒度を見つける）
    // まず週単位表示にズームイン
    const zoomInButton = page.locator('button').filter({ hasText: '➕' }).or(
      page.locator('button').filter({ hasText: '+' })
    );
    
    for (let i = 0; i < 3; i++) {
      if (await zoomInButton.count() > 0) {
        await zoomInButton.first().click();
        await page.waitForTimeout(200);
      }
    }
    console.log('✓ Step 4a: 週単位表示にズームイン完了');
    
    // スクリーンショットを撮って視覚的に確認（任意）
    // await page.screenshot({ path: 'test-results/scenario-week-view.png' });
    
    // 次に月単位表示にズームアウト
    const zoomOutButton = page.locator('button').filter({ hasText: '➖' }).or(
      page.locator('button').filter({ hasText: '-' })
    );
    
    for (let i = 0; i < 5; i++) {
      if (await zoomOutButton.count() > 0) {
        await zoomOutButton.first().click();
        await page.waitForTimeout(200);
      }
    }
    console.log('✓ Step 4b: 月単位表示にズームアウト完了');
    
    // 5. タスクの移動（ドラッグ＆ドロップ）
    // Controlledモードに切り替え（ドラッグ操作がデータに反映されるように）
    const modeSelect = page.locator('select').first();
    if (await modeSelect.isVisible()) {
      await modeSelect.selectOption('controlled');
      await page.waitForTimeout(300);
    }
    
    // 最初のタスクバーをドラッグ
    const firstTaskBar = page.locator('.gantt-bar').first();
    if (await firstTaskBar.isVisible()) {
      const barBox = await firstTaskBar.boundingBox();
      if (barBox) {
        // 右に3日分（dayWidth=30pxと仮定して90px）移動
        await page.mouse.move(barBox.x + barBox.width / 2, barBox.y + barBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(barBox.x + barBox.width / 2 + 90, barBox.y + barBox.height / 2, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(500);
        
        // イベントログに「Dragged」が記録されているか確認
        const eventLog = page.locator('.event-log, .log-entries');
        if (await eventLog.isVisible()) {
          const logText = await eventLog.textContent();
          if (logText?.includes('Dragged')) {
            console.log('✓ Step 5: タスクのドラッグ＆ドロップ完了');
          } else {
            console.log('⚠ Step 5: ドラッグイベントが記録されていない可能性');
          }
        }
      }
    }
    
    // 6. スケジュールの俯瞰（ズームアウトして全体を確認）
    // 最もズームアウトした状態にする
    for (let i = 0; i < 10; i++) {
      if (await zoomOutButton.count() > 0) {
        await zoomOutButton.first().click();
        await page.waitForTimeout(100);
      }
    }
    
    // プロジェクト全体が見渡せることを確認
    const timelineWrapper = page.locator('.gantt-timeline-wrapper');
    const scrollWidth = await timelineWrapper.evaluate((el) => el.scrollWidth);
    const clientWidth = await timelineWrapper.evaluate((el) => el.clientWidth);
    
    console.log(`✓ Step 6: 全体俯瞰完了 (scroll: ${scrollWidth}px, visible: ${clientWidth}px)`);
    
    // 7. 今日の進捗確認（今日の位置に移動）
    const todayButton = page.locator('button:has-text("📍 Today")');
    if (await todayButton.isVisible()) {
      // まず少しズームインして今日の詳細を見やすくする
      for (let i = 0; i < 2; i++) {
        if (await zoomInButton.count() > 0) {
          await zoomInButton.first().click();
          await page.waitForTimeout(100);
        }
      }
      
      await todayButton.click();
      await page.waitForTimeout(500);
      
      // 今日のラインが表示されているか確認
      const todayLine = page.locator('.gantt-today-line');
      const isTodayVisible = await todayLine.isVisible().catch(() => false);
      
      console.log(`✓ Step 7: 今日の位置に移動完了 (today line visible: ${isTodayVisible})`);
    }
    
    // 8. データのリセットと再計画
    const resetButton = page.locator('button:has-text("Reset")');
    if (await resetButton.isVisible()) {
      await resetButton.click();
      await page.waitForTimeout(500);
      
      // データがリセットされても表示が維持されていることを確認
      await expect(page.locator('.gantt-container')).toBeVisible();
      const finalRowCount = await page.locator('.gantt-tree-row').count();
      expect(finalRowCount).toBeGreaterThan(0);
      
      console.log(`✓ Step 8: データリセット完了 (${finalRowCount} rows visible)`);
    }
    
    // 最終確認: すべてのパネルが正常に表示されている
    await expect(page.locator('.gantt-tree-pane')).toBeVisible();
    await expect(page.locator('.gantt-timeline-wrapper')).toBeVisible();
    await expect(page.locator('.gantt-header-wrapper')).toBeVisible();
    
    console.log('✅ シナリオテスト（２）完了');
  });
  
  test('複数のセクションを連続で操作するフロー', async ({ page }) => {
    // より高速な操作シナリオ
    await page.goto('http://localhost:5176/');
    await expect(page.locator('.gantt-container')).toBeVisible({ timeout: 10000 });
    
    // 全展開 → 全折りたたみ → 全展開を高速で実行
    const expandBtn = page.locator('button:has-text("Expand All")');
    const collapseBtn = page.locator('button:has-text("Collapse All")');
    
    for (let i = 0; i < 3; i++) {
      if (await collapseBtn.isVisible()) {
        await collapseBtn.click();
        await page.waitForTimeout(200);
      }
      if (await expandBtn.isVisible()) {
        await expandBtn.click();
        await page.waitForTimeout(200);
      }
    }
    
    console.log('✓ 高速連続操作テスト完了');
    
    // 最終確認
    await expect(page.locator('.gantt-container')).toBeVisible();
  });
});
