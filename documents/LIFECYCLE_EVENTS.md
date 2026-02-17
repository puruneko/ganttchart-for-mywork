# ガントチャート ライフサイクルイベント API

## 概要

ガントチャートコンポーネントの描画完了タイミングをイベントで購読することができます。  
EventTarget ベースの標準ブラウザ API を使用しており、フレームワーク非依存です。

---

## ライフサイクルフェーズ

コンポーネントは以下のフェーズを順序で遷移します：

| フェーズ       | 説明                         |
| -------------- | ---------------------------- |
| `initializing` | 初期化開始                   |
| `rendering`    | レンダリング中               |
| `mounted`      | マウント完了                 |
| `ready`        | 全サブコンポーネント準備完了 |

---

## 使用方法

### 基本例

```typescript
const store = ganttComponent.getStore();

// readyフェーズをリッスン
store.lifecycleEvents.on('ready', (event) => {
  console.log('ガントチャートが完全に準備完了！');
  // 初期描画後の処理を実行
  recalculateLayout();
});

function recalculateLayout() {
  // SVGの実寸を取得して位置補正など
  console.log('Layout recalculation...');
}
```

### 1回限りのリッスン

```typescript
store.lifecycleEvents.once('mounted', (event) => {
  console.log('初回マウント完了');
});
```

### すべてのイベントをリッスン

```typescript
store.lifecycleEvents.onLifecycle((event) => {
  console.log(`[${event.detail.phase}]`, event.detail.details);
});
```

### リスナを削除

```typescript
// on()は削除関数を返す
const unsubscribe = store.lifecycleEvents.on('ready', handler);
unsubscribe();

// または off()を使用
const handler = (event) => console.log('Ready!');
store.lifecycleEvents.on('ready', handler);
store.lifecycleEvents.off('ready', handler);
```

---

## API リファレンス

詳細は [src/core/lifecycle-events.ts](../src/core/lifecycle-events.ts) の JSDoc コメントを参照してください。

### メソッド一覧

| メソッド                | 説明                               |
| ----------------------- | ---------------------------------- |
| `on(phase, handler)`    | フェーズをリッスン（複数回発火）   |
| `once(phase, handler)`  | フェーズを1回限りリッスン          |
| `onLifecycle(handler)`  | すべてのイベントをリッスン         |
| `off(phase, handler)`   | リスナを削除                       |
| `emit(phase, details?)` | イベントを発行（ライブラリ内部用） |
| `getEventHistory()`     | イベント履歴を取得（デバッグ用）   |
| `dispose()`             | リソースをクリーンアップ           |

---

## 実装例

### 高度な使用例

```typescript
const store = ganttComponent.getStore();

// 複数フェーズのリッスン
const handlers = {
  initializing: () => console.log('初期化中'),
  rendering: () => console.log('レンダリング中'),
  mounted: () => console.log('マウント完了'),
  ready: () => console.log('準備完了')
};

Object.entries(handlers).forEach(([phase, handler]) => {
  store.lifecycleEvents.on(phase as any, handler);
});

// イベント履歴をデバッグ
const history = store.lifecycleEvents.getEventHistory();
history.forEach(event => {
  console.log(
    `✓ ${event.phase} at ${new Date(event.timestamp).toISOString()}`
  );
});
```

### React での使用例

```typescript
import { useEffect, useRef } from 'react';

function GanttWrapper() {
  const ganttRef = useRef(null);
  
  useEffect(() => {
    const store = ganttRef.current?.getStore();
    if (!store) return;
    
    const unsubscribe = store.lifecycleEvents.on('ready', (event) => {
      console.log('Gantt is ready!');
      // React側での再計算などを実行
      updateLocalState();
    });
    
    return () => unsubscribe();
  }, []);
  
  return <GanttChart ref={ganttRef} ... />;
}
```

---

## 技術仕様

### EventTarget 拡張の利点

- **ブラウザ標準API**: W3C標準に完全準拠
- **メモリ管理**: addEventListener/removeEventListener の自動追跡
- **DevTools統合**: ブラウザの Event Inspector で可視化可能
- **フレームワーク非依存**: Vue/React/Angular など全対応

### イベントオブジェクト

```typescript
interface LifecycleEventDetail {
  phase: LifecyclePhase;           // フェーズ名
  timestamp: number;               // Unix timestamp (ms)
  details?: Record<string, any>;   // 追加情報
}
```

CustomEvent として発行されるため、`event.detail` でアクセス可能です：

```typescript
store.lifecycleEvents.on('ready', (event) => {
  console.log(event.detail.phase);    // 'ready'
  console.log(event.detail.timestamp); // 1739761203000
  console.log(event.detail.details);   // { allComponentsLoaded: true, ... }
});
```

---

## トラブルシューティング

### イベントが発火しない

**原因**: getStore() が null または不正な値が渡されている

**確認:**
```typescript
const store = ganttComponent?.getStore();
console.log('Store:', store);
console.log('LifecycleEvents:', store?.lifecycleEvents);
```

### リスナが解放されない

**リスナの手動削除が必要:**
```typescript
// ❌ 悪い例
store.lifecycleEvents.on('ready', handler);
// リスナが残りメモリリク

// ✅ 良い例
const unsubscribe = store.lifecycleEvents.on('ready', handler);
// 使用後
unsubscribe();
```

### イベント履歴の確認

デバッグ時は `getEventHistory()` で実装状況を確認できます：

```typescript
const history = store.lifecycleEvents.getEventHistory();
if (history.length === 0) {
  console.warn('No lifecycle events fired yet');
} else {
  history.forEach((e, i) => console.log(`${i}: ${e.phase}`));
}
```

---

## 参考

- [examples/demo.svelte](../examples/demo.svelte) - 実装例
- [src/core/lifecycle-events.ts](../src/core/lifecycle-events.ts) - 実装コード
- [src/components/GanttChart.svelte](../src/components/GanttChart.svelte) - 統合部分
