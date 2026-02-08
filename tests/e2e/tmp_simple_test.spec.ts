import { test, expect } from '@playwright/test';

test('シンプルなページ確認', async ({ page }) => {
  const errors: string[] = [];
  
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[BROWSER ${type.toUpperCase()}]`, text);
  });
  
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log('❌ PAGE ERROR:', error.message);
    console.log('Stack:', error.stack);
  });
  
  console.log('ページに移動中...');
  await page.goto('http://localhost:5177/');
  
  // JavaScriptの実行を待つ
  await page.waitForTimeout(3000);
  
  console.log('ページタイトル:', await page.title());
  
  // スクリーンショット
  await page.screenshot({ path: 'tmp_debug.png', fullPage: true });
  
  // コンテナ確認
  const container = await page.$('.gantt-container');
  console.log('Container exists:', container !== null);
  
  const bodyHTML = await page.evaluate(() => document.body.innerHTML);
  console.log('Body HTML:', bodyHTML.substring(0, 1000));
  
  console.log('Errors found:', errors.length);
  errors.forEach(err => console.log('  -', err));
});
