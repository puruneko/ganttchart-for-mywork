# リファクタリング計画書

作成日: 2026-03-23
ステータス: 提案（レビュー待ち）

---

## 1. 現状分析

### 1.1 ファイル構成

```
src/
├── index.ts                          # パブリックAPIエントリーポイント
├── types.ts                          # 型定義
├── core/
│   ├── gantt-store.ts                # 状態管理ストア（444行）
│   ├── data-manager.ts               # データ管理ロジック（389行）
│   ├── lifecycle-events.ts           # ライフサイクルイベントシステム（222行）
│   └── render-lifecycle.ts           # レンダリングライフサイクル管理（58行）
├── utils/
│   ├── timeline-calculations.ts      # タイムライン計算関数（183行）
│   ├── zoom-utils.ts                 # ズームユーティリティ（72行）
│   ├── tick-generator.ts             # Tick生成システム（151行）
│   ├── zoom-gesture.ts               # ズームジェスチャー検出（173行）
│   └── zoom-scale.ts                 # ズームスケール定義（319行）
└── components/
    ├── GanttChart.svelte             # メインコンポーネント（1195行）
    ├── GanttTimeline.svelte          # タイムライン描画（726行）
    ├── GanttHeader.svelte            # ヘッダー描画（125行）
    ├── GanttTree.svelte              # ツリーペイン（163行）
    └── GanttDebugPanel.svelte        # デバッグパネル（276行）
```

### 1.2 識別された問題点

#### P-01: GanttChart.svelteの肥大化（1195行）

GanttChart.svelteは以下の責務を同時に担っている:

- ストア初期化とライフサイクル管理
- イベントハンドラーの橋渡し（6種類）
- ズーム操作ロジック（ボタン操作・ジェスチャー連携）
- スクロール同期ロジック（ヘッダー・ツリー・タイムライン間）
- 右クリックパン操作
- Tick定義エディタのUI・ロジック（編集モーダル含む）
- Duration文字列のパース・フォーマット
- レイアウト管理・CSS（330行以上）

単一責任の原則に反しており、変更時の影響範囲が広い。

#### P-02: ズーム関連コードの分散

ズーム関連のロジックが4つのファイルに分散している:

- `zoom-utils.ts`: 離散的なズームレベル（1-5）ベースの関数群 → **現在未使用の可能性が高い**
- `zoom-scale.ts`: 連続的なスケール値ベースの定義・変換関数
- `zoom-gesture.ts`: ジェスチャー検出（Hammer.js依存）
- `GanttChart.svelte`: ズーム操作の統合ロジック

`zoom-utils.ts`は離散ズームレベル（1-5）を前提とした旧設計の残骸であり、現在のコードでは連続スケール（`zoom-scale.ts`）が使用されている。

#### P-03: Tick定義の二重管理

Tick生成に関する定義が2箇所で管理されている:

- `tick-generator.ts`: `TickGenerationDef`型 + `getTickGenerationDefForScale()`
- `zoom-scale.ts`: `TickDefinition`型 + `getTickDefinitionForScale()`

`tick-generator.ts`の`getTickGenerationDefForScale()`は内部で`zoom-scale.ts`の`getTickDefinitionForScale()`を呼び出して変換しており、型の重複と不要な間接層が存在する。

#### P-04: GanttTimeline.svelteの肥大化（726行）

GanttTimeline.svelteは以下を同時に担っている:

- SVGバー描画ロジック（セクション/タスク/グループ背景）
- ドラッグ&ドロップ操作
- ズームジェスチャー検出器の初期化・管理
- グリッド描画
- CSSスタイル定義（140行以上）

特にSVGテンプレート部分は、セクション/サブセクションとタスクで異なる描画ロジックが複雑にネストしている。

#### P-05: gantt-store.tsへのUI関連ロジック混入

`gantt-store.ts`にUI層の関心事（DOM操作）が混入している:

- `expandExtendedDateRangeIfNeeded()`: `HTMLElement`を引数に取り、`scrollLeft`を直接操作
- `recalculateExtendedDateRange()`: `requestAnimationFrame`を使用し、`HTMLElement.scrollLeft`を操作

ストアはデータ層であるべきだが、スクロール位置の補正というUI層の責務を担っている。

#### P-06: `node.style`の型定義欠如

`GanttTimeline.svelte`の511行目で`node.style`を参照しているが、`ComputedGanttNode`型には`style`プロパティが定義されていない。TypeScriptの型安全性が損なわれている。

#### P-07: CSSの`:global()`多用

全コンポーネントでCSSに`:global()`を使用しており、Svelteのスコープドスタイルの利点が失われている。クラス名の衝突リスクがある。

---

## 2. リファクタリング方針

### 原則

- 機能追加は行わない（既存動作の維持が最優先）
- 各フェーズは独立してテスト可能な単位とする
- governanceルールに従い、各フェーズはIssueとして管理する
- テストが通ることを完了条件とする

---

## 3. リファクタリングフェーズ

### Phase 1: 不要コードの除去

**対象問題**: P-02（ズーム関連コードの分散）

**内容**:
- `zoom-utils.ts`が実際に未使用であることを確認し、削除する
- `index.ts`のエクスポートに`zoom-utils.ts`の関数が含まれていないことを確認

**影響範囲**: 最小（未使用コードの除去のみ）
**リスク**: 低

---

### Phase 2: Tick定義の統一

**対象問題**: P-03（Tick定義の二重管理）

**内容**:
- `tick-generator.ts`の`TickGenerationDef`型を廃止し、`zoom-scale.ts`の`TickDefinition`型に統一する
- `getTickGenerationDefForScale()`を廃止し、`getTickDefinitionForScale()`に統一する
- `tick-generator.ts`は純粋なTick生成関数（`generateTwoLevelTicks`）のみを残す
- カスタムTick定義関連（`addCustomTickGenerationDef`, `clearCustomTickGenerationDefs`）は`zoom-scale.ts`の同等関数に統合する
- `GanttHeader.svelte`と`GanttTimeline.svelte`のimportを更新する

**影響範囲**: `tick-generator.ts`, `zoom-scale.ts`, `GanttHeader.svelte`, `GanttTimeline.svelte`, `GanttChart.svelte`, `GanttDebugPanel.svelte`
**リスク**: 中（複数ファイルの変更が必要）

---

### Phase 3: GanttChart.svelteの責務分離

**対象問題**: P-01（GanttChart.svelteの肥大化）

**内容**:

#### 3a: スクロール同期ロジックの抽出
- `handleTimelineScroll`, `handleTreeScroll`, `handleHeaderScroll`を`utils/scroll-sync.ts`に抽出する
- Svelteコンポーネントからはアクションまたはヘルパー関数として呼び出す

#### 3b: ズーム操作ロジックの抽出
- `handleTimelineZoom`, `zoomIn`, `zoomOut`を`core/zoom-controller.ts`に集約する
- ストアとの連携ロジックを含む
- GanttChart.svelteからはイベントハンドラーとして委譲する

#### 3c: Tick定義エディタの分離
- Tick定義エディタのUI（テンプレート・CSS・ロジック）を独立コンポーネント`GanttTickEditor.svelte`に分離する
- `parseDurationString`, `formatDurationForUI`もエディタコンポーネントに移動する
- `startEditTick`, `cancelEditTick`, `saveEditTick`もエディタコンポーネントに移動する

**影響範囲**: `GanttChart.svelte`（大幅削減）、新規ファイル3つ
**リスク**: 中〜高（メインコンポーネントの構造変更）

---

### Phase 4: gantt-store.tsからのUI関連ロジック分離

**対象問題**: P-05（gantt-store.tsへのUI関連ロジック混入）

**内容**:
- `expandExtendedDateRangeIfNeeded()`からDOM操作部分を分離する
  - ストア側: 日付範囲の拡張判定と新しい範囲の計算のみを行い、拡張結果を返す
  - UI側: スクロール位置の補正をコンポーネント層で行う
- `recalculateExtendedDateRange()`も同様に分離する
  - ストア側: 新しい日付範囲の計算のみ
  - UI側: `requestAnimationFrame`によるスクロール位置補正

**影響範囲**: `gantt-store.ts`, `GanttChart.svelte`
**リスク**: 中（スクロール位置維持の正確性に注意が必要）

---

### Phase 5: GanttTimeline.svelteの責務分離

**対象問題**: P-04（GanttTimeline.svelteの肥大化）

**内容**:

#### 5a: ドラッグ操作ロジックの抽出
- `dragState`, `handleMouseDown`, `handleMouseMove`, `handleMouseUp`を`utils/drag-handler.ts`に抽出する
- Svelteアクション（use:ディレクティブ）として実装する

#### 5b: SVGバー描画のコンポーネント分離
- セクション/プロジェクトバーの描画を`GanttSectionBar.svelte`に分離する
- タスクバーの描画を`GanttTaskBar.svelte`に分離する
- グループ背景の描画を`GanttGroupBackground.svelte`に分離する

**影響範囲**: `GanttTimeline.svelte`（大幅削減）、新規ファイル4つ
**リスク**: 中（SVG要素の座標計算の正確性に注意が必要）

---

### Phase 6: 型安全性の改善

**対象問題**: P-06（`node.style`の型定義欠如）

**内容**:
- `GanttNode`型または`ComputedGanttNode`型に`style`プロパティを追加する
- スタイルの型を明示的に定義する（`fill`, `stroke`, `strokeWidth`, `rx`, `labelColor`）

**影響範囲**: `types.ts`, `GanttTimeline.svelte`（またはPhase 5で分離後のコンポーネント）
**リスク**: 低

---

## 4. 実施順序と依存関係

```
Phase 1（不要コード除去）
    ↓
Phase 2（Tick定義統一）
    ↓
Phase 3（GanttChart分離）── Phase 4（Store分離）
    ↓                          ↓
Phase 5（GanttTimeline分離）
    ↓
Phase 6（型安全性改善）
```

- Phase 1 → Phase 2 は順序依存（Phase 1で不要コードを除去してからPhase 2で統一する）
- Phase 3 と Phase 4 は並行実施可能
- Phase 5 は Phase 3 完了後に実施する（GanttChart.svelteの構造が安定してから）
- Phase 6 は Phase 5 完了後に実施する（型定義の対象コンポーネントが確定してから）

---

## 5. 各フェーズの完了条件

各フェーズは以下をすべて満たした場合のみ完了とする:

1. 対応するIssueが作成されている
2. 既存のテストがすべてパスする
3. 新規コードに対するテストが追加されている（Phase 1を除く）
4. 既存の動作に変更がない（回帰がない）
5. ユーザが閉鎖を承認する

---

## 6. 対象外事項

以下はこのリファクタリング計画の対象外とする:

- 新機能の追加
- Svelte 5への移行（別計画として実施する）
- CSS設計の全面的な見直し（P-07は今回は対象外）
- パフォーマンス最適化
- テストフレームワークの変更
