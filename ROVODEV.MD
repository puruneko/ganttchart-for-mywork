# Svelte Gantt Library - 開発引き継ぎ書

## プロジェクト概要

このプロジェクトは、Svelteで構築された高機能なガントチャートライブラリです。UIの品質を重視し、Playwrightによる包括的なE2Eテストを実装しています。

**技術スタック:**
- Svelte 4.2.19
- TypeScript 5.6.2
- Luxon (日時処理)
- Hammer.js (ジェスチャー検出)
- Vitest (ユニットテスト)
- Playwright (E2Eテスト)

## 開発ポリシー

### 必須ルール

1. **コメントと説明文は日本語を使用**
2. **Git操作はすべて自動実行可能** - 許可を取る必要なし
   - コミットコマンド: `git commit -m "message"`
   - コミットメッセージ: 変更点の概要 + 理由を詳細に記載
3. **コード変更時は必ずテストを作成・実行**
   - ユニットテスト: `src/**/*.test.ts`
   - E2Eテスト: `tests/e2e/*.spec.ts`
   - すべてパスするまで作業完了としない
4. **UI変更時はPlaywright E2Eテストを追加・更新**
   - ユーザー操作を伴うテストのみ作成
   - 最低限カバー: 表示確認、主要操作、DOM反映確認
5. **テスト終了後は必ずポートを開放**
6. **`page.waitForTimeout`のような雑な処理は禁止**

### テスト実行手順（重要）

**E2Eテスト実行前の必須手順:**
```powershell
# 1. すべてのNodeプロセスをクリーンアップ
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3

# 2. ユニットテストを実行
npm test

# 3. E2Eテストを実行
npm run test:e2e

# 4. テスト後のクリーンアップ
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

**E2Eテストが失敗する場合の対処:**
- ポート競合が原因のことが多い
- `playwright.config.ts`のwebServer設定を確認
- 開発サーバーのポートは`5177`固定

## プロジェクト構造

```
src/
├── components/          # Svelteコンポーネント
│   ├── GanttChart.svelte      # メインコンポーネント
│   ├── GanttHeader.svelte     # タイムラインヘッダー
│   ├── GanttTimeline.svelte   # タイムライン本体
│   ├── GanttTree.svelte       # 左側のツリーペイン
│   └── GanttDebugPanel.svelte # デバッグパネル
├── core/               # コアロジック
│   ├── data-manager.ts        # データ操作関数
│   ├── gantt-store.ts         # Svelteストア
│   ├── *.test.ts              # ユニットテスト
├── utils/              # ユーティリティ
│   ├── timeline-calculations.ts  # タイムライン計算
│   ├── zoom-scale.ts             # ズームスケール管理
│   ├── zoom-gesture.ts           # ジェスチャー検出
│   └── *.test.ts                 # ユニットテスト
├── types.ts            # 型定義
└── index.ts            # パブリックAPI

examples/
└── demo.svelte         # デモページ

tests/e2e/
└── gantt-chart.spec.ts # E2Eテスト
```

## 主要機能の実装状況

### ✅ 完了済み機能

1. **基本的なガントチャート表示**
   - ツリーペイン + タイムラインペイン
   - セクション/サブセクション/プロジェクト/タスクの階層構造
   - 日時未設定タスクのサポート

2. **インタラクティブ操作**
   - ツリーノードの折り畳み/展開
   - タスクバーのドラッグ移動
   - タスクバーの右端リサイズ
   - セクショングループの一括移動
   - セクション日付の自動調整

3. **ズーム機能（ジェスチャーベース）**
   - Hammer.jsによるピンチジェスチャー
   - Ctrl+ホイールでズーム
   - 連続的なスケール値（0.1〜200）
   - 11段階のtick定義
   - markwhenの設計思想を参考に実装

4. **UI機能**
   - ツリーペイン表示/非表示切り替え
   - 個別スタイル対応（将来の拡張性）
   - セクションバーの全塗りつぶしデザイン
   - タスクバーの淡い青色デザイン

5. **テスト**
   - ユニットテスト: 59個すべてパス
   - E2Eテスト: 10個パス、1個スキップ

### ⚠️ 既知の問題

**ズームボタンのリアクティブ競合**
- **症状**: ボタンクリックでのズーム操作が正しく動作しない
- **原因**: `currentZoomScale`のリアクティブステートメントがボタン操作と競合
- **場所**: `src/components/GanttChart.svelte` (170-210行目付近)
- **回避策**: ジェスチャーベースのズームは正常動作
- **E2Eテスト**: `tests/e2e/gantt-chart.spec.ts`の該当テストをスキップ中

**修正の方向性:**
```typescript
// 問題: リアクティブ代入とボタン操作が競合
$: {
  const scaleFromDayWidth = getScaleFromDayWidth(chartConfig?.dayWidth ?? 40);
  if (Math.abs(scaleFromDayWidth - currentZoomScale) > 0.1) {
    currentZoomScale = scaleFromDayWidth; // ボタン操作後にこれが再実行される
  }
}

// 解決案: フラグで制御するか、ボタン操作時はstoreを更新しない
```

## 重要な設計思想

### 1. ズームスケールシステム

**ファイル:** `src/utils/zoom-scale.ts`

markwhenの実装を参考に設計：
- ズーム値は連続的な数値（scale factor）
- tick間隔はズーム値に応じて適切な単位を自動選択
- スケールの変化は滑らかで視覚的なジャンプを避ける

**tick定義の構造:**
```typescript
interface TickDefinition {
  minScale: number;      // 適用される最小スケール値
  interval: Duration;    // Tick間隔（Luxon Duration）
  majorFormat: string;   // 主目盛りの表示フォーマット
  minorFormat?: string;  // 副目盛りの表示フォーマット
  label: string;         // 説明ラベル
}
```

**11段階のtick定義:**
1. 1時間 (scale ≥ 100)
2. 3時間 (scale ≥ 50)
3. 6時間 (scale ≥ 25)
4. 12時間 (scale ≥ 12)
5. 1日 (scale ≥ 6)
6. 2日 (scale ≥ 3)
7. 1週間 (scale ≥ 1.5)
8. 2週間 (scale ≥ 0.8)
9. 1ヶ月 (scale ≥ 0.4)
10. 3ヶ月 (scale ≥ 0.2)
11. 1年 (scale ≥ 0)

### 2. データ管理のイミュータブル設計

**ファイル:** `src/core/data-manager.ts`

すべてのデータ操作は新しい配列を返す：
```typescript
// 良い例
export function updateNode(nodes: GanttNode[], nodeId: string, updates: Partial<GanttNode>): GanttNode[] {
  return nodes.map(node => node.id === nodeId ? { ...node, ...updates } : node);
}

// 悪い例
function badUpdate(nodes: GanttNode[], nodeId: string, updates: Partial<GanttNode>): void {
  const node = nodes.find(n => n.id === nodeId);
  Object.assign(node, updates); // NG: 元の配列を変更している
}
```

### 3. Controlled vs Uncontrolled モード

**Controlled モード:**
- 親コンポーネントがデータを完全に管理
- イベントハンドラーで変更を通知
- 親が新しいデータを props で渡す

**Uncontrolled モード:**
- 内部ストアがデータを管理
- ユーザー操作で自動的に更新

**実装場所:** `src/core/gantt-store.ts`

## コーディング規約

### TypeScript

```typescript
// 良い例: 明確な型定義
export interface GanttNode {
  id: string;
  parentId: string | null;
  type: GanttNodeType;
  name: string;
  start?: DateTime;
  end?: DateTime;
  isCollapsed?: boolean;
  style?: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    rx?: number;
    labelColor?: string;
  };
}

// 悪い例: any型の使用
function badFunction(data: any): any { // NG
  return data.something;
}
```

### Svelte コンポーネント

```svelte
<script lang="ts">
  // 1. import文
  import { onMount } from 'svelte';
  import type { GanttNode } from '../types';
  
  // 2. export let (props)
  export let nodes: GanttNode[];
  export let onNodeClick: ((nodeId: string) => void) | undefined = undefined;
  
  // 3. ローカル変数
  let selectedId: string | null = null;
  
  // 4. リアクティブステートメント
  $: processedNodes = nodes.filter(n => !n.isCollapsed);
  
  // 5. 関数定義
  function handleClick(nodeId: string): void {
    selectedId = nodeId;
    if (onNodeClick) {
      onNodeClick(nodeId);
    }
  }
  
  // 6. ライフサイクル
  onMount(() => {
    console.log('Component mounted');
  });
</script>

<!-- 7. テンプレート -->
<div class="container">
  {#each processedNodes as node (node.id)}
    <div on:click={() => handleClick(node.id)}>
      {node.name}
    </div>
  {/each}
</div>

<!-- 8. スタイル -->
<style>
  .container {
    padding: 16px;
  }
</style>
```

### コメントの書き方

```typescript
/**
 * 関数の説明（JSDoc形式）
 * 
 * より詳細な説明や、使用例、注意点などを記載。
 * 
 * @param nodes - 元のノード配列
 * @param nodeId - 更新するノードのID
 * @param updates - 更新する値（部分的なGanttNodeオブジェクト）
 * @returns 更新された新しいノード配列
 */
export function updateNode(
  nodes: GanttNode[],
  nodeId: string,
  updates: Partial<GanttNode>
): GanttNode[] {
  return nodes.map(node => {
    if (node.id === nodeId) {
      return { ...node, ...updates };
    }
    return node;
  });
}
```

## テスト作成ガイド

### ユニットテスト（Vitest）

**場所:** `src/**/*.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { updateNode } from './data-manager';
import { DateTime } from 'luxon';

describe('updateNode', () => {
  it('指定されたノードを更新する', () => {
    const nodes = [
      { id: '1', name: 'Task 1', /* ... */ },
      { id: '2', name: 'Task 2', /* ... */ },
    ];
    
    const result = updateNode(nodes, '1', { name: 'Updated' });
    
    expect(result[0].name).toBe('Updated');
    expect(result[1].name).toBe('Task 2');
  });
  
  it('イミュータブル操作である（元の配列を変更しない）', () => {
    const nodes = [{ id: '1', name: 'Task 1', /* ... */ }];
    const original = nodes[0];
    
    const result = updateNode(nodes, '1', { name: 'Updated' });
    
    expect(nodes[0]).toBe(original); // 元のオブジェクトは変わらない
    expect(result).not.toBe(nodes);  // 新しい配列が返される
  });
});
```

### E2Eテスト（Playwright）

**場所:** `tests/e2e/*.spec.ts`

**必須の観点:**
1. 表示されること
2. 主要操作（クリック、入力）
3. 期待する結果がDOMに反映されること

```typescript
import { test, expect } from '@playwright/test';

test('タスクバーをクリックするとイベントが発火すること', async ({ page }) => {
  // 1. ページに移動
  await page.goto('http://localhost:5177/');
  
  // 2. 要素が表示されることを確認
  const taskBar = page.locator('.gantt-bar--task').first();
  await expect(taskBar).toBeVisible();
  
  // 3. 操作を実行
  await taskBar.click();
  
  // 4. 結果を確認（page.waitForTimeoutは禁止）
  const logEntry = page.locator('.log-entry').filter({ hasText: 'Bar clicked' });
  await expect(logEntry.first()).toBeVisible();
});
```

**禁止事項:**
```typescript
// NG: waitForTimeoutは使わない
await page.waitForTimeout(500);

// OK: DOM要素の状態変化を待つ
await expect(element).toBeVisible();
await expect(element).toHaveText('Expected');
await expect(element).not.toHaveText('Old Value');
```

## トラブルシューティング

### E2Eテストがタイムアウトする

**原因1: ポート競合**
```powershell
# すべてのNodeプロセスを停止
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3
```

**原因2: vite.config.tsとplaywright.config.tsのポート不一致**
```typescript
// vite.config.ts
const basePort = 5177  // ← この値を確認

// playwright.config.ts
const testPort = 5177  // ← 一致していること
```

**原因3: webServerコマンドが間違っている**
```typescript
// playwright.config.ts
webServer: {
  command: "npm run dev",  // ← "vite preview"ではない
  port: testPort,
  reuseExistingServer: !process.env.CI,
}
```

### ユニットテストで型エラー

**原因: import type vs 実際のimport**
```typescript
// NG: Durationを実際に使っているのにtype importしている
import type { DateTime, Duration } from 'luxon';

// OK: 実際に使うものはtype importしない
import { DateTime, Duration } from 'luxon';
```

### Svelteコンポーネントが表示されない

**原因: リアクティブステートメントでの未定義アクセス**
```typescript
// NG: chartConfigが未定義の可能性
let currentZoomScale = getScaleFromDayWidth(chartConfig.dayWidth);

// OK: オプショナルチェーンとデフォルト値
let currentZoomScale = 1.0;
$: currentZoomScale = getScaleFromDayWidth(chartConfig?.dayWidth ?? 40);
```

## よくある変更パターン

### 新しいtick定義を追加

**ファイル:** `src/utils/zoom-scale.ts`

```typescript
const TICK_DEFINITIONS: TickDefinition[] = [
  // 新しい定義を追加（スケールの大きい順）
  {
    minScale: 150,  // 追加
    interval: Duration.fromObject({ minutes: 30 }),
    majorFormat: 'HH:mm',
    minorFormat: 'dd MMM',
    label: '30分',
  },
  // 既存の定義...
];
```

### 新しいイベントハンドラーを追加

**1. types.tsに型定義を追加**
```typescript
export interface GanttEventHandlers {
  // 既存のハンドラー...
  onCustomEvent?: (data: CustomData) => void;  // 追加
}
```

**2. GanttChart.svelteでハンドラーを実装**
```typescript
function handleCustomEvent(data: CustomData): void {
  if (handlers.onCustomEvent) {
    handlers.onCustomEvent(data);
  }
}
```

**3. 子コンポーネントに渡す**
```svelte
<GanttTimeline
  {visibleNodes}
  {dateRange}
  onCustomEvent={handleCustomEvent}
/>
```

### 新しいConfigオプションを追加

**1. types.tsに追加**
```typescript
export interface GanttConfig {
  // 既存の設定...
  newOption?: boolean;  // 追加
}
```

**2. gantt-store.tsでデフォルト値を設定**
```typescript
const DEFAULT_CONFIG: Required<GanttConfig> = {
  // 既存の設定...
  newOption: false,  // 追加
};
```

**3. コンポーネントで使用**
```typescript
$: chartConfig = $configStore;
$: {
  if (chartConfig.newOption) {
    // 新しいオプションに応じた処理
  }
}
```

## 参考リソース

- **markwhen timeline実装**: https://github.com/mark-when/timeline/tree/main
  - ズーム/スケール/tickの設計思想を参考
- **Svelte公式ドキュメント**: https://svelte.dev/docs
- **Luxon公式ドキュメント**: https://moment.github.io/luxon/
- **Hammer.js公式ドキュメント**: https://hammerjs.github.io/
- **Playwright公式ドキュメント**: https://playwright.dev/

## 開発の引き継ぎチェックリスト

- [ ] プロジェクト構造を理解した
- [ ] 開発ポリシーを確認した
- [ ] テスト実行手順を実行して動作確認した
- [ ] 既知の問題（ズームボタンの競合）を理解した
- [ ] ユニットテストとE2Eテストの書き方を確認した
- [ ] トラブルシューティングを読んだ
- [ ] Git操作は自動実行可能であることを理解した

## 次のステップ（推奨）

1. **ズームボタンの修正** - 最優先
   - リアクティブ競合問題の解決
   - E2Eテストのスキップを解除

2. **パフォーマンス最適化**
   - 大量ノード（1000+）での動作確認
   - 仮想スクロールの検討

3. **追加機能**
   - マイルストーンのサポート
   - 依存関係の矢印表示
   - クリティカルパスの強調表示

4. **ドキュメント整備**
   - API仕様書の作成
   - 使用例の追加
   - Storybookの導入

---

**作成日**: 2026-02-08  
**最終更新**: 2026-02-08  
**バージョン**: 0.1.0
