# Svelte Gantt Library - 利用者向けドキュメント

Svelte 4用の軽量で柔軟なガントチャートライブラリです。  
階層構造、ドラッグ&ドロップ、ズーム機能をサポートし、イミュータブルなデータ管理を採用しています。

---

## 目次

1. [インストール](#インストール)
2. [クイックスタート](#クイックスタート)
3. [データ構造](#データ構造)
4. [基本的な使い方](#基本的な使い方)
5. [APIリファレンス](#apiリファレンス)
6. [イベントハンドラー](#イベントハンドラー)
7. [設定オプション](#設定オプション)
8. [高度な使い方](#高度な使い方)
9. [スタイリング](#スタイリング)
10. [トラブルシューティング](#トラブルシューティング)

---

## インストール

### npmを使用

```bash
npm install svelte-gantt-lib
```

### yarnを使用

```bash
yarn add svelte-gantt-lib
```

### 依存関係

このライブラリは以下のパッケージに依存しています：

- `luxon`: 日付・時刻操作
- `svelte`: Svelte 4以上

---

## クイックスタート

### 最小限の例

```svelte
<script lang="ts">
  import { GanttChart } from 'svelte-gantt-lib';
  import { DateTime } from 'luxon';
  import type { GanttNode } from 'svelte-gantt-lib';
  
  const nodes: GanttNode[] = [
    {
      id: '1',
      parentId: null,
      type: 'project',
      name: 'プロジェクトA',
      start: DateTime.fromISO('2024-01-01'),
      end: DateTime.fromISO('2024-03-31')
    },
    {
      id: '2',
      parentId: '1',
      type: 'task',
      name: 'タスク1',
      start: DateTime.fromISO('2024-01-01'),
      end: DateTime.fromISO('2024-01-15')
    },
    {
      id: '3',
      parentId: '1',
      type: 'task',
      name: 'タスク2',
      start: DateTime.fromISO('2024-01-16'),
      end: DateTime.fromISO('2024-02-15')
    }
  ];
</script>

<GanttChart {nodes} />
```

---

## データ構造

### GanttNode

ガントチャートの各項目を表すノードの型定義です。

```typescript
interface GanttNode {
  /** 全ノード間で一意な識別子（必須） */
  id: string;
  
  /** 親ノードのID。ルートレベルの場合はnull */
  parentId: string | null;
  
  /** ノードのタイプ */
  type: 'project' | 'section' | 'subsection' | 'task';
  
  /** 表示名 */
  name: string;
  
  /** 開始日時（luxon DateTime） */
  start?: DateTime;
  
  /** 終了日時（luxon DateTime） */
  end?: DateTime;
  
  /** 折りたたみ状態 */
  isCollapsed?: boolean;
  
  /** 任意のメタデータ */
  metadata?: Record<string, unknown>;
}
```

#### ノードタイプの説明

- **`project`**: プロジェクト（最上位レベル）
- **`section`**: セクション（プロジェクト内のグループ）
- **`subsection`**: サブセクション（セクション内のグループ）
- **`task`**: タスク（実作業）

#### 日付の設定

- `start`と`end`は**Luxonの`DateTime`オブジェクト**を使用します
- 未設定（`undefined`）の場合、親ノードの開始日から自動計算されます

```typescript
import { DateTime } from 'luxon';

const task: GanttNode = {
  id: 'task-1',
  parentId: 'project-1',
  type: 'task',
  name: 'タスク1',
  start: DateTime.fromISO('2024-01-01'),
  end: DateTime.fromISO('2024-01-15')
};
```

---

## 基本的な使い方

### 1. シンプルな表示

```svelte
<script lang="ts">
  import { GanttChart } from 'svelte-gantt-lib';
  import type { GanttNode } from 'svelte-gantt-lib';
  
  const nodes: GanttNode[] = [...]; // ノードデータ
</script>

<GanttChart {nodes} />
```

### 2. イベントハンドラーの追加

```svelte
<script lang="ts">
  import { GanttChart } from 'svelte-gantt-lib';
  import type { GanttNode, GanttEventHandlers } from 'svelte-gantt-lib';
  
  const nodes: GanttNode[] = [...];
  
  const handlers: GanttEventHandlers = {
    onNodeClick: (node) => {
      console.log('ノードがクリックされました:', node.name);
    },
    onBarDrag: (nodeId, newStart, newEnd) => {
      console.log(`タスク ${nodeId} が移動されました`);
      // ノードデータを更新
      nodes = nodes.map(n => 
        n.id === nodeId ? { ...n, start: newStart, end: newEnd } : n
      );
    }
  };
</script>

<GanttChart {nodes} {handlers} />
```

### 3. 設定オプションの指定

```svelte
<script lang="ts">
  import { GanttChart } from 'svelte-gantt-lib';
  import type { GanttNode, GanttConfig } from 'svelte-gantt-lib';
  
  const nodes: GanttNode[] = [...];
  
  const config: GanttConfig = {
    mode: 'controlled',
    rowHeight: 40,
    dayWidth: 30,
    treePaneWidth: 300,
    indentSize: 20,
    dragSnapDivision: 4
  };
</script>

<GanttChart {nodes} config={config} />
```

---

## APIリファレンス

### GanttChartコンポーネント

#### Props

| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `nodes` | `GanttNode[]` | ✅ | - | 表示するノードの配列 |
| `handlers` | `GanttEventHandlers` | ❌ | `{}` | イベントハンドラー |
| `config` | `GanttConfig` | ❌ | `{}` | 設定オプション |

#### メソッド

コンポーネントインスタンスから直接呼び出せるメソッドです。

```typescript
// コンポーネント参照を取得
let ganttChart: GanttChart;

// 指定した日付にスクロール
ganttChart.scrollToDate(DateTime.fromISO('2024-06-15'));

// 現在時刻（今日）にスクロール
ganttChart.scrollToToday();

// ストアへのアクセス（高度な使い方）
const store = ganttChart.getStore();
store.zoomScale.subscribe((scale) => {
  console.log('現在のズームスケール:', scale);
});
```

**利用可能なメソッド:**

| メソッド | 説明 |
|---------|------|
| `scrollToDate(targetDate: DateTime)` | 指定した日付にタイムラインをスクロール。日付が現在の表示範囲外の場合は自動的に範囲を拡張します。 |
| `scrollToToday()` | 現在時刻（今日）にタイムラインをスクロール。`scrollToDate(DateTime.now())`のショートカット。 |
| `getStore()` | 内部ストアへのアクセス（高度な使い方）。 |

**使用例:**

```svelte
<script lang="ts">
  import { GanttChart } from 'svelte-gantt-lib';
  import { DateTime } from 'luxon';
  
  let ganttChart: GanttChart;
  let nodes = [...];
  
  function jumpToProjectStart() {
    const firstTask = nodes[0];
    if (firstTask) {
      ganttChart.scrollToDate(firstTask.start);
    }
  }
  
  function jumpToToday() {
    ganttChart.scrollToToday();
  }
</script>

<button on:click={jumpToProjectStart}>プロジェクト開始日へ</button>
<button on:click={jumpToToday}>今日へ</button>

<GanttChart bind:this={ganttChart} {nodes} />
```

---

## イベントハンドラー

### GanttEventHandlers

すべてのイベントハンドラーはオプショナルです。

```typescript
interface GanttEventHandlers {
  /** ノードがクリックされたとき */
  onNodeClick?: (node: GanttNode) => void;
  
  /** 折りたたみ/展開が切り替えられたとき */
  onToggleCollapse?: (nodeId: string, newCollapsedState: boolean) => void;
  
  /** データが変更されたとき（uncontrolledモードのみ） */
  onDataChange?: (nodes: GanttNode[]) => void;
  
  /** タイムライン上のバーがクリックされたとき */
  onBarClick?: (node: GanttNode, event: MouseEvent) => void;
  
  /** ツリー内のノード名がクリックされたとき */
  onNameClick?: (node: GanttNode, event: MouseEvent) => void;
  
  /** バーがドラッグされたとき（controlledモード推奨） */
  onBarDrag?: (nodeId: string, newStart: DateTime, newEnd: DateTime) => void;
  
  /** グループ全体がドラッグされたとき */
  onGroupDrag?: (nodeId: string, daysDelta: number) => void;
  
  /** セクション日付自動調整時 */
  onAutoAdjustSection?: (nodeId: string) => void;
  
  /** ズームレベルが変更されたとき */
  onZoomChange?: (zoomLevel: number) => void;
}
```

### イベントハンドラーの使用例

#### ノードクリック

```svelte
<script lang="ts">
  const handlers = {
    onNodeClick: (node) => {
      alert(`${node.name} がクリックされました`);
    }
  };
</script>

<GanttChart {nodes} {handlers} />
```

#### ドラッグ&ドロップ

```svelte
<script lang="ts">
  import { updateNode } from 'svelte-gantt-lib';
  
  let nodes: GanttNode[] = [...];
  
  const handlers = {
    onBarDrag: (nodeId, newStart, newEnd) => {
      // イミュータブルにノードを更新
      nodes = updateNode(nodes, nodeId, { 
        start: newStart, 
        end: newEnd 
      });
    }
  };
</script>

<GanttChart {nodes} {handlers} />
```

#### 折りたたみ/展開

```svelte
<script lang="ts">
  import { toggleNodeCollapse } from 'svelte-gantt-lib';
  
  let nodes: GanttNode[] = [...];
  
  const handlers = {
    onToggleCollapse: (nodeId, newCollapsedState) => {
      nodes = toggleNodeCollapse(nodes, nodeId);
      console.log(`ノード ${nodeId} は ${newCollapsedState ? '折りたたまれました' : '展開されました'}`);
    }
  };
</script>

<GanttChart {nodes} {handlers} />
```

---

## 設定オプション

### GanttConfig

```typescript
interface GanttConfig {
  /** データ管理モード */
  mode?: 'controlled' | 'uncontrolled';
  
  /** 各行の高さ（ピクセル） */
  rowHeight?: number;
  
  /** 1日あたりの幅（ピクセル） */
  dayWidth?: number;
  
  /** 左側ツリーペインの幅（ピクセル） */
  treePaneWidth?: number;
  
  /** 階層レベルごとのインデント幅（ピクセル） */
  indentSize?: number;
  
  /** カスタムスタイリング用のCSSクラスプレフィックス */
  classPrefix?: string;
  
  /** ドラッグ時のスナップ単位（1日の何分の1か） */
  dragSnapDivision?: number;
  
  /** 左側のツリーペインを表示するか */
  showTreePane?: boolean;
  
  /** ズームレベル（1-5） */
  zoomLevel?: number;
}
```

### デフォルト値

| オプション | デフォルト値 | 説明 |
|-----------|-------------|------|
| `mode` | `'controlled'` | データ管理モード |
| `rowHeight` | `32` | 行の高さ（px） |
| `dayWidth` | `30` | 1日の幅（px） |
| `treePaneWidth` | `250` | ツリーペインの幅（px） |
| `indentSize` | `16` | インデント幅（px） |
| `classPrefix` | `'gantt'` | CSSクラスプレフィックス |
| `dragSnapDivision` | `4` | ドラッグスナップ（0.25日単位） |
| `showTreePane` | `true` | ツリーペイン表示 |
| `zoomLevel` | `3` | ズームレベル |

### 設定例

#### 大きな行高

```svelte
<GanttChart 
  {nodes} 
  config={{ rowHeight: 50 }} 
/>
```

#### ドラッグスナップを1日単位に

```svelte
<GanttChart 
  {nodes} 
  config={{ dragSnapDivision: 1 }} 
/>
```

#### ツリーペインを非表示

```svelte
<GanttChart 
  {nodes} 
  config={{ showTreePane: false }} 
/>
```

---

## 高度な使い方

### エクスポートされた関数

ライブラリは、データ操作用の関数もエクスポートしています。

```typescript
import {
  buildHierarchyMap,
  buildNodeMap,
  computeNodes,
  calculateDateRange,
  toggleNodeCollapse,
  updateNode
} from 'svelte-gantt-lib';
```

#### `toggleNodeCollapse`

ノードの折りたたみ状態を切り替えます（イミュータブル）。

```typescript
function toggleNodeCollapse(
  nodes: GanttNode[], 
  nodeId: string
): GanttNode[];
```

**使用例:**
```typescript
let nodes = [...];
nodes = toggleNodeCollapse(nodes, 'node-1');
```

#### `updateNode`

特定のノードを更新します（イミュータブル）。

```typescript
function updateNode(
  nodes: GanttNode[], 
  nodeId: string, 
  updates: Partial<GanttNode>
): GanttNode[];
```

**使用例:**
```typescript
let nodes = [...];
nodes = updateNode(nodes, 'task-1', {
  start: DateTime.fromISO('2024-02-01'),
  end: DateTime.fromISO('2024-02-15')
});
```

#### `calculateDateRange`

全ノードから日付範囲を計算します。

```typescript
function calculateDateRange(nodes: GanttNode[]): DateRange;

interface DateRange {
  start: DateTime;
  end: DateTime;
}
```

**使用例:**
```typescript
const range = calculateDateRange(nodes);
console.log('開始:', range.start.toISODate());
console.log('終了:', range.end.toISODate());
```

### ストアへのアクセス

コンポーネントインスタンスから内部ストアにアクセスできます。

```svelte
<script lang="ts">
  import { GanttChart } from 'svelte-gantt-lib';
  
  let ganttChart: any;
  let currentZoomScale = 1.0;
  
  $: if (ganttChart) {
    const store = ganttChart.getStore();
    store.zoomScale.subscribe((scale: number) => {
      currentZoomScale = scale;
    });
  }
</script>

<GanttChart bind:this={ganttChart} {nodes} />

<p>現在のズームスケール: {currentZoomScale.toFixed(2)}</p>
```

### Controlled vs Uncontrolled モード

#### Controlled モード（推奨）

外部で状態を管理し、イベント経由で変更を反映します。

```svelte
<script lang="ts">
  let nodes: GanttNode[] = [...];
  
  const handlers = {
    onBarDrag: (nodeId, newStart, newEnd) => {
      nodes = updateNode(nodes, nodeId, { start: newStart, end: newEnd });
    },
    onToggleCollapse: (nodeId) => {
      nodes = toggleNodeCollapse(nodes, nodeId);
    }
  };
</script>

<GanttChart {nodes} {handlers} config={{ mode: 'controlled' }} />
```

#### Uncontrolled モード

内部で状態を管理し、変更を通知します。

```svelte
<script lang="ts">
  const initialNodes: GanttNode[] = [...];
  
  const handlers = {
    onDataChange: (newNodes) => {
      console.log('データが変更されました:', newNodes);
      // 必要に応じて外部に保存
    }
  };
</script>

<GanttChart 
  nodes={initialNodes} 
  {handlers} 
  config={{ mode: 'uncontrolled' }} 
/>
```

---

## 視覚的な機能

### 現在時刻ライン

タイムライン上に現在時刻を示す赤い縦線が自動的に表示されます。

**特徴:**
- 赤い点線（`stroke-dasharray="4,4"`）で表示
- 分単位の精度（`DateTime.now().startOf('minute')`）
- 現在時刻が表示範囲内にある場合のみ表示
- リアルタイム更新は行われません（コンポーネント再レンダリング時に更新）

**カスタマイズ:**

デフォルトでは`.gantt-now-line`クラスを使用します。

```css
/* 現在時刻ラインのスタイルをカスタマイズ */
:global(.gantt-now-line) {
  stroke: #3498db !important;  /* 青色に変更 */
  stroke-width: 3 !important;  /* 太さを変更 */
  stroke-dasharray: 8,4 !important;  /* 点線パターンを変更 */
}
```

---

## スタイリング

### CSS変数によるカスタマイズ

ライブラリは、CSS変数を使用してスタイルをカスタマイズできます。

```css
/* グローバルスタイル */
:global(.gantt-chart) {
  --gantt-bg-color: #ffffff;
  --gantt-border-color: #e0e0e0;
  --gantt-header-bg: #f5f5f5;
  --gantt-row-hover-bg: #f9f9f9;
  
  --gantt-project-color: #4a90e2;
  --gantt-section-color: #9b59b6;
  --gantt-subsection-color: #e67e22;
  --gantt-task-color: #27ae60;
}
```

### CSSクラスのカスタマイズ

`classPrefix`オプションでクラス名をカスタマイズできます。

```svelte
<GanttChart 
  {nodes} 
  config={{ classPrefix: 'my-gantt' }} 
/>
```

```css
/* カスタムスタイル */
:global(.my-gantt-bar--task) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
}

:global(.my-gantt-tree-row:hover) {
  background-color: #fffbea;
}
```

### 主要なCSSクラス

| クラス名 | 説明 |
|---------|------|
| `.gantt-chart` | メインコンテナ |
| `.gantt-tree` | 左側ツリーペイン |
| `.gantt-timeline` | 右側タイムライン |
| `.gantt-header` | 日付ヘッダー |
| `.gantt-tree-row` | ツリーの各行 |
| `.gantt-bar--task` | タスクバー |
| `.gantt-bar--project` | プロジェクトバー |
| `.gantt-section-bar-full` | セクションバー |
| `.gantt-toggle` | 折りたたみボタン |

---

## トラブルシューティング

### 日付が表示されない

**原因:** Luxonの`DateTime`オブジェクトを使用していない

**解決策:**
```typescript
import { DateTime } from 'luxon';

const node: GanttNode = {
  // ❌ 間違い
  start: new Date('2024-01-01'),
  
  // ✅ 正しい
  start: DateTime.fromISO('2024-01-01')
};
```

### ドラッグが動作しない

**原因:** Controlledモードで`onBarDrag`ハンドラーが未定義

**解決策:**
```svelte
<script lang="ts">
  const handlers = {
    onBarDrag: (nodeId, newStart, newEnd) => {
      nodes = updateNode(nodes, nodeId, { start: newStart, end: newEnd });
    }
  };
</script>

<GanttChart {nodes} {handlers} />
```

### 階層構造が正しく表示されない

**原因:** `parentId`の設定が間違っている

**解決策:**
```typescript
const nodes: GanttNode[] = [
  // ルートノード
  { id: '1', parentId: null, type: 'project', name: 'プロジェクト' },
  
  // 子ノード（parentIdを正しく設定）
  { id: '2', parentId: '1', type: 'task', name: 'タスク1' },
  { id: '3', parentId: '1', type: 'task', name: 'タスク2' }
];
```

### タイムゾーンの問題

**原因:** Luxonのタイムゾーン設定

**解決策:**
```typescript
// UTCを使用
const start = DateTime.fromISO('2024-01-01', { zone: 'utc' });

// ローカルタイムゾーンを使用
const start = DateTime.fromISO('2024-01-01', { zone: 'local' });

// 特定のタイムゾーンを使用
const start = DateTime.fromISO('2024-01-01', { zone: 'Asia/Tokyo' });
```

---

## サンプルコード

### 完全な例

```svelte
<script lang="ts">
  import { GanttChart, updateNode, toggleNodeCollapse } from 'svelte-gantt-lib';
  import { DateTime } from 'luxon';
  import type { GanttNode, GanttEventHandlers, GanttConfig } from 'svelte-gantt-lib';
  
  // データ
  let nodes: GanttNode[] = [
    {
      id: 'project-1',
      parentId: null,
      type: 'project',
      name: 'Webサイトリニューアル',
      start: DateTime.fromISO('2024-01-01'),
      end: DateTime.fromISO('2024-06-30')
    },
    {
      id: 'section-1',
      parentId: 'project-1',
      type: 'section',
      name: '企画・設計',
      start: DateTime.fromISO('2024-01-01'),
      end: DateTime.fromISO('2024-02-29')
    },
    {
      id: 'task-1',
      parentId: 'section-1',
      type: 'task',
      name: '要件定義',
      start: DateTime.fromISO('2024-01-01'),
      end: DateTime.fromISO('2024-01-31')
    },
    {
      id: 'task-2',
      parentId: 'section-1',
      type: 'task',
      name: 'デザイン作成',
      start: DateTime.fromISO('2024-02-01'),
      end: DateTime.fromISO('2024-02-29')
    },
    {
      id: 'section-2',
      parentId: 'project-1',
      type: 'section',
      name: '開発',
      start: DateTime.fromISO('2024-03-01'),
      end: DateTime.fromISO('2024-05-31')
    },
    {
      id: 'task-3',
      parentId: 'section-2',
      type: 'task',
      name: 'フロントエンド開発',
      start: DateTime.fromISO('2024-03-01'),
      end: DateTime.fromISO('2024-04-30')
    },
    {
      id: 'task-4',
      parentId: 'section-2',
      type: 'task',
      name: 'バックエンド開発',
      start: DateTime.fromISO('2024-03-15'),
      end: DateTime.fromISO('2024-05-31')
    }
  ];
  
  // イベントハンドラー
  const handlers: GanttEventHandlers = {
    onNodeClick: (node) => {
      console.log('クリック:', node.name);
    },
    onBarDrag: (nodeId, newStart, newEnd) => {
      nodes = updateNode(nodes, nodeId, { start: newStart, end: newEnd });
      console.log(`タスク ${nodeId} を移動しました`);
    },
    onToggleCollapse: (nodeId) => {
      nodes = toggleNodeCollapse(nodes, nodeId);
    },
    onZoomChange: (zoomLevel) => {
      console.log('ズームレベル:', zoomLevel);
    }
  };
  
  // 設定
  const config: GanttConfig = {
    mode: 'controlled',
    rowHeight: 40,
    dayWidth: 30,
    treePaneWidth: 300,
    indentSize: 20,
    dragSnapDivision: 4
  };
</script>

<div class="gantt-container">
  <h1>プロジェクト管理</h1>
  <GanttChart {nodes} {handlers} {config} />
</div>

<style>
  .gantt-container {
    padding: 20px;
    height: 100vh;
  }
  
  h1 {
    margin-bottom: 20px;
  }
  
  :global(.gantt-chart) {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
  }
</style>
```

---

## まとめ

Svelte Gantt Libraryは、以下の特徴を持つ軽量で柔軟なガントチャートライブラリです：

- ✅ **階層構造サポート**: プロジェクト/セクション/タスクの階層管理
- ✅ **ドラッグ&ドロップ**: 直感的な操作でタスクを移動・リサイズ
- ✅ **ズーム機能**: 11段階のズームレベル
- ✅ **イミュータブル**: データの不変性を保つ安全な設計
- ✅ **TypeScript完全対応**: 型安全な開発
- ✅ **カスタマイズ可能**: CSS変数とイベントハンドラーで柔軟に拡張

詳細な技術情報は、`ARCHITECTURE.md`を参照してください。
