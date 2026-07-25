# Issue #0028: plan・マイルストンのバー統一（クリック・リサイズ・移動）とラベル優先度クリッピング

## ステータス

Open

## 概要

以下3点を対応する。

1. **plan をバーの亜種として実装**: plan（実施予定枠）はバーと本質的に同じ「期間を表す矩形」であるにもかかわらず、オブジェクト全体をクリックできなかった（枠は描画のみで `pointer-events: none`）。バーと同じコンポーネント設計（クリック・リサイズハンドル）を持つ `GanttPlanBar` として実装し、スケジュールバーより背面に描画する。
2. **期間を持つオブジェクトのリサイズ対応**: plan・マイルストン（期間指定）をバーと同様にドラッグでリサイズできるようにする。期間なし（一点指定）のマイルストンも移動できるようにする。
3. **マイルストン・planへのタスク名表示とラベルの優先度クリッピング**: マイルストン・planにもタスク名ラベルを表示する。同一行内で他オブジェクトのラベルと重なる場合、`plan ＜ バー ＜ マイルストン` の優先度で低い方をクリップする。クリップ時は優先度が高い側の視認性を確保するためマージンを設ける。

## 仕様

### plan のバー統一・リサイズ

- `GanttPlanBar.svelte`（新規）: `GanttTaskBar.svelte` と同じ構造（本体矩形＋左右リサイズハンドル）を、plan の見た目（点線枠）で実装。`onBarClick` で本体・ハンドルどちらのクリックでも発火。
- plan は schedule バーより先（背面）に描画する（既存の z-order を維持）。schedule バーと重なる領域ではバー側がクリック・ドラッグを受け取る（後勝ちのz-order。plan は schedule の範囲外にはみ出た部分でのみ独立して操作できる）。
- 期間未設定タスクで plan のみの場合（旧「plan のみテキスト行」）も同じ `GanttPlanBar` で描画するよう統一（表示系のコードパスを一本化）。

### リサイズ・移動

- `src/utils/drag-handler.ts`: `createDragHandler.handleMouseDown` の第一引数を `ComputedGanttNode` から最小限のダック型 `DraggableTarget`（`{ id, start, end }`）に緩め、bar 以外（plan・マイルストン）の日時フィールドでも同じドラッグ機構を再利用できるようにした（構造的部分型のため、既存のバー呼び出し側は無変更で動作する）。
- `GanttTimeline.svelte` に plan 用・マイルストン用の `createDragHandler` インスタンスをそれぞれ追加し、`onPlanDrag`/`onPlanDragEnd`/`onMilestoneDrag`/`onMilestoneDragEnd` を新設。
- マイルストン: 期間指定は左右の ◆ で `resize-start`/`resize-end`、中央の帯で `move`。一点指定は ◆ 自体をドラッグして `move`（開始・終了とも同じ日時が同量シフトされ、結果は単一の `DateTime` として書き戻される）。
- `handlers.onMilestoneDrag`/`onMilestoneDragEnd` は `node.milestone` と同じ型（`DateTime | {start,end}`）で通知する（一点/期間の型はライブラリ側が判定して組み立てる）。

### ラベル表示・優先度クリッピング

- `src/utils/label-layout.ts`（新規、DOM非依存の純粋関数）: `computeLabelClipping(regions, marginPx)` が、同一行内のラベル群（`{id, priority, anchorX, text, fontSize, shapeStartX, shapeEndX}`）から、優先度の低いラベルのクリップ幅を計算する。実際のテキスト幅はDOM計測に依存しないよう、文字数×フォントサイズ×経験的比率（0.58）で概算する。
- 優先度: マイルストン(2) > バー(1) > plan(0)。
- クリップ後の幅が最小表示幅（10px）を下回る場合はラベルごと非表示にする（中途半端な断片を避ける。他のGanttツールでよく見られる「狭すぎるバーはラベルを省略する」慣習に倣った）。
- `GanttTimeline.svelte` の `getLabelClips()` が1行分のジオメトリ（plan/バー/マイルストンの座標）を組み立てて `computeLabelClipping` に渡し、結果を各コンポーネント（`GanttTaskBar`/`GanttSectionBar`/`GanttPlanBar`/`GanttMilestone`）へ `labelClipWidth`/`labelHidden` として伝搬する。各コンポーネントは `clipWidth !== null` の場合のみ `<clipPath>` を生成し `<text>` に適用する。

## 対象ファイル

| ファイル | 変更種別 |
|----------|----------|
| `src/utils/drag-handler.ts` | `DraggableTarget` 型を追加し `handleMouseDown` の引数型を緩和 |
| `src/utils/label-layout.ts` | 新規。ラベルクリッピングの純粋関数 |
| `src/components/GanttPlanBar.svelte` | 新規。plan をバーの亜種として実装（クリック・リサイズ・ラベル） |
| `src/components/GanttMilestone.svelte` | クリック・リサイズ（期間）・移動（一点）・ラベル表示を追加 |
| `src/components/GanttTaskBar.svelte` / `GanttSectionBar.svelte` | ラベルへの `labelClipWidth`/`labelHidden` 対応を追加 |
| `src/components/GanttTimeline.svelte` | plan/マイルストン用ドラッグハンドラー、`getLabelClips()`、plan描画を `GanttPlanBar` に置き換え |
| `src/components/GanttChart.svelte` | `handlePlanDrag`/`handlePlanDragEnd`/`handleMilestoneDrag`/`handleMilestoneDragEnd` を追加 |
| `src/types.ts` | `onPlanDrag`/`onPlanDragEnd`/`onMilestoneDrag`/`onMilestoneDragEnd` とイベントdetail型を追加 |
| `tests/utils/label-layout.test.ts` | 新規。クリッピング計算の単体テスト |
| `tests/components/gantt-plan-milestone-drag.test.ts` | 新規。plan/マイルストンのリサイズ・移動・ラベルクリッピングの統合テスト |

## TODO

- [x] Issue #0028 作成
- [x] `drag-handler.ts` の `DraggableTarget` 化
- [x] `GanttPlanBar.svelte` 新規実装
- [x] `GanttMilestone.svelte` にリサイズ・移動・ラベルを追加
- [x] `label-layout.ts` 新規実装（優先度クリッピング）
- [x] `GanttTaskBar`/`GanttSectionBar`/`GanttTimeline`/`GanttChart`/`types.ts` の配線
- [x] 単体・統合テスト追加（23件）
- [x] Playwright実機確認
- [x] 全テスト通過
- [x] 実機確認中に発見した不具合の修正（下記「実機確認で発見した不具合」参照）
- [ ] ユーザー承認後にクローズ

## 実機確認で発見した不具合

- **マイルストンの `<title>` ツールチップが更新されない**: `formatLabel()` が `milestone` を閉じ込めた素の関数だったため、Svelteのテンプレート依存解析が再評価を正しく紐付けられず、図形の位置（`$: startX` 等）は再描画されてもツールチップだけ古い日時のまま残っていた。`$: formattedLabel = ...` という代入式に変更して修正。修正前後でテスト（`toBe('2026-08-13 〜 2026-08-14')` 等）が実際に失敗/成功することを確認済み。
- **（不具合ではなく仕様確認）plan とスケジュールバーが重なる領域でのドラッグ**: 両者の日付範囲が近い/重なるタスクでは、重なった領域をドラッグするとz-order上バー側が優先してドラッグ対象になる（意図した挙動）。planを独立して操作するには、planがバーの範囲からはみ出た領域（左右の余白）を掴む必要がある。Playwrightでの実機確認時に「planが動かない」ように見えたのはこの重なりが原因で、露出した左端を掴むと正しく動作することを確認した。

## 動作確認

`npx vitest run`（新規23件を含め全体で228件中225件成功、既存失敗3件は変更前から存在）。`npx svelte-check` で新規エラーなし。Playwright実機確認: plan・マイルストン（一点/期間）それぞれのリサイズ・移動、ラベルのクリップ（`clip-path` 属性の有無）、ドラッグ後のツールチップ更新を確認。

## 関連スペック

- project/specs/system-baseline.spec.md

## 作成日

2026-07-23
