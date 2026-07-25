# Issue #0020: ユーザー体験向上のための表示改善（行高・ツリー幅・土日表示・タスク種別アイコン・完了タスク表示）

## ステータス

Open

## 概要

以下5点のUI改善を行う。

1. 行のデフォルト高さを 1.75em 相当（デフォルトfontSize 14px基準で 24.5px）に変更する。
2. 左ツリーペインの幅のデフォルトを 250px にし、ツリーペインとタイムラインの境界をドラッグ（DnD）してユーザーが幅を変更できるようにする。
3. 土日を「表示するか・非表示にするか」を選択できる設定（`showWeekends`）を追加する。非表示時は土日カラムをタイムライン上で詰めて表示する（日付軸から土日分の幅を除去する）。
4. 土日の「グレーアウト背景」表示を選択できる設定（`weekendBackground`）を追加する。デフォルトは「表示（showWeekends: true）」「グレー背景（weekendBackground: true）」。
5. タスク種別（`type: 'task'`）の行をツリーペインで四角アイコン等により他の行（project/section/subsection）と視覚的に区別できるようにする。
6. 完了タスク（`GanttNode.completed: true`）をツリーペインおよびガント表示（バー）でグレーがかった配色にする。取消線は使用しない。

## 実装方針

- `GanttNode` に `completed?: boolean` を追加。
- `GanttConfig` に `showWeekends?: boolean`（デフォルト true）、`weekendBackground?: boolean`（デフォルト true）を追加。
- `DEFAULT_CONFIG.rowHeight` を 24.5、`DEFAULT_CONFIG.treePaneWidth` を 250 に変更。
- 土日非表示時の日付軸圧縮のため `src/utils/business-days.ts` を新規作成し、`isWeekendDay` / `businessDayOffset` / `addBusinessDayOffset` を実装。`dateToX` / `durationToWidth` / `calculateTimelineWidth` / `generateTicks` / `generateTwoLevelTicks` / `calculateXWindow` に `hideWeekends` パラメータを追加し、ドラッグ（`drag-handler.ts`）・ズーム中心計算（`zoom-controller.ts`）・スクロール位置計算（`gantt-store.ts`、`GanttChart.svelte`）に反映する。
- 土日グレー背景は `showWeekends: true` の場合のみ `GanttTimeline.svelte` / `GanttHeader.svelte` で描画する。
- `GanttTree.svelte` にタスク種別の四角アイコンと、完了タスクのグレー配色クラスを追加する。
- `GanttTaskBar.svelte` / `GanttSectionBar.svelte` に完了タスクのグレー配色クラスを追加する。
- `GanttConfigPanel.svelte` に土日表示・グレー背景のチェックボックス、ツリーペイン境界のドラッグリサイズUIをそれぞれ追加する。

## TODO

- [x] Issue #0020 作成
- [x] `types.ts` に `completed` / `showWeekends` / `weekendBackground` を追加
- [x] `DEFAULT_CONFIG` の `rowHeight` / `treePaneWidth` を変更
- [x] `business-days.ts` を新規作成（単体テスト含む）
- [x] `timeline-calculations.ts` / `tick-generator.ts` / `virtual-scroll.ts` に `hideWeekends` を反映
- [x] `drag-handler.ts` / `zoom-controller.ts` / `gantt-store.ts` の日付⇔ピクセル変換を土日非表示に対応
- [x] `GanttChart.svelte` にツリーペインDnDリサイズを追加
- [x] `GanttTimeline.svelte` / `GanttHeader.svelte` に土日グレー背景描画を追加
- [x] `GanttTree.svelte` にタスク種別アイコン・完了タスク配色を追加
- [x] `GanttTaskBar.svelte` / `GanttSectionBar.svelte` に完了タスク配色を追加
- [x] `GanttConfigPanel.svelte` に新設定項目のUIを追加
- [x] 既存テストの更新（`gantt-store.test.ts` のデフォルト値）
- [x] 土日表示切り替え時にスクロール中心日付を保持する処理を追加（Playwrightでの目視確認中に発見した副作用への対応）
- [x] 全テスト通過（既存失敗3件は変更前から存在。`tests/utils/zoom-gesture.test.ts`）
- [ ] ユーザー承認後にクローズ

## 動作確認

Vite開発サーバー + Playwright（ヘッドレスChromium）でデモアプリを目視確認済み。行高さ24.5px・ツリーペイン幅250pxのデフォルト値、DnDによるツリーペインリサイズ、土日グレー背景、タスク行の四角アイコン、完了タスクのグレー配色（取消線なし）、設定パネルの新規チェックボックス、土日非表示時のカラム圧縮とスクロール中心保持を確認。

## 関連スペック

- project/specs/system-baseline.spec.md

## 作成日

2026-07-22

## History

### 2026-07-22 (追記)

- User Instruction:
  - 完了タスク（done）がグレーアウトされないという報告。通常のバグとテーマ（ホスト側CSS）起因の不具合の両面から調査し修正すること。あわせて、タスク種別アイコンを一般的なMarkdownエディタのようなチェックボックス（完了時にチェックが入る）にすること。

- 根本原因:
  - `GanttTree.svelte` のみ、完了タスクの配色に Svelte の `class:completed={node.completed}` ディレクティブを使用しており、プレフィックスなしの生クラス名 `completed` がDOMに付与されていた。本ライブラリの他の完了関連クラス（`GanttTaskBar.svelte` / `GanttSectionBar.svelte`）はすべて `{classPrefix}-...--completed` という衝突回避の命名規則に従っていたが、この1箇所だけ規約から外れていた。
  - 汎用的な `.completed` はホストページやテーマ（Obsidianのタスク管理プラグイン等、`.completed` という同名クラスを独自スタイルで使うことが多い）のCSSと衝突しやすく、上書きされて灰色配色が反映されない、あるいは意図しない取消線が入るなどの不具合を引き起こしうる。Playwrightで `.completed { color: red !important; text-decoration: line-through !important; }` という敵対的なホストCSSを注入して再現・検証済み。

- Change:
  - `GanttTree.svelte`: `class:completed` を廃止し、`{classPrefix}-node-name--completed` という命名規則に沿ったクラス名に変更。CSSセレクタも同様に変更。
  - 完了タスクに関連する配色宣言（`GanttTree.svelte` のノード名、`GanttTimeline.svelte` のバー塗り/線・ラベル）に `!important` を追加し、ホスト側テーマCSSに上書きされにくくした。
  - タスク種別アイコンをチェックボックス風の見た目に変更。未完了時は枠線のみの空チェックボックス、完了時はグレー塗りつぶし+白チェックマークを表示する（取消線は使用しない）。

- Rationale:
  - 生のクラス名 `completed` はライブラリの命名規約（`{classPrefix}-` プレフィックス必須）違反であり、ホスト環境依存で症状が変わる典型的な「テーマによる不具合」の原因となっていた。修正後はPlaywrightで敵対的なホストCSSを注入しても正しくグレー表示・取消線なしを維持することを確認した。
  - チェックマーク付きチェックボックスは、色のみに依存しない構造的な完了表示手段であり、テーマ差やコントラスト不足による視認性低下にも強い。
