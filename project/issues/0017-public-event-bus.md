# Issue #0017: 公開イベントバスの追加（EventTarget/CustomEvent 形式）

## ステータス

Closed

## 概要

`handlers` props（コールバック関数）に加え、EventTarget/CustomEvent ベースのイベントバスを追加する。外部プログラムが `addEventListener` スタイルで複数のリスナーを動的に登録できるようにする。

## 背景

現在のイベント公開方式は `GanttEventHandlers`（callbacks props）のみ。同じイベントに複数のリスナーを登録したい場合や、動的にリスナーを追加・削除したい場合に対応できない。

## 実装内容

### 新規ファイル

- `src/core/gantt-event-emitter.ts` — `GanttEventEmitter` クラス（EventTarget を継承）

### 変更ファイル

- `src/types.ts` — `GanttUserEventType`, `GanttUserEventDetailMap`, `GanttUserEventDetail` 型を追加
- `src/core/gantt-store.ts` — `events: GanttEventEmitter` プロパティを追加
- `src/components/GanttChart.svelte` — 全ハンドラーから `store.events.emit()` を呼び出す
- `src/index.ts` — 新クラス・型をエクスポート

### 公開イベント一覧（12種）

| イベント名 | タイミング |
|-----------|----------|
| `nodeClick` | ノード名またはバーがクリックされたとき |
| `barClick` | タイムラインのバーがクリックされたとき |
| `nameClick` | 左パネルのノード名がクリックされたとき |
| `barDrag` | バーのドラッグ中（mousemove ごと） |
| `barDragEnd` | バーのドラッグ確定時（mouseup） |
| `groupDrag` | グループ全体がドラッグされたとき |
| `toggleCollapse` | 折り畳み/展開が切り替えられたとき |
| `dataChange` | 内部データが変更されたとき（uncontrolled モード） |
| `autoAdjustSection` | セクション日付が自動調整されたとき |
| `zoomChange` | ズームレベルが変更されたとき |
| `panStart` | 右クリックドラッグによるパン開始時 |
| `panEnd` | パン操作終了時 |

### 利用例

```typescript
const store = chart.getStore();

// 個別イベント
store.events.on('barClick', (e) => {
  console.log('clicked:', e.detail.node);
});

// 全イベントをまとめて
store.events.onAny((e) => {
  console.log('gantt event:', e.detail);
});

// 購読解除
const unsub = store.events.on('zoomChange', handler);
unsub();
```

## 完了条件

- `store.events` が `GanttEventEmitter` インスタンスを返すこと
- 各操作に対応するイベントが発火すること
- 型安全に `on()` / `once()` / `onAny()` / `off()` が使えること
- 全ユニットテストパス
