# EventTarget ライフサイクルイベント実装計画

## 目的
Gantt Chartコンポーネントの描画完了タイミングを EventTarget ベースのイベントエミッターで一元管理し、ライブラリ外部から购読可能な仕組みを実装する。

## 実装アプローチ
**EventTarget 拡張アプローチ**
- W3C 標準 API に準拠したもので、フレームワーク非依存
- ブラウザネイティブ API のため、将来的な保守性と汎用性が最高
- 実装確度: 90%

---

## 実装タスク分解

### タスク1: lifecycle-events.ts 作成
**ファイルパス**: `src/core/lifecycle-events.ts`

**実装内容**:
- `LifecyclePhase` 型定義: `'initializing' | 'rendering' | 'mounted' | 'ready'`
- `LifecycleEventDetail` インターフェース定義
- `LifecycleEventEmitter` クラス作成（EventTarget 継承）

**要件**:
- `emit(phase, details?)` メソッド: ライフサイクルイベントを発行
  - CustomEvent として `'lifecycle'` イベントを dispatched
  - フェーズ固有イベント `'lifecycle:${phase}'` も発行
  - イベント履歴を保持（デバッグ用）
  - disposed チェック
  
- `on(phase, handler, options?)` メソッド: 特定フェーズのリスナ登録（複数回発火）
  - addEventListener で `'lifecycle:${phase}'` にバインド
  - アンサブスクライブ関数を返す

- `once(phase, handler)` メソッド: 1 回限りのリスナ登録
  - addEventListener で `{ once: true }` オプション使用

- `onLifecycle(handler, options?)` メソッド: 全イベントリッスン
  - `'lifecycle'` イベントをリッスン

- `off(phase, handler)` メソッド: リスナ削除
  - removeEventListener で削除

- `getEventHistory()` メソッド: イベント履歴取得（デバッグ用）
  - イベントキューをコピーして返す

- `dispose()` メソッド: リソースクリーンアップ
  - isDisposed フラグを true に設定
  - イベントキューを空にする

- コメント: 日本語で記述

**チェックポイント**:
```
git add src/core/lifecycle-events.ts
git commit -m "feat: EventTarget ベースの LifecycleEventEmitter クラスを作成"
```

---

### タスク2: gantt-store.ts 統合
**ファイルパス**: `src/core/gantt-store.ts`

**実装内容**:
- `lifecycle-events.ts` から `LifecycleEventEmitter` をインポート
- `GanttStore` インターフェースに `lifecycleEvents: LifecycleEventEmitter` フィールド追加
- `createGanttStore()` 関数内で `new LifecycleEventEmitter()` でインスタンス化
- 必要に応じて `emit()` 呼び出し箇所を追加

**要件**:
- ストア初期化時に `lifecycleEvents` を作成
- 既存の処理に影響を与えない統合
- 後ほど GanttChart.svelte で emit を呼び出すためのフィールド配置

**チェックポイント**:
```
git add src/core/gantt-store.ts
git commit -m "refactor: GanttStore に lifecycleEvents フィールドを追加"
```

---

### タスク3: GanttChart.svelte 修正
**ファイルパス**: `src/components/GanttChart.svelte`

**実装内容**:
- `onMount` ライフサイクル内で `store.lifecycleEvents.emit()` を呼び出し
  - `'initializing'` - コンポーネント初期化開始
  - `'rendering'` - レンダリング中
  - `'mounted'` - マウント完了（componentName を details に含める）
  - `'ready'` - すべてのサブコンポーネントのレディ完了

**要件**:
- マウント後に `emit('mounted')` を呼び出し
- 全サブコンポーネント（GanttTree、GanttTimeline、GanttHeader）の DOM が準備完了したタイミングで `emit('ready')` を呼び出し
- 既存機能に影響なし

**チェックポイント**:
```
git add src/components/GanttChart.svelte
git commit -m "refactor: GanttChart.svelte で lifecycleEvents を emit"
```

---

### タスク4: index.ts エクスポート追加
**ファイルパス**: `src/index.ts`

**実装内容**:
- `LifecycleEventEmitter`、`LifecyclePhase`、`LifecycleEventDetail` をエクスポート
- ライブラリ利用者が型とクラスを import できるようにする

**要件**:
- 型定義のみエクスポート
- 型インポート用途に対応

**チェックポイント**:
```
git add src/index.ts
git commit -m "feat: LifecycleEventEmitter の型をエクスポート"
```

---

### タスク5: 全テスト実行
**コマンド**:
```powershell
npm test
npm run test:e2e
```

**要件**:
- すべてのテストが PASS すること
- 新規タスクで破壊されたテストを修正

**チェックポイント**:
```
git add .
git commit -m "test: 全テストが PASS することを確認"
```

---

### タスク6: examples/demo.svelte 使用例追加
**ファイルパス**: `examples/demo.svelte`

**実装内容**:
- `ganttChartComponent.getStore().lifecycleEvents` を通じて イベントを購読する例を追加
- `on()` メソッドでの登録例
- `once()` メソッドでの登録例
- `subscribe()` メソッドでの登録例

**要件**:
- 複数の購読パターンを示す
- コンソール出力でイベント発火を確認可能にする

**チェックポイント**:
```
git add examples/demo.svelte
git commit -m "docs(example): demo.svelte にライフサイクルイベント購読例を追加"
```

---

### タスク7: ドキュメント作成
**ファイルパス**: `documents/LIBRARY_USAGE.md` 修正 or 新規作成

**実装内容**:
- EventTarget ベースのライフサイクルイベント API ドキュメント
- 使用方法・API リファレンス
  - `on(phase, handler)` の詳細
  - `once(phase, handler)` の詳細
  - `onLifecycle(handler)` の詳細
  - `subscribe()` 方式の説明
- 実装例
- トラブルシューティング

**要件**:
- ライブラリ利用者が理解しやすい記述
- TypeScript 型定義を含める

**チェックポイント**:
```
git add documents/LIBRARY_USAGE.md
git commit -m "docs: ライフサイクルイベント API のドキュメントを作成"
```

---

### タスク8: ブラウザ動作確認
**コマンド**:
```powershell
npm run dev
```

**確認内容**:
- ブラウザで demo.svelte を開く
- コンソール(F12)でライフサイクルイベントが正しく発火するか確認
- ズーム・ドラッグ・スクロール操作で UI が正常に動作するか確認
- コンソールにエラーがないこと

**チェックポイント**:
```
git commit --allow-empty -m "test: ブラウザで動作確認完了"
```

---

## 実装順序

1. タスク1: lifecycle-events.ts 作成 → コミット
2. タスク2: gantt-store.ts 統合 → コミット
3. タスク3: GanttChart.svelte 修正 → コミット
4. タスク4: index.ts 修正 → コミット
5. タスク5: 全テスト実行 → コミット
6. タスク6: examples/demo.svelte 追加 → コミット
7. タスク7: ドキュメント作成 → コミット
8. タスク8: ブラウザ動作確認 → コミット

---

## 重要な注意事項

### コミットルール
- 各タスク完了ごとに `git commit` を実行
- コミットメッセージプリフィックス: `feat`, `refactor`, `test`, `docs`
- メッセージ形式: `[prefix]: 日本語での説明`

### テスト実行
- タスク5 で全テスト (`npm test`, `npm run test:e2e`) を実行
- 失敗する場合は、テストコードもしくは実装を修正
- **テストがすべて PASS するまで作業を完了としない**

### ブラウザ確認
- タスク8 でブラウザから実際に動作確認
- コンソールエラーがないことを必ず確認
- ズーム・ドラッグ・スクロール操作が正常に機能することを確認

### ドキュメント
- すべてコメント・説明文は日本語
- コード内の変数名・関数名は英語

---

## 成功基準

- ✅ EventTarget ベースの LifecycleEventEmitter が実装されている
- ✅ GanttStore に lifecycleEvents フィールドが統合されている
- ✅ GanttChart.svelte でイベントが emit されている
- ✅ index.ts から LifecycleEventEmitter が export されている
- ✅ 全単体テストが PASS (`npm test`)
- ✅ 全E2Eテストが PASS (`npm run test:e2e`)
- ✅ examples/demo.svelte で使用例が実装されている
- ✅ インテリカル使用法ドキュメントが完成している
- ✅ ブラウザで動作確認完了（コンソールエラーなし）
- ✅ 各タスク完了ごとに git commit されている
