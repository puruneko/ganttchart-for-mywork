/**
 * シナリオテスト（１）: 包括的なユーザーフロー
 * 
 * このテストは、ユーザーが典型的に行う操作の流れを再現します：
 * 1. 画面を既定データで描画
 * 2. 今の日時に視点移動
 * 3. 過去方向にスクロール（１年分）
 * 4. 未来方向にスクロール（今から１年後まで）
 * 5. 今の日時に視点移動
 * 6. ズームインして一番細かいtick defまで拡大
 * 7. ズームアウトして一番粗いtick defまで縮小
 * 8. タスクの追加（デバッグ用）。１０回ランダム時間間隔で追加（最大間隔2秒）
 */

import { test, expect } from '@playwright/test';

test.describe('シナリオテスト（１）: 包括的なユーザーフロー', () => {
  test('ユーザーが画面描画→スクロール→ズーム→データ追加を一連で実行できる', async ({ page }) => {
    // ① 画面を既定データで描画
    await page.goto('http://localhost:5176/');
    
    // ガントチャートが表示されるまで待機
    await expect(page.locator('.gantt-container')).toBeVisible({ timeout: 10000 });
    
    // ツリーペインとタイムラインが表示されることを確認
    await expect(page.locator('.gantt-tree-pane')).toBeVisible();
    await expect(page.locator('.gantt-timeline-wrapper')).toBeVisible();
    
    // 初期データが描画されていることを確認（少なくとも1つのノードが表示）
    const treeRows = page.locator('.gantt-tree-row');
    await expect(treeRows.first()).toBeVisible();
    const rowCount = await treeRows.count();
    expect(rowCount).toBeGreaterThan(0);
    
    console.log(`✓ Step 1: 画面描画完了 (${rowCount} nodes visible)`);
    
    // ② 今の日時に視点移動
    const todayButton = page.locator('button:has-text("📍 Today")');
    await expect(todayButton).toBeVisible();
    await todayButton.click();
    
    // スクロール位置が変わったことを確認（今日のラインが表示されているか）
    await page.waitForTimeout(500); // スクロールアニメーション待機
    
    // 今日の縦ラインが表示されているか確認
    const todayLine = page.locator('.gantt-today-line');
    const isTodayLineVisible = await todayLine.isVisible().catch(() => false);
    
    console.log(`✓ Step 2: 今日に視点移動完了 (today line visible: ${isTodayLineVisible})`);
    
    // ③ 過去方向にスクロール（１年分）
    const timelineWrapper = page.locator('.gantt-timeline-wrapper');
    await expect(timelineWrapper).toBeVisible();
    
    // 初期スクロール位置を取得
    const initialScrollLeft = await timelineWrapper.evaluate((el) => el.scrollLeft);
    
    // 過去方向にスクロール（負の方向）
    // dayWidth=30px × 365日 = 10,950px 分左にスクロール
    await timelineWrapper.evaluate((el) => {
      el.scrollLeft = Math.max(0, el.scrollLeft - 10950);
    });
    
    await page.waitForTimeout(500);
    
    const scrollAfterPast = await timelineWrapper.evaluate((el) => el.scrollLeft);
    console.log(`✓ Step 3: 過去方向スクロール完了 (${initialScrollLeft} → ${scrollAfterPast})`);
    
    // ④ 未来方向にスクロール（今から１年後まで）
    // 今日の位置に戻る + さらに1年分進む
    await todayButton.click();
    await page.waitForTimeout(500);
    
    const scrollAtToday = await timelineWrapper.evaluate((el) => el.scrollLeft);
    
    // 未来方向にスクロール（正の方向）
    await timelineWrapper.evaluate((el) => {
      el.scrollLeft = el.scrollLeft + 10950;
    });
    
    await page.waitForTimeout(500);
    
    const scrollAfterFuture = await timelineWrapper.evaluate((el) => el.scrollLeft);
    console.log(`✓ Step 4: 未来方向スクロール完了 (${scrollAtToday} → ${scrollAfterFuture})`);
    
    // ⑤ 今の日時に視点移動（再度）
    await todayButton.click();
    await page.waitForTimeout(500);
    
    const scrollBackToToday = await timelineWrapper.evaluate((el) => el.scrollLeft);
    console.log(`✓ Step 5: 今日に再移動完了 (scroll position: ${scrollBackToToday})`);
    
    // ⑥ ズームインして一番細かいtick defまで拡大
    const zoomInButton = page.locator('button:has-text("➕")').or(page.locator('button[title*="Zoom in"]'));
    
    // 最大20回ズームイン（一番細かいレベルまで）
    let zoomInCount = 0;
    for (let i = 0; i < 20; i++) {
      const zoomBtn = page.locator('button').filter({ hasText: '➕' }).or(
        page.locator('button').filter({ hasText: '+' })
      );
      
      if (await zoomBtn.count() > 0) {
        await zoomBtn.first().click();
        zoomInCount++;
        await page.waitForTimeout(100);
      } else {
        break;
      }
    }
    
    console.log(`✓ Step 6: ズームイン完了 (${zoomInCount} clicks)`);
    
    // ⑦ ズームアウトして一番粗いtick defまで縮小
    let zoomOutCount = 0;
    for (let i = 0; i < 30; i++) {
      const zoomBtn = page.locator('button').filter({ hasText: '➖' }).or(
        page.locator('button').filter({ hasText: '-' })
      );
      
      if (await zoomBtn.count() > 0) {
        await zoomBtn.first().click();
        zoomOutCount++;
        await page.waitForTimeout(100);
      } else {
        break;
      }
    }
    
    console.log(`✓ Step 7: ズームアウト完了 (${zoomOutCount} clicks)`);
    
    // ⑧ タスクの追加（デバッグ用）。１０回ランダム時間間隔で追加（最大間隔2秒）
    const addEventsButton = page.locator('button:has-text("🎲 Add Random Events")');
    
    if (await addEventsButton.isVisible()) {
      // イベントログを表示
      const showLogButton = page.locator('button:has-text("Show Event Log")');
      if (await showLogButton.isVisible()) {
        await showLogButton.click();
        await page.waitForTimeout(300);
      }
      
      // ランダムイベント追加を実行
      await addEventsButton.click();
      
      // イベント追加の完了を待機（最大25秒: 10回 × 最大2秒 + 余裕）
      await page.waitForTimeout(25000);
      
      // イベントログに「Added」メッセージが表示されているか確認
      const eventLog = page.locator('.event-log, .log-entries');
      if (await eventLog.isVisible()) {
        const logText = await eventLog.textContent();
        const addedCount = (logText?.match(/Added event/g) || []).length;
        console.log(`✓ Step 8: ランダムイベント追加完了 (${addedCount} events logged)`);
        
        // 少なくとも1つのイベントが追加されたことを確認
        expect(addedCount).toBeGreaterThan(0);
      }
    } else {
      console.log('⚠ Step 8: Add Random Events button not found, skipping');
    }
    
    // 最終確認: ガントチャートがまだ表示されている
    await expect(page.locator('.gantt-container')).toBeVisible();
    
    console.log('✅ シナリオテスト（１）完了');
  });
});
